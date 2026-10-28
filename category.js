/**
 * Страница категории и каталог всех сервисов.
 */
import { html, join, when } from '../render/html.js';
import { icon } from '../components/icons.js';
import { serviceTile, plural } from '../components/layout.js';
import { page } from './layout.js';

export function renderCategory({ category, services, categories }) {
  const body = html`
    <section class="sec sec--tight">
      <div class="wrap">
        <nav class="ftr__links" style="margin-bottom:18px;font-size:.82rem;color:var(--tx-3)">
          <a href="/">Главная</a>
          <span>/</span>
          <span>${category.name}</span>
        </nav>

        <header class="sec__head sec__head--left">
          <span class="cat__ico" style="margin-bottom:14px">${icon(category.icon, { size: 20 })}</span>
          <h1 class="sec__h" style="margin-bottom:10px">${category.name}</h1>
          <p class="sec__lead">${category.description || category.tagline}</p>
        </header>

        <div class="results" style="margin-bottom:24px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <span class="tag tag--acc">
              ${services.length} ${plural(services.length, 'сервис', 'сервиса', 'сервисов')}
            </span>
            <a class="link" href="/#ask">Не нашли подходящий — спросите DAYLUNG →</a>
          </div>
        </div>

        ${when(services.length === 0, html`
          <div class="card" style="text-align:center;padding:44px 24px">
            <h3 style="margin-bottom:8px">В категории пока нет сервисов</h3>
            <p style="color:var(--tx-2);font-size:.9rem">
              Добавьте их в <a class="link" href="/admin/services">админ-панели</a>.
            </p>
          </div>
        `)}

        <div class="results">
          ${join(services.map((s, i) => serviceTile(s, { delay: i * 50 })))}
        </div>
      </div>
    </section>

    <section class="sec sec--tight sec--alt">
      <div class="wrap">
        <div class="cta">
          <div class="cta__glow" aria-hidden="true"></div>
          <div class="cta__in">
            <h2>Опишите задачу точнее</h2>
            <p>DAYLUNG сравнит варианты из этой категории под ваши условия.</p>
            <form class="cta__form" data-ask-form>
              <label class="sr-only" for="askCat">Что вам нужно</label>
              <input class="cta__input" id="askCat" type="text" name="q" placeholder="Например: нужен сервис для небольшой команды">
              <button class="btn btn--primary" type="submit">Найти</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;

  return page({
    title: category.name,
    description: category.description || category.tagline,
    body,
    categories,
    activeSlug: category.slug,
  });
}

export function renderServices({ services, categories }) {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const grouped = categories
    .map((cat) => ({
      category: cat,
      items: services.filter((s) => s.categoryId === cat.id),
    }))
    .filter((g) => g.items.length);

  const body = html`
    <section class="sec sec--tight">
      <div class="wrap">
        <header class="sec__head sec__head--left">
          <p class="eyebrow">Каталог</p>
          <h1 class="sec__h">Все сервисы</h1>
          <p class="sec__lead">
            ${services.length} ${plural(services.length, 'сервис', 'сервиса', 'сервисов')} в
            ${categories.length} ${plural(categories.length, 'категории', 'категориях', 'категориях')}.
            Данные демонстрационные.
          </p>
        </header>

        ${join(grouped.map((g) => html`
          <div style="margin-bottom:40px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
              <h2 style="font-size:1.15rem">${g.category.name}</h2>
              <a class="link" href="/category/${g.category.slug}">Вся категория →</a>
            </div>
            <div class="results">
              ${join(g.items.map((s, i) => serviceTile(s, { delay: i * 40 })))}
            </div>
          </div>
        `))}
      </div>
    </section>
  `;

  return page({
    title: 'Все сервисы',
    description: 'Каталог цифровых сервисов DAYLUNG',
    body,
    categories,
  });
}
