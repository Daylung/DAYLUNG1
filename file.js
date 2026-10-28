/**
 * Драйвер хранилища на JSON-файлах (локальная разработка, DB_DRIVER=file).
 *
 * Контракт совпадает с postgres-драйвером:
 *   read(name, fallback)        — таблица целиком
 *   write(name, value)          — заменить таблицу атомарно
 *   update(name, mutator)       — read-modify-write под блокировкой
 *   putBlob(key, value)         — произвольный JSON (снимки версий, бэкапы)
 *   getBlob(key, fallback)
 *   listBlobKeys(prefix)        — ключи, начинающиеся с prefix (новые последними)
 *   deleteBlob(key)
 *   reset(defaults)             — удалить все таблицы и блобы
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config.js';

const cache = new Map();
const queues = new Map();

const tablePath = (name) => path.join(config.dataDir, `${name}.json`);
const blobPath = (key) => path.join(config.dataDir, 'blobs', `${key}.json`);

function withLock(name, task) {
  const previous = queues.get(name) ?? Promise.resolve();
  const next = previous.then(task, task);
  queues.set(name, next.catch(() => {}));
  return next;
}

async function writeAtomic(target, value) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, target);
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw new Error(`Не удалось прочитать ${path.basename(file)}: ${err.message}`);
  }
}

export async function read(name, fallback = []) {
  if (cache.has(name)) return cache.get(name);
  const value = await readJson(tablePath(name), fallback);
  cache.set(name, value);
  return value;
}

export function write(name, value) {
  return withLock(name, async () => {
    await writeAtomic(tablePath(name), value);
    cache.set(name, value);
  });
}

export function update(name, mutator, fallback = []) {
  return withLock(name, async () => {
    const current = cache.has(name) ? cache.get(name) : await read(name, fallback);
    const next = await mutator(current);
    await writeAtomic(tablePath(name), next);
    cache.set(name, next);
    return next;
  });
}

export async function putBlob(key, value) {
  await writeAtomic(blobPath(key), value);
}

export async function getBlob(key, fallback = null) {
  return readJson(blobPath(key), fallback);
}

export async function listBlobKeys(prefix = '') {
  const dir = path.join(config.dataDir, 'blobs');
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith('.json') && f.startsWith(prefix))
      .map((f) => f.slice(0, -5))
      .sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function deleteBlob(key) {
  await fs.rm(blobPath(key), { force: true });
}

export async function reset(defaults) {
  cache.clear();
  for (const [name, value] of Object.entries(defaults)) {
    await writeAtomic(tablePath(name), value);
  }
  await fs.rm(path.join(config.dataDir, 'blobs'), { recursive: true, force: true });
}

export async function close() {}
