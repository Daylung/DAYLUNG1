#!/usr/bin/env node
/**
 * npm run db:check
 *
 * Проверяет, что выбранный драйвер хранения работает end-to-end:
 * запись, чтение, update, блобы (снимки версий и бэкапы), сброс.
 *
 * Запускается и для file, и для postgres — одинаковый набор проверок.
 * Ничего не удаляет: пишет только в служебную таблицу/блоб `_dbcheck`.
 */
import { read, write, update, writeRaw, readRaw, listBlobKeys, deleteBlob, driverName } from '../src/db/store.js';

let failed = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => { failed++; console.log(`  ✖ ${m}`); };

const NAME = '_dbcheck';
const KEY = '_dbcheck:probe';

console.log(`\nПроверка хранилища (драйвер: ${driverName()})\n`);

try {
  const marker = { at: new Date().toISOString(), n: 1 };
  await write(NAME, [marker]);
  const back = await read(NAME, []);
  Array.isArray(back) && back[0]?.n === 1
    ? ok('write → read')
    : bad(`write → read (получено: ${JSON.stringify(back)})`);

  const next = await update(NAME, (rows) => [...rows, { at: marker.at, n: 2 }]);
  next.length === 2
    ? ok('update: read-modify-write')
    : bad(`update: ожидалось 2 строки, получено ${next.length}`);

  await writeRaw(KEY, { tables: { probe: [1, 2, 3] } });
  const blob = await readRaw(KEY, null);
  blob?.tables?.probe?.length === 3
    ? ok('blob: запись и чтение снимка')
    : bad(`blob: получено ${JSON.stringify(blob)}`);

  const keys = await listBlobKeys('_dbcheck:');
  keys.includes(KEY)
    ? ok('blob: перечисление по префиксу')
    : bad(`blob: ключ не найден в списке (${JSON.stringify(keys)})`);

  const missing = await readRaw('_dbcheck:отсутствует', null);
  missing === null
    ? ok('blob: отсутствующий ключ возвращает fallback')
    : bad(`blob: ожидался null, получено ${JSON.stringify(missing)}`);

  await deleteBlob(KEY);
  (await readRaw(KEY, null)) === null
    ? ok('blob: удаление')
    : bad('blob: ключ не удалён');

  // параллельные update не должны терять записи
  await write(NAME, []);
  await Promise.all(
    Array.from({ length: 10 }, () => update(NAME, async (rows) => [...rows, { at: 'p', n: 1 }])),
  );
  const after = await read(NAME, []);
  after.length === 10
    ? ok('параллельные update: 10/10 записей сохранены')
    : bad(`параллельные update: ожидалось 10, получено ${after.length} (потеря обновлений)`);
} catch (err) {
  bad(`исключение: ${err.message}`);
}

console.log(failed ? `\nПровалено проверок: ${failed}\n` : '\nХранилище в порядке ✔\n');
process.exit(failed ? 1 : 0);
