#!/usr/bin/env node
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { loadAdapters } from '../src/adapters/index.js';
import { run } from '../src/runner.js';
import { toTable } from '../src/format.js';
import { dateRange } from '../src/schema.js';

const { values: v } = parseArgs({
  options: {
    facility: { type: 'string', multiple: true }, from: { type: 'string' }, to: { type: 'string' },
    format: { type: 'string', default: 'table' }, 'no-cache': { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  },
});
if (v.help) {
  console.log('usage: pb-avail [--facility ID ...] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--format table|json|both] [--no-cache]');
  process.exit(0);
}

const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // JST
const from = v.from ?? today;
const to = v.to ?? from;
const days = [...dateRange(from, to)].length;
if (!days || days > 14) { console.error('日付範囲は1〜14日で指定してください'); process.exit(2); }

const all = JSON.parse(fs.readFileSync(new URL('../config/facilities.json', import.meta.url), 'utf8'));
const facilities = all.filter((f) => f.enabled && (!v.facility || v.facility.includes(f.id)));
if (!facilities.length) { console.error('対象施設がありません'); process.exit(2); }

const fetched_at = new Date().toISOString();
const slots = await run({ facilities, adapters: await loadAdapters(), from, to, noCache: v['no-cache'] });
if (v.format !== 'table') console.log(JSON.stringify({ fetched_at, from, to, slots }, null, 2));
if (v.format !== 'json') console.log(toTable(slots, fetched_at));
