/**
 * Минимальный HTTP-фреймворк на голом node:http.
 *
 * Своими силами, без Express: проект должен запускаться
 * одной командой `npm start` без установки зависимостей.
 *
 * Что здесь есть:
 *  • маршрутизация с параметрами (/service/:slug)
 *  • разбор query и тела формы
 *  • отправка HTML, JSON, редиректов
 *  • cookie и сессии
 */
import http from 'node:http';
import { URL } from 'node:url';

export class Router {
  constructor() {
    this.routes = [];
    this.middleware = [];
  }

  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  add(method, pattern, handler) {
    this.routes.push({
      method: method.toUpperCase(),
      pattern,
      regex: patternToRegex(pattern),
      keys: patternKeys(pattern),
      handler,
    });
    return this;
  }

  get(p, h) { return this.add('GET', p, h); }
  post(p, h) { return this.add('POST', p, h); }
  put(p, h) { return this.add('PUT', p, h); }
  delete(p, h) { return this.add('DELETE', p, h); }

  match(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const m = route.regex.exec(pathname);
      if (!m) continue;
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
    return null;
  }

  async handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const ctx = new Context(req, res, url);

    try {
      for (const fn of this.middleware) {
        const result = await fn(ctx);
        if (result === false) return;
      }

      const found = this.match(req.method, url.pathname);
      if (!found) {
        await notFound(ctx);
        return;
      }

      ctx.params = found.params;
      await found.route.handler(ctx);
    } catch (err) {
      console.error('[error]', req.method, url.pathname, err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(errorPage(err));
      }
    }
  }
}

/* ── Контекст запроса ────────────────────────────────────── */

class Context {
  constructor(req, res, url) {
    this.req = req;
    this.res = res;
    this.url = url;
    this.pathname = url.pathname;
    this.query = url.searchParams;
    this.params = {};
    this.locals = {};
    this.body = null;
    this.rawBody = '';
    this.cookies = parseCookies(req.headers.cookie);
    this.ip = clientIp(req);
  }

  get(key) {
    return key === undefined ? this.query : this.query.get(key);
  }

  /** Читает тело формы. Размер ограничен, чтобы не съесть память. */
  async form() {
    if (this.body) return this.body;
    const raw = await readBody(this.req, 1_000_000);
    this.rawBody = raw;

    const type = this.req.headers['content-type'] ?? '';
    if (type.includes('application/json')) {
      try { this.body = JSON.parse(raw); } catch { this.body = {}; }
    } else if (type.includes('application/x-www-form-urlencoded')) {
      this.body = parseUrlEncoded(raw);
    } else {
      this.body = {};
    }
    return this.body;
  }

  sendHtml(html, status = 200, extraHeaders = {}) {
    let output = html.toString();

    // Централизованная подстановка CSRF-токена.
    // Все POST-формы админки получают скрытое поле автоматически:
    // не нужно править каждый шаблон и легко забыть про новую форму.
    const token = this.locals?.csrf;
    if (token && this.pathname.startsWith('/admin')) {
      output = output.replace(
        /(<form\b[^>]*method=["']post["'][^>]*>)/gi,
        `$1<input type="hidden" name="_csrf" value="${token}">`,
      );
    }

    this.res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8',
      ...securityHeaders(),
      ...extraHeaders,
    });
    this.res.end(output);
  }

  sendJson(data, status = 200) {
    this.res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      ...securityHeaders(),
    });
    this.res.end(JSON.stringify(data));
  }

  sendText(text, status = 200, type = 'text/plain; charset=utf-8') {
    this.res.writeHead(status, { 'Content-Type': type, ...securityHeaders() });
    this.res.end(text);
  }

  redirect(location, status = 303) {
    this.res.writeHead(status, { Location: location, ...securityHeaders() });
    this.res.end();
  }

  setCookie(name, value, options = {}) {
    const parts = [`${name}=${value}`];
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.httpOnly) parts.push('HttpOnly');
    if (options.secure) parts.push('Secure');
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

    const existing = this.res.getHeader('Set-Cookie');
    const cookies = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
    this.res.setHeader('Set-Cookie', [...cookies, parts.join('; ')]);
  }

  clearCookie(name, options = {}) {
    this.setCookie(name, '', { ...options, maxAge: 0 });
  }

  acceptsJson() {
    return (this.req.headers.accept ?? '').includes('application/json');
  }
}

/* ── Вспомогательные ─────────────────────────────────────── */

function patternToRegex(pattern) {
  const source = pattern
    .replace(/[.+*?^${}()|[\]\\]/g, '\\$&')
    .replace(/\/:(\w+)/g, '/([^/]+)')
    .replace(/^\*$/, '.*');
  return new RegExp(`^${source}$`);
}

function patternKeys(pattern) {
  return [...pattern.matchAll(/:(\w+)/g)].map((m) => m[1]);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

/**
 * Разбор application/x-www-form-urlencoded с поддержкой повторяющихся ключей.
 *
 * Object.fromEntries(new URLSearchParams(...)) молча оставляет только последнее
 * значение, из-за чего группы чекбоксов (например, платформы сервиса) теряли
 * все пункты кроме одного. Один ключ -> строка, несколько -> массив строк:
 * остальной код уже ожидает именно такой вид.
 */
function parseUrlEncoded(raw) {
  const out = Object.create(null);

  for (const [key, value] of new URLSearchParams(raw)) {
    if (!(key in out)) {
      out[key] = value;
    } else if (Array.isArray(out[key])) {
      out[key].push(value);
    } else {
      out[key] = [out[key], value];
    }
  }

  return out;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Слишком большой запрос'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Заголовки безопасности для всех ответов. */
export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // script-src без unsafe-inline: инлайновых скриптов в проекте нет
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join('; '),
  };
}

async function notFound(ctx) {
  if (ctx.pathname.startsWith('/api/')) {
    ctx.sendJson({ error: 'Маршрут не найден' }, 404);
    return;
  }
  ctx.sendHtml(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>404 — DAYLUNG</title>
<link rel="stylesheet" href="/css/base.css"></head>
<body><div class="wrap" style="padding:120px 24px;text-align:center">
<h1 style="font-size:2rem;margin-bottom:12px">Страница не найдена</h1>
<p style="color:var(--tx-2);margin-bottom:24px">Такого адреса на сайте нет.</p>
<a class="btn btn--primary" href="/">На главную</a>
</div></body></html>`, 404);
}

function errorPage(err) {
  const message = String(err?.message ?? 'Неизвестная ошибка').replace(/[<>&]/g, '');
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>Ошибка — DAYLUNG</title><link rel="stylesheet" href="/css/base.css"></head>
<body><div class="wrap" style="padding:120px 24px;text-align:center">
<h1 style="font-size:1.8rem;margin-bottom:12px">Внутренняя ошибка</h1>
<p style="color:var(--tx-2);margin-bottom:8px">${message}</p>
<p style="color:var(--tx-3);font-size:.85rem">Подробности — в консоли сервера.</p>
<a class="btn btn--ghost" href="/" style="margin-top:20px">На главную</a>
</div></body></html>`;
}

export function createServer(router) {
  return http.createServer((req, res) => {
    // Лёгкий лог без чувствительных данных
    const started = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - started;
      if (!req.url.startsWith('/css') && !req.url.startsWith('/js')) {
        console.log(`${res.statusCode} ${req.method} ${req.url.split('?')[0]} — ${ms}ms`);
      }
    });
    router.handle(req, res);
  });
}
