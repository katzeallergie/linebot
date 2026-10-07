#!/usr/bin/env node
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { loadAdapters } from '../src/adapters/index.js';
import { runQuery } from '../src/query.js';

const { values: v } = parseArgs({
  options: {
    date: { type: 'string' }, start: { type: 'string' }, duration: { type: 'string', default: '1' },
    region: { type: 'string' }, 'court-type': { type: 'string' }, 'max-price': { type: 'string' },
    sort: { type: 'string', default: 'price' }, format: { type: 'string', default: 'table' }, help: { type: 'boolean', short: 'h' },
  },
});
const usage = 'usage: pb-query --date YYYY-MM-DD --start HH:MM [--duration 時間数(既定1)] [--region tokyo] [--court-type indoor|outdoor] [--max-price 円(合計)] [--sort price|name] [--format table|json]';
if (v.help) { console.log(usage); process.exit(0); }
const duration = Number(v.duration);
if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? '') || !/^\d{2}:\d{2}$/.test(v.start ?? '') || !Number.isInteger(duration) || duration < 1 || duration > 4) {
  console.error(usage); process.exit(2);
}

const facilities = JSON.parse(fs.readFileSync(new URL('../config/facilities.json', import.meta.url), 'utf8'));
const r = await runQuery({
  facilities, adapters: await loadAdapters(), date: v.date, start: v.start, duration, region: v.region,
  courtType: v['court-type'], maxPrice: v['max-price'] == null ? undefined : Number(v['max-price']), sort: v.sort,
});
if (v.format === 'json') { console.log(JSON.stringify(r, null, 2)); process.exit(0); }

const T = { indoor: '屋内', outdoor: '屋外' };
console.log(`条件: ${v.date} ${v.start}から${duration}時間 / 取得時刻: ${new Date().toISOString()} / 対象施設: ${r.queried.join(', ') || 'なし'}`);
if (!r.results.length) console.log('条件に合う空きコートは見つかりませんでした。');
for (const x of r.results) console.log(`${x.name} ${x.court}(${T[x.court_type]}${x.floor ? ' ' + x.floor : ''}) ¥${x.total_price.toLocaleString()} (¥${x.price_per_hour.toLocaleString()}/h) ${x.start}-${x.end}  ${x.booking_url}`);
for (const e of r.errors) console.log(`! ${e.facility}: 取得失敗 (${e.error})`);
for (const s of r.skipped) console.log(`- ${s.facility}: 検索未対応 (${s.reason})`);
