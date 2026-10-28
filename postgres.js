/**
 * Драйвер хранилища на PostgreSQL (DB_DRIVER=postgres).
 *
 * Схема (создаётся автоматически при первом обращении):
 *   daylung_tables (name TEXT PK, value JSONB, updated_at TIMESTAMPTZ)
 *   daylung_blobs  (key  TEXT PK, value JSONB, created_at TIMESTAMPTZ)
 *
 * Табличная модель совпадает с файловой: одна строка = одна таблица приложения.
 * update() выполняется в транзакции с SELECT ... FOR UPDATE, поэтому параллельные
 * записи из разных serverless-инстансов не теряют изменения.
 *
 * Строка подключения — только из переменной окружения DATABASE_URL.
 */
import pg from 'pg';
import { config } from '../../config.js';

let pool = null;
let ready = null;

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DB_DRIVER=postgres, но DATABASE_URL не задан в переменных окружения');
  }
  pool = new pg.Pool({
    connectionString: url,
    max: 3, // serverless: не держим много соединений на инстанс
    ssl: config.isProd || /sslmode=require|neon\.tech|supabase/.test(url)
      ? { rejectUnauthorized: false }
      : undefined,
  });
  return pool;
}

async function ensureSchema() {
  if (!ready) {
    ready = getPool().query(`
      CREATE TABLE IF NOT EXISTS daylung_tables (
        name       TEXT PRIMARY KEY,
        value      JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS daylung_blobs (
        key        TEXT PRIMARY KEY,
        value      JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `).then(() => undefined, (err) => { ready = null; throw err; });
  }
  return ready;
}

export async function read(name, fallback = []) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT value FROM daylung_tables WHERE name = $1', [name],
  );
  return rows.length ? rows[0].value : fallback;
}

export async function write(name, value) {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO daylung_tables (name, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [name, JSON.stringify(value)],
  );
}

export async function update(name, mutator, fallback = []) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO daylung_tables (name, value) VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING`,
      [name, JSON.stringify(fallback)],
    );
    const { rows } = await client.query(
      'SELECT value FROM daylung_tables WHERE name = $1 FOR UPDATE', [name],
    );
    const next = await mutator(rows[0].value);
    await client.query(
      'UPDATE daylung_tables SET value = $2, updated_at = now() WHERE name = $1',
      [name, JSON.stringify(next)],
    );
    await client.query('COMMIT');
    return next;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function putBlob(key, value) {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO daylung_blobs (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, JSON.stringify(value)],
  );
}

export async function getBlob(key, fallback = null) {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT value FROM daylung_blobs WHERE key = $1', [key],
  );
  return rows.length ? rows[0].value : fallback;
}

export async function listBlobKeys(prefix = '') {
  await ensureSchema();
  const { rows } = await getPool().query(
    `SELECT key FROM daylung_blobs WHERE key LIKE $1 ORDER BY key`,
    [`${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`],
  );
  return rows.map((r) => r.key);
}

export async function deleteBlob(key) {
  await ensureSchema();
  await getPool().query('DELETE FROM daylung_blobs WHERE key = $1', [key]);
}

export async function reset(defaults) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM daylung_blobs');
    for (const [name, value] of Object.entries(defaults)) {
      await client.query(
        `INSERT INTO daylung_tables (name, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [name, JSON.stringify(value)],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    ready = null;
  }
}
