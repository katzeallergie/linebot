import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSlot, makeUnknown, dateRange } from '../src/schema.js';
import { run } from '../src/runner.js';

test('makeSlot rejects bad status', () => {
  assert.throws(() => makeSlot({ facility: 'x', date: '2026-10-08', status: 'maybe', fetched_at: 't' }));
});
test('dateRange inclusive', () => {
  assert.deepEqual([...dateRange('2026-10-30', '2026-11-02')], ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
});
test('one failing adapter does not stop others', async () => {
  const fac = (id) => ({ id, booking_url: 'u', min_interval_ms: 0 });
  const adapters = {
    bad: { fetchAvailability: async () => { throw new Error('boom'); } },
    good: { fetchAvailability: async ({ now }) => [makeSlot({ facility: 'good', date: '2026-10-08', status: 'available', fetched_at: now })] },
  };
  const out = await run({ facilities: [fac('bad'), fac('good')], adapters, from: '2026-10-08', to: '2026-10-08', noCache: true });
  assert.equal(out[0].status, 'unknown');
  assert.match(out[0].note, /boom/);
  assert.equal(out[1].status, 'available');
});

test('sansan parseHourButtons maps available / full / unknown', async () => {
  const { parseHourButtons } = await import('../src/adapters/sansan-ikebukuro.js');
  const ctx = { facility: 'sansan-ikebukuro', date: '2026-10-15', booking_url: 'u', fetched_at: 't' };
  const out = parseHourButtons([
    { text: '09:00\n空1', available: true },
    { text: '10:00\n満', available: false },
    { text: '11:00\n???', available: false },
    { text: 'junk', available: false },
  ], ctx);
  assert.deepEqual(out.map((s) => [s.start, s.end, s.status]), [['09:00', '10:00', 'available'], ['10:00', '11:00', 'booked'], ['11:00', '12:00', 'unknown']]);
  assert.equal(out[0].note, '空きコート1面');
});

const SAMPLE = `③ コートを選択（複数可）
計11面（...）
4Fインドアエリア フルコート
Aコート4F
¥5,500/h
Bコート4F
¥5,500/h
空きなし
4Fインドアエリア フルコートは満員です。
6Fアウトドアエリア フルコート
Dコート6F（屋上）
¥3,300/h
空きなし
Fコート6F（屋上）
¥3,300/h
3F インドアエリア ハーフコート
Kコート3F
¥4,400/h
空きなし
3F インドアエリア ハーフコートは満員です。
※ キャンセル待ちは1枠単位のみ申し込み可能です
⏳ キャンセル待ちに登録（現在 0 人待ち）`;

test('parseCourtList keeps only free courts with price and type', async () => {
  const { parseCourtList } = await import('../src/courts.js');
  const out = parseCourtList(SAMPLE, 2);
  assert.deepEqual(out.map((c) => [c.court, c.court_type, c.price_per_hour, c.total_price]),
    [['Aコート', 'indoor', 5500, 11000], ['Fコート', 'outdoor', 3300, 6600]]);
});

test('runQuery filters by region, sorts by price, isolates failures', async () => {
  const { runQuery } = await import('../src/query.js');
  const fac = (id, region) => ({ id, name: id, region, enabled: true, booking_url: 'u', min_interval_ms: 0 });
  const court = (court, court_type, total_price) => ({ court, floor: '', court_type, price_per_hour: total_price, total_price });
  const adapters = {
    a: { findCourts: async () => [court('X', 'indoor', 9000), court('Y', 'outdoor', 4000)] },
    b: { findCourts: async () => { throw new Error('boom'); } },
    c: { findCourts: async () => [court('Z', 'indoor', 1)] },
    d: {},
  };
  const r = await runQuery({ facilities: [fac('a', 'tokyo'), fac('b', 'tokyo'), fac('c', 'osaka'), fac('d', 'tokyo')], adapters,
    date: '2026-10-17', start: '16:00', duration: 1, region: 'tokyo', sleep: async () => {} });
  assert.deepEqual(r.results.map((x) => x.court), ['Y', 'X']);
  assert.equal(r.results[0].end, '17:00');
  assert.equal(r.errors[0].facility, 'b');
  assert.equal(r.skipped[0].facility, 'd');
  const cheap = await runQuery({ facilities: [fac('a', 'tokyo')], adapters, date: '2026-10-17', start: '16:00', maxPrice: 5000, courtType: 'outdoor', sleep: async () => {} });
  assert.deepEqual(cheap.results.map((x) => x.court), ['Y']);
});
