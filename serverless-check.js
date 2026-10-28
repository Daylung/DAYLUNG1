#!/usr/bin/env node
/**
 * Проверка api/index.js как serverless-функции.
 *
 * Vercel вызывает default-экспорт с (req, res). Здесь тот же контракт:
 * handler подключается к настоящему http-серверу, но listen() делает
 * тестовый стенд, а не приложение — как на платформе.
 *
 * Проверяется и холодный старт: пустая директория данных / пустая БД.
 */
import http from 'node:http';

const handler = (await import('../api/index.js')).default;

let failed = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => { failed++; console.log(`  ✖ ${m}`); };

const server = http.createServer((req, res) => {
  // ровно так платформа вызывает функцию
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error('[test] handler rejected:', err);
    if (!res.headersSent) { res.statusCode = 500; res.end('err'); }
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

console.log(`\nServerless-хендлер api/index.js\n  (порт ${server.address().port}, слушает тестовый стенд, не приложение)\n`);

async function get(path) {
  const res = await fetch(base + path, { redirect: 'manual' });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

try {
  const home = await get('/');
  home.status === 200 && home.text.includes('DAYLUNG')
    ? ok(`GET / → 200, страница отрендерена`)
    : bad(`GET / → ${home.status}`);

  const health = await get('/api/health');
  health.status === 200 ? ok(`GET /api/health → 200`) : bad(`GET /api/health → ${health.status}`);

  const cats = await get('/api/categories');
  let items = 0;
  try { items = (JSON.parse(cats.text).items ?? []).length; } catch {}
  items > 0
    ? ok(`GET /api/categories → ${items} категорий (seed на холодном старте)`)
    : bad('GET /api/categories вернул пусто');

  const admin = await get('/admin');
  admin.status === 303 ? ok(`GET /admin без сессии → 303 на логин`) : bad(`GET /admin → ${admin.status}`);

  const cat = await get('/category/ai');
  cat.status === 200 ? ok(`GET /category/ai → 200`) : bad(`GET /category/ai → ${cat.status}`);

  // повторный запрос: seed не должен дублировать данные
  const cats2 = await get('/api/categories');
  let items2 = 0;
  try { items2 = (JSON.parse(cats2.text).items ?? []).length; } catch {}
  items2 === items
    ? ok(`повторный запрос: ${items2} категорий, дубликатов нет`)
    : bad(`повторный запрос дал ${items2} вместо ${items}`);
} catch (err) {
  bad(`исключение: ${err.message}`);
}

server.close();
console.log(failed ? `\nПровалено: ${failed}\n` : '\nХендлер работает как serverless-функция ✔\n');
process.exit(failed ? 1 : 0);
