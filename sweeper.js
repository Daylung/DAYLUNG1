/**
 * Периодическая очистка: просроченные сессии и старые попытки входа.
 */
import { sweep as sweepSessions } from './auth.js';
import { sweep as sweepAttempts } from './rateLimit.js';

let timer = null;

export function start() {
  if (timer) return;
  timer = setInterval(() => {
    sweepSessions();
    // sweepAttempts работает с хранилищем (асинхронно) — ошибку не даём уронить процесс
    sweepAttempts().catch((err) => console.error('[sweeper] attempts:', err.message));
  }, 10 * 60 * 1000);
  timer.unref?.();
}

export function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
