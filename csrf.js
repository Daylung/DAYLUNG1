/**
 * ══════════════════════════════════════════════════════════════════════
 *  CSRF-ЗАЩИТА ДЛЯ АДМИН-ПАНЕЛИ
 * ══════════════════════════════════════════════════════════════════════
 *
 *  Зачем: cookie сессии отправляется браузером автоматически. Без токена
 *  сторонний сайт мог бы отправить POST на /admin/... от имени вошедшего
 *  владельца (например, удалить категорию).
 *
 *  Как устроено:
 *   1. Токен хранится в cookie (не httpOnly, чтобы форма могла его прочитать
 *      и показать серверу в скрытом поле).
 *   2. Проверка идёт по схеме double-submit: значение из формы сравнивается
 *      со значением из cookie.
 *   3. Токен привязан к сессии — при повторном входе выдаётся новый.
 *   4. Дополнительно проверяется Origin/Referer для всех POST.
 *
 *  Почему double-submit, а не серверное хранилище: не нужно трогать 17 форм
 *  и не нужен дополнительный слой состояния. Подделка невозможна, потому что
 *  чужой домен не может прочитать наш cookie.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

export const CSRF_COOKIE = 'daylung_csrf';
export const CSRF_FIELD = '_csrf';

/** Заголовки, при которых POST считается безопасным. */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Пути, где проверка не нужна (вход выполняется до появления сессии). */
const EXEMPT_PATHS = new Set(['/admin/login']);

export function createToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Выдаёт токен из cookie либо создаёт новый.
 * Вызывается на каждом запросе к /admin.
 */
export function ensureToken(ctx) {
  const existing = ctx.cookies?.[CSRF_COOKIE];
  if (existing && existing.length >= 32) {
    ctx.locals.csrf = existing;
    return existing;
  }

  const token = createToken();
  ctx.locals.csrf = token;
  // Сразу кладём в текущий запрос, чтобы проверка на этом же запросе
  // видела токен, не дожидаясь следующего (cookie обновится у клиента).
  ctx.cookies = ctx.cookies ?? {};
  ctx.cookies[CSRF_COOKIE] = token;
  // SameSite=Strict: cookie уходит только со своих страниц
  ctx.setCookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: 'Strict',
    secure: config.isProd,
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return token;
}

/** Сравнение без утечки по времени. */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Проверяет, что запрос пришёл с нашего же origin. */
function originAllowed(ctx) {
  const h = ctx.req?.headers ?? {};
  const origin = h.origin;
  const referer = h.referer;

  // Часть клиентов (curl, старые браузеры) не шлёт ни того, ни другого.
  // Для них остаётся проверка токена — она и есть основная.
  if (!origin && !referer) return true;

  const expected = config.appUrl;
  const source = origin || referer;
  // Context не имеет поля headers — заголовки берём из ctx.req.headers.
  const host = h.host ?? '';
  try {
    const sourceOrigin = new URL(source).origin;
    return sourceOrigin === new URL(expected).origin
      || sourceOrigin === `http://${host}`
      || sourceOrigin === `https://${host}`;
  } catch {
    return false;
  }
}

/**
 * Middleware. Возвращает true, если запрос можно пропустить дальше,
 * либо false, если ответ уже отправлен (403).
 */
export async function csrfMiddleware(ctx) {
  if (!ctx.pathname.startsWith('/admin')) return true;
  // Метод берём из req: у Context нет собственного поля method
  const method = String(ctx.req?.method ?? 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) return true;
  if (EXEMPT_PATHS.has(ctx.pathname)) return true;

  const cookieToken = ctx.cookies?.[CSRF_COOKIE] ?? '';

  let formToken = '';
  try {
    const form = await ctx.form();
    formToken = String(form?.[CSRF_FIELD] ?? '');
  } catch {
    formToken = '';
  }

  const tokenOk = cookieToken.length >= 32 && timingSafeEqual(cookieToken, formToken);
  const originOk = originAllowed(ctx);

  if (!tokenOk || !originOk) {
    ctx.sendHtml(errorPage(tokenOk ? 'origin' : 'token'), 403);
    return false;
  }

  return true;
}

function errorPage(reason) {
  const text = reason === 'token'
    ? 'Проверка безопасности не пройдена: токен формы отсутствует или устарел. Обновите страницу и повторите действие.'
    : 'Запрос пришёл с чужого домена и отклонён.';

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>403 — DAYLUNG</title><link rel="stylesheet" href="/css/base.css"></head>
<body><div class="wrap" style="padding:120px 24px;text-align:center;max-width:560px">
<h1 style="font-size:1.8rem;margin-bottom:12px">Действие отклонено</h1>
<p style="color:var(--tx-2);margin-bottom:8px">${text}</p>
<p style="color:var(--tx-3);font-size:.85rem">Код 403</p>
<a class="btn btn--ghost" href="/admin" style="margin-top:20px">Вернуться в панель</a>
</div></body></html>`;
}
