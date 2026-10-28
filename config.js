/**
 * Конфигурация приложения.
 *
 * Все секреты читаются из переменных окружения.
 * В коде нет и не должно быть ключей, паролей и токенов.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');

/** Простой парсер .env — без внешних зависимостей. */
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, '.env'));

const env = process.env;

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';
const IS_PROD = env.NODE_ENV === 'production';

export const config = {
  root: ROOT,
  env: env.NODE_ENV || 'development',
  isProd: IS_PROD,
  port: num(env.PORT, 3000),
  host: env.HOST || '127.0.0.1',
  appUrl: (env.APP_URL || `http://localhost:${num(env.PORT, 3000)}`).replace(/\/$/, ''),

  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  publicDir: path.join(ROOT, 'public'),

  admin: {
    user: env.ADMIN_USER || 'owner',
    // Пароль по умолчанию только для локальной разработки.
    password: ADMIN_PASSWORD || (IS_PROD ? '' : 'daylung-dev-2026'),
    isDefaultPassword: !ADMIN_PASSWORD,
  },

  session: {
    // Если секрет не задан — генерируем на время жизни процесса.
    // В продакшене SESSION_SECRET обязателен, иначе сессии слетят при рестарте.
    secret: env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    generatedSecret: !env.SESSION_SECRET,
    ttlHours: num(env.SESSION_TTL_HOURS, 12),
    cookieName: 'daylung_sid',
  },

  ai: {
    provider: (env.AI_PROVIDER || 'mock').toLowerCase(),
    apiKey: env.AI_API_KEY || '',
    model: env.AI_MODEL || '',
    timeoutMs: num(env.AI_TIMEOUT_MS, 15000),
  },

  affiliate: {
    tracking: bool(env.AFFILIATE_TRACKING, true),
  },
};

/** Предупреждения, которые печатаются при старте. */
export function startupWarnings() {
  const out = [];
  if (!config.admin.password) {
    out.push('ADMIN_PASSWORD не задан — вход в админку заблокирован. Задайте его в .env');
  } else if (config.admin.isDefaultPassword) {
    out.push('Используется пароль из .env.example. Смените ADMIN_PASSWORD перед публикацией.');
  }
  if (config.session.generatedSecret) {
    out.push('SESSION_SECRET не задан — сгенерирован временный. На serverless (Vercel) это сломает вход: каждый инстанс подписывает cookie своим ключом. Задайте SESSION_SECRET в переменных окружения.');
  }
  if (config.ai.provider !== 'mock' && !config.ai.apiKey) {
    out.push(`AI_PROVIDER=${config.ai.provider}, но AI_API_KEY пуст — будет использован mock.`);
  }
  return out;
}
