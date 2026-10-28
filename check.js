#!/usr/bin/env node
/**
 * npm run check
 *
 * Быстрая проверка проекта без внешних зависимостей:
 *  - все модули импортируются;
 *  - данные читаются и связаны (у сервисов есть существующая категория);
 *  - секретов нет в исходниках;
 *  - ключевые страницы отвечают на локальном сервере (если он запущен).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { config, ROOT } from '../src/config.js';
import { read, driverName } from '../src/db/store.js';

let failed = 0;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const bad = (msg) => { failed++; console.log(`  ✖ ${msg}`); };

console.log('Проверка DAYLUNG\n');
console.log(`Хранилище: ${driverName()}`);

/* 1. Модули импортируются */
console.log('Модули:');
for (const rel of [
  'src/routes/public.js', 'src/routes/admin.js', 'src/routes/api.js',
  'src/services/ai/recommend.js', 'src/services/versions.js',
]) {
  try { await import(path.join(ROOT, rel)); ok(rel); }
  catch (e) { bad(`${rel}: ${e.message}`); }
}

/* 2. Данные связаны */
console.log('\nДанные:');
const readTable = (n) => read(n, n === 'settings' ? {} : []);
try {
  const categories = await readTable('categories');
  const services = await readTable('services');
  const catIds = new Set(categories.map((c) => c.id));
  const orphans = services.filter((s) => !catIds.has(s.categoryId));
  orphans.length
    ? bad(`сервисов без категории: ${orphans.length}`)
    : ok(`${services.length} сервисов, все привязаны к категории`);

  const slugs = services.map((s) => s.slug);
  new Set(slugs).size === slugs.length ? ok('slug сервисов уникальны') : bad('есть дубли slug');
  const ids = services.map((s) => s.id);
  new Set(ids).size === ids.length ? ok('id сервисов уникальны') : bad('есть дубли id');
} catch (e) {
  bad(`чтение данных: ${e.message}`);
}

/* 3. Секреты не лежат в исходниках */
console.log('\nСекреты:');
const SECRET_PATTERNS = [/sk-[A-Za-z0-9]{20,}/, /AIza[0-9A-Za-z_-]{30,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];
const files = [];
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'data', 'legacy', '.git'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (/\.(js|html|css|md|json)$/.test(e.name)) files.push(p);
  }
}
await walk(ROOT);
let leaks = 0;
for (const f of files) {
  const text = await fs.readFile(f, 'utf8');
  if (SECRET_PATTERNS.some((re) => re.test(text))) { leaks++; bad(`возможный ключ в ${path.relative(ROOT, f)}`); }
}
if (!leaks) ok(`просмотрено ${files.length} файлов, ключей не найдено`);

/* 4. Сервер (если запущен) */
console.log('\nСервер:');
const base = `http://127.0.0.1:${config.port}`;
const paths = ['/', '/category/ai', '/category/vpn', '/category/hosting', '/category/business', '/api/health', '/api/categories', '/api/services'];
let reachable = true;
for (const p of paths) {
  try {
    const res = await fetch(base + p, { redirect: 'manual' });
    res.status < 400 ? ok(`${p} → ${res.status}`) : bad(`${p} → ${res.status}`);
  } catch {
    reachable = false;
    break;
  }
}
if (!reachable) console.log('  · сервер не запущен — проверка страниц пропущена (запустите npm start)');

console.log(failed ? `\nПроверка не пройдена: ${failed}` : '\nВсё в порядке ✔');
process.exit(failed ? 1 : 0);
