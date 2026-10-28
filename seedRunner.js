/**
 * Первичная инициализация данных.
 *
 * Выполняется один раз при старте: если файлов данных нет,
 * создаёт их из seed. Существующие данные не перезаписывает —
 * это важно, чтобы рестарт не стирал правки из админки.
 */
import { read, write, reset } from './store.js';
import {
  seedCategories, seedServices, seedRecommendations, seedVersions, seedSettings,
} from './seed.js';

const TABLES = {
  categories: seedCategories,
  services: seedServices,
  recommendations: seedRecommendations,
  versions: seedVersions,
  settings: seedSettings,
  clicks: [],
};

export async function ensureSeed() {
  const created = [];

  for (const [table, defaultValue] of Object.entries(TABLES)) {
    // read() возвращает fallback, если таблицы ещё нет — по нему и определяем,
    // что данные нужно создать. Существующие данные не перезаписываются.
    const current = await read(table, null);
    if (current === null) {
      await write(table, defaultValue);
      created.push(table);
    }
  }

  if (created.length) {
    console.log(`  Созданы данные: ${created.join(', ')}`);
  }

  return created;
}

/** Полный сброс к seed-данным (npm run seed). */
export async function resetToSeed() {
  // reset() перезаписывает таблицы и очищает блобы (снимки версий и бэкапы)
  // в рамках одного драйвера — не важно, файлы это или Postgres.
  await reset(TABLES);
  return Object.keys(TABLES);
}
