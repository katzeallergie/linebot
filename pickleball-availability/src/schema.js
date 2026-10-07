// 全施設共通の出力形式。アダプタは makeSlot() / makeUnknown() だけを使って返す。
export const STATUSES = ['available', 'booked', 'unknown'];
export const COURT_TYPES = ['indoor', 'outdoor', 'unknown'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * @typedef {Object} Slot
 * @property {string} facility       施設ID (config/facilities.json の id)
 * @property {'indoor'|'outdoor'|'unknown'} court_type
 * @property {string} date           YYYY-MM-DD (JST)
 * @property {string|null} start     HH:MM。不明なら null
 * @property {string|null} end       HH:MM。不明なら null
 * @property {'available'|'booked'|'unknown'} status
 * @property {number|null} price     円。取得できなければ null (推測しない)
 * @property {string} booking_url
 * @property {string} fetched_at     ISO8601
 * @property {string} [note]         unknown の理由など
 */

export function makeSlot(s) {
  const slot = {
    facility: s.facility,
    court_type: s.court_type ?? 'unknown',
    date: s.date,
    start: s.start ?? null,
    end: s.end ?? null,
    status: s.status ?? 'unknown',
    price: s.price ?? null,
    booking_url: s.booking_url ?? '',
    fetched_at: s.fetched_at,
  };
  if (s.note) slot.note = s.note;
  validateSlot(slot);
  return slot;
}

/** 取得失敗・未対応時の記録。空き状況は推測せず unknown にする。 */
export function makeUnknown({ facility, date, booking_url, fetched_at, note, court_type }) {
  return makeSlot({ facility, date, booking_url, fetched_at, note, court_type, status: 'unknown' });
}

export function validateSlot(s) {
  const err = (m) => { throw new Error(`invalid slot (${s.facility} ${s.date}): ${m}`); };
  if (!s.facility) err('facility required');
  if (!COURT_TYPES.includes(s.court_type)) err(`court_type ${s.court_type}`);
  if (!DATE_RE.test(s.date ?? '')) err(`date ${s.date}`);
  if (s.start !== null && !TIME_RE.test(s.start)) err(`start ${s.start}`);
  if (s.end !== null && !TIME_RE.test(s.end)) err(`end ${s.end}`);
  if (!STATUSES.includes(s.status)) err(`status ${s.status}`);
  if (s.price !== null && !Number.isFinite(s.price)) err(`price ${s.price}`);
  if (!s.fetched_at) err('fetched_at required');
}

export function* dateRange(from, to) {
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) yield d.toISOString().slice(0, 10);
}
