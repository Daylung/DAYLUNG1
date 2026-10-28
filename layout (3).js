/**
 * Базовый макет страницы: <head>, подключение стилей, скриптов.
 * Все публичные страницы собираются через этот макет.
 */
import { html, raw, join } from '../render/html.js';
import { header, footer } from '../components/layout.js';

export function page({ title, description = '', body = raw(''), categories = [], activeSlug = null, bodyClass = '' }) {
  const fullTitle = title ? `${title} — DAYLUNG` : 'DAYLUNG — подбор цифровых сервисов';
  const desc = description || 'Расскажите, что нужно, — DAYLUNG подберёт подходящие цифровые сервисы и сравнит их.';

  return html`<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fullTitle}</title>
  <meta name="description" content="${desc}">
  <meta property="og:title" content="${fullTitle}">
  <meta property="og:description" content="${desc}">
  <meta property="og:type" content="website">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%237A5CFF'/><path d='M16 6l4 10-4-2-4 2z' fill='white'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;480;500;540;560;640;660;680;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/base.css">
</head>
<body${bodyClass ? raw(` class="${bodyClass}"`) : raw('')}>
<a class="skip" href="#main">К содержимому</a>
${header({ categories, activeSlug })}
<main id="main">
${body}
</main>
${footer({ categories })}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/js/app.js"></script>
</body>
</html>`;
}
