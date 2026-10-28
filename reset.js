#!/usr/bin/env node
/**
 * npm run reset
 *
 * ОПАСНО: возвращает данные к seed-состоянию. Все правки в админке будут потеряны.
 *
 * Перед сбросом снимается копия текущих данных — как блоб в том же хранилище,
 * что и сами данные. Поэтому команда одинаково работает и с файлами, и с Postgres.
 * Требует явного подтверждения: npm run reset -- --yes
 */
import { read, writeRaw, driverName } from '../src/db/store.js';
import { resetToSeed } from '../src/db/seedRunner.js';

const TABLES = ['categories', 'services', 'recommendations', 'versions', 'settings', 'clicks'];

if (!process.argv.includes('--yes')) {
  console.log('Сброс удалит все изменения в данных.');
  console.log('Чтобы подтвердить, запустите:  npm run reset -- --yes');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupKey = `backup:before-reset-${stamp}`;

// Снимок снимаем до сброса, но записываем ПОСЛЕ:
// resetToSeed() очищает все блобы, включая только что созданный бэкап.
const snapshot = { takenAt: new Date().toISOString(), tables: {} };
for (const table of TABLES) {
  snapshot.tables[table] = await read(table, table === 'settings' ? {} : []);
}

await resetToSeed();
await writeRaw(backupKey, snapshot);

console.log('✔ Данные сброшены к seed-версии.');
console.log(`  Хранилище: ${driverName()}`);
console.log(`  Копия прежних данных: ${backupKey}`);
