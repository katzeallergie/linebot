import { makeUnknown } from './schema.js';
import { cacheGet, cacheSet } from './cache.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 施設ごとに独立して実行。1施設が失敗しても他は継続し、失敗は unknown で記録する。
 * 施設間は直列(同時アクセスしない)。
 */
export async function run({ facilities, adapters, from, to, cacheTtlMs = 15 * 60_000, noCache = false }) {
  const out = [];
  for (const facility of facilities) {
    const now = new Date().toISOString();
    const key = `${facility.id}_${from}_${to}`;
    if (!noCache) {
      const hit = cacheGet(key, cacheTtlMs);
      if (hit) { out.push(...hit); continue; }
    }
    const adapter = adapters[facility.id];
    let slots;
    let failed = false;
    try {
      if (!adapter) throw new Error('no adapter registered');
      slots = await adapter.fetchAvailability({ facility, from, to, now, sleep });
    } catch (e) {
      failed = true;
      slots = [makeUnknown({
        facility: facility.id, date: from, booking_url: facility.booking_url,
        fetched_at: now, note: `error: ${e.message}`,
      })];
    }
    // 失敗結果はキャッシュしない(次回再試行できるように)。ただし未実装スタブもunknownなので
    // 全件unknownの場合はキャッシュしない。
    if (!failed && slots.some((s) => s.status !== 'unknown')) cacheSet(key, slots);
    out.push(...slots);
    await sleep(facility.min_interval_ms ?? 3000);
  }
  return out;
}
