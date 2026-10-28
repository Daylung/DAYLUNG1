/**
 * Сессии администратора — stateless.
 *
 * Cookie содержит подписанный payload: sid, user, expiresAt. Подпись HMAC-SHA256
 * на SESSION_SECRET. Ничего не хранится в памяти процесса, поэтому сессия
 * переживает холодный старт и работает на любом количестве serverless-инстансов.
 *
 * Отзыв сессии: cookie удаляется у клиента. Полный server-side revoke потребует
 * таблицы сессий — она не нужна для одного владельца, но точка расширения видна
 * в destroySession().
 */
import crypto from 'node:crypto';
import { config } from '../config.js';
import { safeEqual } from '../util/ids.js';

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload) {
  return crypto.createHmac('sha256', config.session.secret).update(payload).digest('base64url');
}

function encode(session) {
  const payload = b64url(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

function decode(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  if (!safeEqual(signature, sign(payload))) return null;

  let session;
  try {
    session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!session?.sid || !session?.user) return null;
  if (!Number.isFinite(session.expiresAtMs) || session.expiresAtMs < Date.now()) return null;

  return session;
}

export function createSession(user) {
  const ttlMs = config.session.ttlHours * 3600 * 1000;
  const expiresAtMs = Date.now() + ttlMs;

  const session = {
    sid: crypto.randomBytes(18).toString('base64url'),
    user,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
  };

  return {
    session,
    cookieValue: encode(session),
    maxAge: Math.floor(ttlMs / 1000),
  };
}

export function destroySession() {
  // Cookie удаляется на клиенте. Здесь мог бы быть server-side blacklist.
}

export function getSession(token) {
  return decode(token);
}

/** Оставлено для совместимости: чистить нечего, сессии живут в cookie. */
export function sweep() {}

export function sessionCookieOptions(maxAge) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    maxAge,
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    path: '/',
    maxAge: 0,
  };
}
