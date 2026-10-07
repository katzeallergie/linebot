
/**
 * 条件検索。全施設(region 一致)の adapter.findCourts を直列に呼び、空きコートを料金の安い順に返す。
 * 失敗した施設は errors に入れ、他は継続する(推測で埋めない)。
 */
export async function runQuery({ facilities, adapters, date, start, duration = 1, region, courtType, maxPrice, sort = 'price', sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const results = [];
  const errors = [];
  const skipped = [];
  const targets = facilities.filter((f) => f.enabled !== false && (!region || f.region === region));
  for (const facility of targets) {
    const adapter = adapters[facility.id];
    if (!adapter?.findCourts) { skipped.push({ facility: facility.id, reason: 'adapter has no findCourts' }); continue; }
    const fetched_at = new Date().toISOString();
    try {
      const courts = await adapter.findCourts({ facility, date, start, duration });
      for (const c of courts) {
        results.push({ facility: facility.id, name: facility.name, date, start, end: addHours(start, duration), duration,
          ...c, booking_url: facility.booking_url, fetched_at });
      }
    } catch (e) {
      errors.push({ facility: facility.id, error: e.message });
    }
    await sleep(facility.min_interval_ms ?? 3000);
  }
  let out = results;
  if (courtType) out = out.filter((r) => r.court_type === courtType);
  if (maxPrice != null) out = out.filter((r) => r.total_price <= maxPrice);
  out.sort(sort === 'price' ? (a, b) => a.total_price - b.total_price || a.facility.localeCompare(b.facility) : (a, b) => a.facility.localeCompare(b.facility));
  return { results: out, errors, skipped, queried: targets.map((f) => f.id) };
}

export function addHours(hhmm, n) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String(h + n).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
