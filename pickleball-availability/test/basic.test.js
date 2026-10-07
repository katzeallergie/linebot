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
