import fs from 'node:fs';
import path from 'node:path';

const DIR = process.env.PB_CACHE_DIR ?? path.join(process.cwd(), '.cache');

/** 同じ施設・日付範囲は TTL 内ならサイトに再アクセスしない。 */
export function cacheGet(key, ttlMs) {
  try {
    const f = path.join(DIR, `${key}.json`);
    const { at, value } = JSON.parse(fs.readFileSync(f, 'utf8'));
    return Date.now() - at < ttlMs ? value : null;
  } catch { return null; }
}

export function cacheSet(key, value) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, `${key}.json`), JSON.stringify({ at: Date.now(), value }));
  } catch { /* キャッシュ失敗は無視 */ }
}
