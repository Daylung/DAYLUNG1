/**
 * Отдача статических файлов из public/.
 * Защита от выхода за пределы каталога (path traversal).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { securityHeaders } from './router.js';

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

const CACHE = {
  '.css': 'public, max-age=300',
  '.js': 'public, max-age=300',
  '.svg': 'public, max-age=86400',
  '.png': 'public, max-age=86400',
  '.webp': 'public, max-age=86400',
  '.woff2': 'public, max-age=31536000, immutable',
};

export async function serveStatic(ctx, urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '');

  // Нормализуем и проверяем, что путь не выходит из public/
  const safePath = path.normalize(rel);
  if (safePath.startsWith('..') || path.isAbsolute(safePath)) {
    ctx.sendText('Forbidden', 403);
    return true;
  }

  const full = path.join(config.publicDir, safePath);
  if (!full.startsWith(config.publicDir)) {
    ctx.sendText('Forbidden', 403);
    return true;
  }

  try {
    const stat = await fs.stat(full);
    if (!stat.isFile()) return false;

    const ext = path.extname(full).toLowerCase();
    const data = await fs.readFile(full);

    ctx.res.writeHead(200, {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': CACHE[ext] ?? 'public, max-age=60',
      ...securityHeaders(),
    });
    ctx.res.end(data);
    return true;
  } catch {
    return false;
  }
}
