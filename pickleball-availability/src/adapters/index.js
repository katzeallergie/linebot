import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/** adapters/ 内の *.js(index.js 以外)を自動登録。新施設はファイルを足すだけ。 */
export async function loadAdapters() {
  const map = {};
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || f === 'index.js') continue;
    const m = await import(pathToFileURL(path.join(dir, f)).href);
    if (m.id && typeof m.fetchAvailability === 'function') map[m.id] = m;
  }
  return map;
}
