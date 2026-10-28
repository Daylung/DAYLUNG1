/**
 * Лимит попыток входа в админку.
 *
 * Счётчики хранятся в таблице `rate_limits` через слой хранения (store.update),
 * поэтому они общие для всех инстансов и переживают холодный старт serverless.
 *
 * Проверка и учёт попытки — ОДНА атомарная операция (attempt). Раньше были
 * отдельные check() и fail(): параллельные запросы могли все пройти проверку
 * до первого учёта. Теперь каждый запрос сразу получает решение.
 */
import { update, read } from '../db/store.js';

const TABLE = 'rate_limits';
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

const keyFor = (ip) => `login:${ip || 'unknown'}`;

/**
 * Регистрирует попытку входа и возвращает решение.
 * Вызывать ДО сравнения пароля.
 *
 * @returns {Promise<{allowed: boolean, message?: string, left?: number}>}
 */
export async function attempt(ip) {
  const key = keyFor(ip);
  let decision = { allowed: true, left: MAX_ATTEMPTS };

  await update(TABLE, (rows) => {
    const now = Date.now();
    const map = Object.fromEntries(rows.map((r) => [r.key, r]));
    const entry = map[key] ?? { key, count: 0, firstAt: now, blockedUntil: 0 };

    // блокировка действует
    if (entry.blockedUntil > now) {
      decision = {
        allowed: false,
        message: `Слишком много попыток. Попробуйте через ${Math.ceil((entry.blockedUntil - now) / 60000)} мин.`,
        left: 0,
      };
      map[key] = entry;
      return finalize(map, now);
    }

    // окно истекло — начинаем заново
    if (now - entry.firstAt > WINDOW_MS) {
      entry.count = 0;
      entry.firstAt = now;
    }

    entry.count += 1;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_MS;
      entry.count = 0;
      entry.firstAt = now;
      decision = {
        allowed: false,
        message: 'Слишком много попыток. Попробуйте через 15 мин.',
        left: 0,
      };
    } else {
      decision = { allowed: true, left: MAX_ATTEMPTS - entry.count };
    }

    map[key] = entry;
    return finalize(map, now);
  });

  return decision;
}

/** Успешный вход сбрасывает счётчик этого адреса. */
export async function reset(ip) {
  const key = keyFor(ip);
  await update(TABLE, (rows) => rows.filter((r) => r.key !== key));
}

/** Удаляет устаревшие записи. Вызывается периодически. */
export async function sweep() {
  const now = Date.now();
  await update(TABLE, (rows) => rows.filter((r) =>
    r.blockedUntil > now || now - r.firstAt <= WINDOW_MS,
  ));
}

function finalize(map, now) {
  // чистим протухшие записи при каждой записи — таблица не растёт
  return Object.values(map).filter((r) =>
    r.blockedUntil > now || now - r.firstAt <= WINDOW_MS,
  );
}

export async function snapshot() {
  return read(TABLE, []);
}

/* ── Пароли: проверка надёжности (используется при смене пароля) ───── */

export const MIN_PASSWORD_LENGTH = 10;

export function passwordIsWeak(password) {
  if (!password) return true;
  if (password.length < MIN_PASSWORD_LENGTH) return true;
  if (/^(password|123456|qwerty)/i.test(password)) return true;
  return false;
}
