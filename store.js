/**
 * Единый слой хранения. Все обращения приложения к данным идут сюда.
 *
 * Драйвер выбирается переменной окружения DB_DRIVER:
 *   file      — JSON-файлы в DATA_DIR (по умолчанию, локальная разработка)
 *   postgres  — PostgreSQL по DATABASE_URL (production, Vercel)
 *
 * Набор операций намеренно маленький, чтобы драйверы было легко менять:
 *   read(name, fallback)          таблица целиком
 *   write(name, value)            заменить таблицу
 *   update(name, mutator)         read-modify-write
 *   invalidate(name)              сбросить кэш файлового драйвера
 *   getBlob/writeRaw              снимки версий и резервные копии
 *   listBlobKeys/deleteBlob       перечисление и очистка блобов
 *   reset(defaults)               сброс к seed
 *
 * Соглашение об именах блобов:
 *   version:<id>          — снимок состояния для версии/preview
 *   backup:<имя>          — резервная копия перед публикацией или откатом
 */
import { config } from '../config.js';
import * as fileDriver from './drivers/file.js';

const DRIVER = (process.env.DB_DRIVER || 'file').toLowerCase();

let driverPromise = null;

function driver() {
  if (!driverPromise) {
    driverPromise = DRIVER === 'postgres'
      ? import('./drivers/postgres.js')
      : Promise.resolve(fileDriver);
  }
  return driverPromise;
}

export function driverName() {
  return DRIVER;
}

export async function read(name, fallback = []) {
  return (await driver()).read(name, fallback);
}

export async function write(name, value) {
  return (await driver()).write(name, value);
}

export async function update(name, mutator, fallback = []) {
  return (await driver()).update(name, mutator, fallback);
}

export async function invalidate(name) {
  const d = await driver();
  if (typeof d.invalidate === 'function') d.invalidate(name);
}

/* ── Блобы: снимки версий и резервные копии ───────────────────────────── */

export async function writeRaw(key, value) {
  return (await driver()).putBlob(key, value);
}

export async function readRaw(key, fallback = null) {
  return (await driver()).getBlob(key, fallback);
}

export async function listBlobKeys(prefix = '') {
  return (await driver()).listBlobKeys(prefix);
}

export async function deleteBlob(key) {
  return (await driver()).deleteBlob(key);
}

export async function reset(defaults) {
  const d = await driver();
  await d.reset(defaults);
}

export async function close() {
  const d = await driver();
  if (typeof d.close === 'function') await d.close();
}

export { config };
