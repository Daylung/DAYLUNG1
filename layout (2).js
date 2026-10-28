/**
 * Макет административной панели.
 *
 * Отдельный от публичного: своя навигация, свои стили.
 * Пункты меню строятся из ADMIN_NAV — новый раздел
 * добавляется одной записью в массиве.
 */
import { html, raw, join, when, lazyWhen } from '../../render/html.js';
import { icon } from '../../components/icons.js';

export const ADMIN_NAV = [
  { group: 'Обзор', items: [
    { href: '/admin', label: 'Dashboard', icon: 'home', key: 'dashboard' },
  ]},
  { group: 'Контент', items: [
    { href: '/admin/categories', label: 'Категории', icon: 'grid', key: 'categories', countKey: 'categories' },
    { href: '/admin/services', label: 'Сервисы', icon: 'layers', key: 'services', countKey: 'services' },
    { href: '/admin/recommendations', label: 'Рекомендации', icon: 'sparkles', key: 'recommendations', countKey: 'recommendations' },
  ]},
  { group: 'Разработка', items: [
    { href: '/admin/editor', label: 'Доработка сайта', icon: 'wand', key: 'editor' },
    { href: '/admin/versions', label: 'Версии', icon: 'history', key: 'versions' },
    { href: '/admin/preview', label: 'Предпросмотр', icon: 'eye', key: 'preview' },
  ]},
  { group: 'Система', items: [
    { href: '/admin/settings', label: 'Настройки', icon: 'settings', key: 'settings' },
  ]},
];

export function adminPage({
  title,
  subtitle = '',
  active = '',
  counts = {},
  currentVersion = null,
  body = raw(''),
  actions = raw(''),
  flash = null,
}) {
  const sidebar = ADMIN_NAV.map((group) => html`
    <div class="adm__group">${group.group}</div>
    ${join(group.items.map((item) => {
      const count = item.countKey ? counts[item.countKey] : null;
      return html`
        <a class="adm__link${item.key === active ? ' is-on' : ''}" href="${item.href}">
          ${icon(item.icon, { size: 16 })}
          ${item.label}
          ${when(count !== null && count !== undefined, html`<span class="adm__count">${count}</span>`)}
        </a>
      `;
    }))}
  `);

  return html`<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — DAYLUNG Admin</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%237A5CFF'/><path d='M16 6l4 10-4-2-4 2z' fill='white'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;480;500;540;560;640;660;680;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
<div class="adm">
  <aside class="adm__side" id="admSide">
    <a class="adm__brand" href="/admin">
      <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="url(#ad-bg)"/>
        <path d="M16 7 20.4 17.2 16 14.9 11.6 17.2z" fill="#fff"/>
        <path d="M16 25 11.6 14.8 16 17.1 20.4 14.8z" fill="#fff" opacity=".36"/>
        <defs><linearGradient id="ad-bg" x1="0" y1="0" x2="32" y2="32">
          <stop stop-color="#a78bfa"/><stop offset="1" stop-color="#5b3be8"/>
        </linearGradient></defs>
      </svg>
      <span>
        <span class="adm__brand-name">DAYLUNG</span>
        <span class="adm__brand-sub">Панель управления</span>
      </span>
    </a>

    <nav class="adm__nav" aria-label="Разделы админки">
      ${sidebar}
    </nav>

    <div class="adm__spacer"></div>

    <div class="adm__user">
      <div class="adm__user-row">
        <span class="adm__avatar">OW</span>
        <span>
          <span class="adm__user-name">owner</span>
          <span class="adm__user-role">Владелец</span>
        </span>
      </div>
      <div style="display:flex;gap:6px">
        <a class="btn btn--ghost btn--xs" href="/" style="flex:1">На сайт</a>
        <form method="post" action="/admin/logout" style="flex:1">
          <button class="btn btn--ghost btn--xs" type="submit" style="width:100%">Выйти</button>
        </form>
      </div>
    </div>
  </aside>

  <div class="adm__main">
    <div class="adm__bar">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="adm__burger" id="admBurger" type="button" aria-label="Меню">
          ${icon('list', { size: 17 })}
        </button>
        <div>
          <div class="adm__bar-title">${title}</div>
          ${when(subtitle, html`<div class="adm__bar-path">${subtitle}</div>`)}
        </div>
      </div>
      <div class="adm__bar-actions">
        ${when(currentVersion, html`
          <span class="verchip"><i></i>${currentVersion.label}</span>
        `)}
        ${actions}
      </div>
    </div>

    <div class="adm__body">
      ${lazyWhen(flash, () => html`
        <div class="msg msg--${flash.type}">
          ${icon(flash.type === 'err' ? 'alert' : flash.type === 'warn' ? 'alert' : 'check', { size: 16 })}
          <div>
            ${flash.text}
            ${lazyWhen(flash.list?.length, () => html`<ul>${join((flash.list ?? []).map((i) => html`<li>${i}</li>`))}</ul>`)}
          </div>
        </div>
      `)}
      ${body}
    </div>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/js/admin.js"></script>
</body>
</html>`;
}

/** Извлекает flash-сообщение из query и удаляет его. */
export function readFlash(ctx) {
  const type = ctx.get('ok') ? 'ok' : ctx.get('err') ? 'err' : ctx.get('warn') ? 'warn' : null;
  if (!type) return null;

  const text = ctx.get(type) || '';
  const detail = ctx.get('detail');
  return { type, text, list: detail ? detail.split('|').filter(Boolean) : [] };
}

export function redirectFlash(ctx, path, type, text, detail = null) {
  const params = new URLSearchParams({ [type]: text });
  if (detail?.length) params.set('detail', detail.join('|'));
  ctx.redirect(`${path}?${params.toString()}`);
}
