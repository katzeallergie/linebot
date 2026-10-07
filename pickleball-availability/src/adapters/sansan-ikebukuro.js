import { makeSlot, makeUnknown, dateRange } from '../schema.js';

/**
 * Sansanピックルボールコート池袋 アダプタ (画面読み取り / Playwright)。
 *
 * 方式: 予約ページ(/booking)を1回開き、カレンダーの日付を順にクリックして
 *       「② 開始時間を選択」に出る時間別の空きコート数(空N / 満)を読む。
 * 理由: 公開APIは「埋まっている枠」しか返さず、空きを自前計算すると
 *       サイトの表示とずれて推測になる。画面表示をそのまま読むのが正確。
 * 制約: ログイン・予約・決済は一切しない。時間枠は選択しない(選ぶと待ち行列/料金の
 *       GETが増えるため)。そのため court_type=unknown, price=null、空きコート数は note に入れる。
 *       ログイン/CAPTCHAを検出したら停止して例外を投げる(回避しない)。
 */
export const id = 'sansan-ikebukuro';

const DAY = '[class*="calendarDayBtn"]';
const HOUR = '[class*="hourBtn"]';

export function addHour(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** @param {{text:string, available:boolean}[]} buttons 時間ボタンの表示テキストと空き判定クラス */
export function parseHourButtons(buttons, { facility, date, booking_url, fetched_at }) {
  const slots = [];
  for (const b of buttons) {
    const m = b.text.replace(/\s+/g, '').match(/^(\d{2}:\d{2})(.*)$/);
    if (!m) continue;
    const [, start, label] = m;
    const base = { facility, date, start, end: addHour(start), booking_url, fetched_at };
    const free = label.match(/^空(\d+)$/);
    if (b.available && free) slots.push(makeSlot({ ...base, status: 'available', note: `空きコート${free[1]}面` }));
    else if (label === '満') slots.push(makeSlot({ ...base, status: 'booked' }));
    else slots.push(makeSlot({ ...base, status: 'unknown', note: `unrecognized label: ${label}` }));
  }
  return slots;
}

async function assertNoBlocker(page) {
  const url = page.url();
  const hit = await page.evaluate(() =>
    !!document.querySelector('iframe[src*="captcha" i], iframe[src*="recaptcha" i], .g-recaptcha, [class*="captcha" i]'));
  if (hit || /\/(login|signin)\b/.test(url)) throw new Error('stopped: login or CAPTCHA detected');
}

async function gotoMonth(page, ym) {
  for (let i = 0; i < 12; i++) {
    const body = await page.innerText('body');
    const m = body.match(/(\d{4})年(\d{1,2})月/);
    if (!m) throw new Error('calendar month label not found');
    const cur = `${m[1]}-${String(m[2]).padStart(2, '0')}`;
    if (cur === ym) return true;
    const dir = cur < ym ? '›' : '‹';
    await page.locator('[class*="calendarNavBtn"]', { hasText: dir }).click();
    await page.waitForTimeout(300);
  }
  return false;
}

/** @param {{facility:object, from:string, to:string, now:string, sleep:(ms:number)=>Promise<void>}} ctx */
export async function fetchAvailability({ facility, from, to, now, sleep }) {
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { throw new Error('playwright not installed (npm i playwright)'); }

  const common = { facility: id, booking_url: facility.booking_url, fetched_at: now };
  const unknown = (date, note) => makeUnknown({ ...common, date, note });
  const browser = await chromium.launch({ executablePath: process.env.PB_CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage();
    await page.goto(facility.booking_url, { waitUntil: 'networkidle', timeout: 30000 });
    await assertNoBlocker(page);

    const out = [];
    let loadedMonth = null;
    for (const date of dateRange(from, to)) {
      const ym = date.slice(0, 7);
      if (ym !== loadedMonth) {
        if (!(await gotoMonth(page, ym))) { out.push(unknown(date, 'month not reachable in calendar')); continue; }
        loadedMonth = ym;
      }
      const day = Number(date.slice(8));
      const cell = page.locator(DAY).filter({ has: page.locator('[class*="calendarDayNum"]', { hasText: new RegExp(`^${day}$`) }) });
      if ((await cell.count()) !== 1) { out.push(unknown(date, 'day cell not found')); continue; }
      if (await cell.isDisabled()) { out.push(unknown(date, '選択不可(過去日または受付範囲外)')); continue; }

      await cell.click();
      await page.waitForTimeout(800);
      await assertNoBlocker(page);
      const buttons = await page.locator(HOUR).evaluateAll((els) =>
        els.map((e) => ({ text: e.innerText, available: /hourBtnAvailable/.test(e.className) })));
      const slots = parseHourButtons(buttons, { ...common, date });
      out.push(...(slots.length ? slots : [unknown(date, 'no time buttons found')]));
      await sleep(facility.min_interval_ms ?? 3000);
    }
    return out;
  } finally {
    await browser.close();
  }
}
