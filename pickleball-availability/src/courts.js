// 「③ コートを選択」の表示テキストから、コート別の空き・単価を読む(純関数)。
// 形式: グループ見出し(〜エリア〜コート) → コート名+階 → 「¥N/h」 → 空きなしなら「空きなし」。
const GROUP_RE = /^(.*(?:インドア|アウトドア).*)$/;
const COURT_RE = /^(\S*?コート)\s*(\d+F.*|)$/;
const PRICE_RE = /^¥([\d,]+)\/h$/;

export function parseCourtList(text, duration = 1) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const out = [];
  let group = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/満員です|^計\d+面|キャンセル待ち|^③/.test(l)) continue;
    if (GROUP_RE.test(l) && !COURT_RE.test(l)) { group = l; continue; }
    const c = l.match(COURT_RE);
    const p = lines[i + 1]?.match(PRICE_RE);
    if (!c || !p || !group) continue;
    const price = Number(p[1].replace(/,/g, ''));
    const full = lines[i + 2] === '空きなし';
    if (full) continue;
    out.push({
      court: c[1], floor: c[2], group,
      court_type: group.includes('アウトドア') ? 'outdoor' : 'indoor',
      price_per_hour: price, total_price: price * duration,
    });
  }
  return out;
}
