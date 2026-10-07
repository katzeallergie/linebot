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
