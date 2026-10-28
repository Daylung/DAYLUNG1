/**
 * Serverless-точка входа для Vercel.
 *
 * Приложение проекта — не Express, а собственный роутер на node:http
 * (src/http/router.js). Его сигнатура совпадает с хендлером Vercel:
 * (req, res) => void. Поэтому адаптер сводится к передаче запроса в роутер.
 *
 * Данные гарантируются лениво: на холодном старте первый запрос создаёт
 * seed, если хранилище пустое.
 */
import { createApp, ensureData } from '../app.js';

const router = createApp();
let ready = null;

export default async function handler(req, res) {
  try {
    if (!ready) ready = ensureData();
    await ready;
    await router.handle(req, res);
  } catch (err) {
    if (ready && typeof ready.then === 'function') ready = null;
    console.error('[serverless] unhandled', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Internal Server Error');
    }
  }
}
