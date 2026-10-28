/**
 * Сборка приложения: роутер + middleware. Без listen().
 *
 * Используется двумя точками входа:
 *   server.js        — локальный запуск (http.createServer + listen)
 *   api/index.js     — serverless-функция Vercel
 *
 * Поэтому здесь нет ни открытия порта, ни записи на диск.
 */
import { config } from './src/config.js';
import { Router } from './src/http/router.js';
import { serveStatic } from './src/http/static.js';
import { getSession } from './src/security/auth.js';
import { ensureToken, csrfMiddleware } from './src/security/csrf.js';
import { registerPublicRoutes } from './src/routes/public.js';
import { registerApiRoutes } from './src/routes/api.js';
import { registerAdminRoutes, requireAdmin } from './src/routes/admin.js';
import { ensureSeed } from './src/db/seedRunner.js';

export function createApp() {
  const router = new Router();

  /* ── Middleware ────────────────────────────────────────────────────── */

  // 1. Статика
  router.use(async (ctx) => {
    if (ctx.pathname.startsWith('/css/') || ctx.pathname.startsWith('/js/') || ctx.pathname.startsWith('/img/')) {
      const served = await serveStatic(ctx, ctx.pathname);
      if (served) return false;
    }
    return true;
  });

  // 2. Сессия (stateless, из подписанного cookie)
  router.use(async (ctx) => {
    const token = ctx.cookies[config.session.cookieName];
    ctx.locals.session = token ? getSession(token) : null;
    return true;
  });

  // 3. Защита админки
  router.use(async (ctx) => requireAdmin(ctx));

  // 4. CSRF
  router.use(async (ctx) => {
    if (!ctx.pathname.startsWith('/admin')) return true;
    ensureToken(ctx);
    return csrfMiddleware(ctx);
  });

  /* ── Маршруты ──────────────────────────────────────────────────────── */
  registerPublicRoutes(router);
  registerApiRoutes(router);
  registerAdminRoutes(router);

  return router;
}

/**
 * Гарантирует наличие данных. На serverless вызывается лениво при первом
 * запросе к холодному инстансу, локально — при старте.
 */
let seedPromise = null;

export function ensureData() {
  if (!seedPromise) {
    seedPromise = ensureSeed().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}
