/**
 * Общие компоненты публичной части.
 *
 * Каждый компонент — функция, возвращающая HTML-фрагмент.
 * Изменение дизайна карточки происходит здесь и нигде больше:
 * страницы только вызывают компоненты.
 */
import { html, raw, join, when, attrs } from '../render/html.js';
import { icon } from './icons.js';
import { formatRating, formatDate } from '../util/format.js';
import { outboundUrl, showsDisclosure } from '../services/affiliate.js';

const SITE_NAME = 'DAYLUNG';

/* ── Логотип ─────────────────────────────────────────────── */
export function logo() {
  return html`
    <a class="brand" href="/" aria-label="DAYLUNG — на главную">
      <svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="url(#dl-bg)"/>
        <path d="M16 7 20.4 17.2 16 14.9 11.6 17.2z" fill="#fff"/>
        <path d="M16 25 11.6 14.8 16 17.1 20.4 14.8z" fill="#fff" opacity=".36"/>
        <defs>
          <linearGradient id="dl-bg" x1="0" y1="0" x2="32" y2="32">
            <stop stop-color="#a78bfa"/><stop offset="1" stop-color="#5b3be8"/>
          </linearGradient>
        </defs>
      </svg>
      <span class="brand__name">DAYLUNG</span>
    </a>
  `;
}

/* ── Шапка ───────────────────────────────────────────────── */
export function header({ categories = [], activeSlug = null } = {}) {
  const navItems = categories.slice(0, 4).map(
    (c) => html`<a class="nav__a${c.slug === activeSlug ? ' is-on' : ''}" href="/category/${c.slug}">${c.name}</a>`,
  );

  return html`
    <header class="hdr" id="hdr">
      <div class="wrap hdr__in">
        ${logo()}

        <nav class="nav" id="nav" aria-label="Основная навигация">
          ${join(navItems)}
          <a class="nav__a" href="/services">Сервисы</a>
          <a class="nav__a" href="/#how">Как это работает</a>
        </nav>

        <div class="hdr__right">
          <button class="iconbtn" id="themeBtn" type="button" aria-label="Переключить тему">
            <svg class="ic ic--moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.8 6.8 0 0 0 9.7 9.7z"/></svg>
            <svg class="ic ic--sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>
          </button>
          <a class="btn btn--primary btn--s hdr__cta" href="/#ask">Начать</a>
          <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Открыть меню">
            <span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  `;
}

