const LABEL = { available: '空き', booked: '埋まり', unknown: '不明' };
const TYPE = { indoor: '屋内', outdoor: '屋外', unknown: '-' };

export function toTable(slots, fetchedAt) {
  const rows = slots.map((s) => [
    s.date, `${s.start ?? '?'}-${s.end ?? '?'}`, s.facility, TYPE[s.court_type],
    LABEL[s.status], s.price == null ? '-' : `¥${s.price.toLocaleString()}`,
    s.note ? `(${s.note})` : s.booking_url,
  ]);
  const head = ['日付', '時間', '施設', '種別', '状態', '料金', 'URL/備考'];
  const all = [head, ...rows];
  const w = head.map((_, i) => Math.max(...all.map((r) => [...String(r[i])].length)));
  const line = (r) => r.map((c, i) => String(c) + ' '.repeat(w[i] - [...String(c)].length)).join(' | ');
  return [`取得時刻: ${fetchedAt}`, line(head), w.map((n) => '-'.repeat(n)).join('-+-'), ...rows.map(line)].join('\n');
}
