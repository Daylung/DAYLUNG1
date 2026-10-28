/**
 * Страница входа в админку.
 *
 * Одна форма, два поля. После успеха — сессия в HttpOnly cookie,
 * редирект в панель.
 */
import { html, when } from '../../render/html.js';
import { icon } from '../../components/icons.js';

export function renderLogin({ error = null, user = 'owner', notice = null } = {}) {
  return html`<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Вход — DAYLUNG Admin</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%237A5CFF'/><path d='M16 6l4 10-4-2-4 2z' fill='white'/></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;480;500;540;560;640;660;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
<div class="login">
  <div class="login__glow" aria-hidden="true"></div>

  <div class="login__card">
    <div class="login__brand">
      <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="url(#lg-bg)"/>
        <path d="M16 7 20.4 17.2 16 14.9 11.6 17.2z" fill="#fff"/>
        <path d="M16 25 11.6 14.8 16 17.1 20.4 14.8z" fill="#fff" opacity=".36"/>
        <defs><linearGradient id="lg-bg" x1="0" y1="0" x2="32" y2="32">
          <stop stop-color="#a78bfa"/><stop offset="1" stop-color="#5b3be8"/>
        </linearGradient></defs>
      </svg>
      <span class="adm__brand-name">DAYLUNG</span>
    </div>

    <h1>Панель управления</h1>
    <p>Доступ только для владельца проекта.</p>

    ${when(error, html`
      <div class="msg msg--err">${icon('alert', { size: 16 })}<span>${error}</span></div>
    `)}

    ${when(notice, html`
      <div class="msg msg--info">${icon('info', { size: 16 })}<span>${notice}</span></div>
    `)}

    <form class="login__form" method="post" action="/admin/login">
      <div class="field">
        <label for="user">Логин</label>
        <input class="inp" id="user" name="user" type="text" value="${user}" autocomplete="username" required autofocus>
      </div>

      <div class="field">
        <label for="password">Пароль</label>
        <input class="inp" id="password" name="password" type="password" autocomplete="current-password" required>
      </div>

      <button class="btn btn--primary btn--block" type="submit">Войти</button>
    </form>

    <p class="login__foot">
      Логин и пароль задаются в файле <code>.env</code>
      (<code>ADMIN_USER</code>, <code>ADMIN_PASSWORD</code>).
      Секреты не хранятся в коде.
    </p>
  </div>
</div>
</body>
</html>`;
}