/* ── Футер ───────────────────────────────────────────────── */
export function footer({ categories = [] } = {}) {
  const catLinks = categories.slice(0, 4).map(
    (c) => html`<a href="/category/${c.slug}">${c.name}</a>`,
  );

  return html`
    <footer class="ftr">
      <div class="wrap">
        <div class="ftr__top">
          <div class="ftr__brand">
            ${logo()}
            <p>
              Расскажите, что нужно, — DAYLUNG подберёт подходящие цифровые сервисы,
              покажет варианты рядом и объяснит, почему советует именно их.
            </p>
          </div>

          <nav class="ftr__nav" aria-label="Навигация в подвале">
            <div>
              <h4>Категории</h4>
              ${join(catLinks)}
            </div>
            <div>
              <h4>Продукт</h4>
              <a href="/services">Все сервисы</a>
              <a href="/#how">Как это работает</a>
              <a href="/#trust">Принципы</a>
            </div>
            <div>
              <h4>Проект</h4>
              <a href="/about">О DAYLUNG</a>
              <a href="/admin">Панель управления</a>
            </div>
          </nav>
        </div>

        <div class="ftr__bottom">
          <p>© ${new Date().getFullYear()} ${SITE_NAME}. Демонстрационные данные.</p>
          <div class="ftr__links">
            <a href="/privacy">Конфиденциальность</a>
            <a href="/terms">Условия использования</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

/* ── Карточка категории ──────────────────────────────────── */
export function categoryCard(category, { serviceCount = 0, delay = 0 } = {}) {
  return html`
    <a class="cat reveal" data-d="${delay}" href="/category/${category.slug}">
      <div class="cat__top">
        <span class="cat__ico">${icon(category.icon, { size: 20 })}</span>
        <span class="cat__arrow" aria-hidden="true">↗</span>
      </div>
      <h3>${category.name}</h3>
      <p>${category.tagline}</p>
      <span class="cat__meta">${serviceCount} ${plural(serviceCount, 'сервис', 'сервиса', 'сервисов')}</span>
    </a>
  `;
}

/* ── Карточка сервиса в результатах подбора ──────────────── */
export function serviceCard(service, { match = null, role = null, reasons = [], warnings = [], best = false } = {}) {
  const href = outboundUrl(service);
  const cons = warnings.length ? warnings : (service.cons ?? []);
  const pros = reasons.length ? reasons : (service.pros ?? []);

  return html`
    <article class="svc${best ? ' svc--best' : ''}">
      <div class="svc__main">
        <div class="svc__head">
          <span class="svc__logo" style="--h:${service.logo?.hue ?? 258}">${service.logo?.text ?? service.name[0]}</span>
          <div class="svc__titles">
            <h3><a href="/service/${service.slug}">${service.name}</a></h3>
            <p class="svc__tagline">${role ?? service.tagline}</p>
          </div>
          ${when(match !== null, html`<span class="svc__match"><b>${match}</b>%</span>`)}
        </div>

        <p class="svc__desc">${service.description}</p>

        <div class="svc__cols">
          <div class="svc__col">
            <h4>Плюсы</h4>
            <ul class="svc__list svc__list--pros">
              ${join(pros.slice(0, 3).map((p) => html`<li>${p}</li>`))}
            </ul>
          </div>
          <div class="svc__col">
            <h4>Минусы</h4>
            <ul class="svc__list svc__list--cons">
              ${join(cons.slice(0, 3).map((c) => html`<li>${c}</li>`))}
            </ul>
          </div>
        </div>

        <div class="svc__foot">
          <a class="btn btn--ghost btn--xs" href="/service/${service.slug}">Подробнее</a>
          ${when(href, html`<a class="btn btn--primary btn--xs" href="${href}" rel="nofollow noopener" target="_blank">Перейти на сайт</a>`)}
          ${when(showsDisclosure(service), html`<span class="disclosure">партнёрская ссылка</span>`)}
        </div>
      </div>

      <div class="svc__side">
        <span class="svc__rating">
          ${icon('star', { size: 13, stroke: 0 })}
          ${formatRating(service.rating)}
          <small>/ 5</small>
        </span>
        <span class="svc__price">${service.price}</span>
      </div>
    </article>
  `;
}

/* ── Компактная карточка для каталога ────────────────────── */
export function serviceTile(service, { categoryName = null, delay = 0 } = {}) {
  return html`
    <a class="svc reveal" data-d="${delay}" href="/service/${service.slug}" style="text-decoration:none">
      <div class="svc__main">
        <div class="svc__head">
          <span class="svc__logo" style="--h:${service.logo?.hue ?? 258}">${service.logo?.text ?? service.name[0]}</span>
          <div class="svc__titles">
            <h3>${service.name}</h3>
            <p class="svc__tagline">${service.tagline}</p>
          </div>
        </div>
        <p class="svc__desc">${truncate(service.description, 150)}</p>
        <div class="svc__foot">
          ${when(categoryName, html`<span class="tag">${categoryName}</span>`)}
          <span class="tag tag--acc">${service.price}</span>
        </div>
      </div>
      <div class="svc__side">
        <span class="svc__rating">
          ${icon('star', { size: 13, stroke: 0 })}
          ${formatRating(service.rating)}
          <small>/ 5</small>
        </span>
        <span class="link">Подробнее →</span>
      </div>
    </a>
  `;
}

/* ── Вспомогательные ─────────────────────────────────────── */
function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}

export { plural, truncate };
