/**
 * Главная страница.
 *
 * Собирается из секций, каждая — отдельная функция.
 * Порядок секций задан в renderHome() внизу файла:
 * чтобы добавить блок, достаточно вставить вызов.
 */
import { html, raw, join, when } from '../render/html.js';
import { icon } from '../components/icons.js';
import { categoryCard, serviceCard, plural } from '../components/layout.js';
import { page } from './layout.js';
import { sanitizeComponent } from '../security/sanitize.js';

/* ── Секции ──────────────────────────────────────────────── */

function heroSection({ settings, categoryCount, serviceCount }) {
  const examples = settings.site.examples ?? [];

  return html`
  <section class="hero" id="top">
    <div class="hero__aura" aria-hidden="true"></div>
    <div class="hero__grid" aria-hidden="true"></div>

    <div class="wrap hero__in">
      <p class="pill reveal" data-d="0">
        <span class="pill__dot"></span>
        Бета · ${serviceCount} ${plural(serviceCount, 'сервис', 'сервиса', 'сервисов')} в ${categoryCount}
        ${plural(categoryCount, 'категории', 'категориях', 'категориях')}
      </p>

      <h1 class="hero__h reveal" data-d="70">${settings.site.headline}</h1>

      <p class="hero__sub reveal" data-d="140">${settings.site.tagline}</p>

      <form class="search reveal" data-d="200" id="ask" data-ask-form role="search">
        <div class="search__box">
          ${icon('search', { size: 19, class: 'search__ic' })}
          <label class="sr-only" for="askInput">Опишите, что вам нужно</label>
          <input
            class="search__input"
            id="askInput"
            name="q"
            type="text"
            autocomplete="off"
            placeholder="Например: какой VPN лучше для iPhone и стриминга?"
          >
          <button class="btn btn--primary search__btn" type="submit" id="askBtn">Найти</button>
        </div>

        <div class="chips" role="group" aria-label="Быстрые примеры">
          ${join(examples.map((e) => html`<button class="chip" type="button" data-q="${e}">${e}</button>`))}
        </div>

        <p class="search__note">Бесплатно · без регистрации · подбор по данным каталога</p>
      </form>

      <dl class="metrics reveal" data-d="260">
        <div><dt>сервисов в каталоге</dt><dd>${serviceCount}</dd></div>
        <div><dt>категорий</dt><dd>${categoryCount}</dd></div>
        <div><dt>критериев сравнения</dt><dd>12</dd></div>
        <div><dt>стоимость</dt><dd>бесплатно</dd></div>
      </dl>
    </div>
  </section>
  `;
}

function categoriesSection({ categories, services }) {
  const cards = categories.map((cat, i) => {
    const count = services.filter((s) => s.categoryId === cat.id).length;
    return categoryCard(cat, { serviceCount: count, delay: i * 60 });
  });

  return html`
  <section class="sec" id="categories">
    <div class="wrap">
      <header class="sec__head">
        <p class="eyebrow reveal">Категории</p>
        <h2 class="sec__h reveal" data-d="60">С чего начать поиск</h2>
        <p class="sec__lead reveal" data-d="110">
          Выберите направление — или сразу спросите своими словами.
        </p>
      </header>

      <div class="cats">${join(cards)}</div>
    </div>
  </section>
  `;
}

function demoSection({ example, categories }) {
  if (!example || !example.services?.length) {
    return html`
      <section class="sec sec--alt" id="demo">
        <div class="wrap">
          <header class="sec__head">
            <p class="eyebrow reveal">Демонстрация</p>
            <h2 class="sec__h reveal" data-d="60">Так выглядит ответ</h2>
            <p class="sec__lead reveal" data-d="110">
              Добавьте сервисы в админке — и здесь появится пример подбора.
            </p>
          </header>
        </div>
      </section>
    `;
  }

  const cats = new Map(categories.map((c) => [c.id, c]));

  return html`
  <section class="sec sec--alt" id="demo">
    <div class="wrap">
      <header class="sec__head">
        <p class="eyebrow reveal">Демонстрация</p>
        <h2 class="sec__h reveal" data-d="60">Так выглядит ответ</h2>
        <p class="sec__lead reveal" data-d="110">
          Слева — запрос обычными словами, справа — варианты с объяснением выбора.
        </p>
      </header>

      <div class="demo-grid">
        <aside class="demo-query reveal">
          <span class="demo-query__ava" aria-hidden="true">Вы</span>
          <p class="demo-query__text">${example.query}</p>
          <div class="demo-query__meta">
            <span>${icon('clock', { size: 14 })} Ответ за 0,3 секунды</span>
            <span>${icon('layers', { size: 14 })} ${example.categories.map((c) => c.name).join(', ')}</span>
            <span>${icon('shieldCheck', { size: 14 })} Независимое сравнение</span>
          </div>
        </aside>

        <div class="demo-answer reveal" data-d="80">
          <div class="demo-answer__head">
            <span class="demo-badge">
              ${icon('sparkles', { size: 13 })}
              ${example.services.length} ${plural(example.services.length, 'вариант', 'варианта', 'вариантов')}
            </span>
            <span class="tag tag--info">демо-данные</span>
          </div>

          <p class="demo-summary">${example.summary}</p>

          <div class="results">
            ${join(example.services.map((s, i) =>
              serviceCard(s.data, {
                match: s.match,
                role: s.role,
                reasons: s.reasons,
                warnings: s.warnings,
                best: i === 0,
              }),
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
  `;
}

function howSection() {
  return html`
  <section class="sec" id="how">
    <div class="wrap">
      <header class="sec__head">
        <p class="eyebrow reveal">Как это работает</p>
        <h2 class="sec__h reveal" data-d="60">Три шага вместо десяти вкладок</h2>
      </header>

      <ol class="steps">
        <li class="step reveal" data-d="0">
          <span class="step__n">01</span>
          <h3>Опиши задачу</h3>
          <p>Обычными словами: «нужен недорогой AI для Python». Не нужно знать названий сервисов и терминов.</p>
        </li>
        <li class="step reveal" data-d="80">
          <span class="step__n">02</span>
          <h3>DAYLUNG анализирует варианты</h3>
          <p>Определяет категорию, отбирает сервисы по вашим условиям — устройство, бюджет, задачи, уровень подготовки.</p>
        </li>
        <li class="step reveal" data-d="160">
          <span class="step__n">03</span>
          <h3>Получи рекомендацию</h3>
          <p>Несколько вариантов рядом: рейтинг, плюсы, минусы, цена и объяснение, почему именно этот.</p>
        </li>
      </ol>
    </div>
  </section>
  `;
}

function trustSection() {
  const items = [
    {
      icon: 'layers',
      title: 'Несколько вариантов, а не один',
      text: 'Показываем минимум три сервиса в категории. Решение остаётся за вами — мы не подталкиваем к единственному ответу.',
    },
    {
      icon: 'list',
      title: 'Понятные критерии',
      text: 'Каждый сервис оценивается по одной матрице: качество, цена, скорость. Никаких скрытых исключений.',
    },
    {
      icon: 'clock',
      title: 'Актуальные характеристики',
      text: 'Цены и функции хранятся в каталоге и обновляются через админку. Источник данных помечен в каждой карточке.',
    },
    {
      icon: 'info',
      title: 'Объяснение причины',
      text: 'У каждой рекомендации есть блок «Почему»: какие именно требования запроса она закрывает и чего в ней нет.',
    },
  ];

  return html`
  <section class="sec sec--alt" id="trust">
    <div class="wrap">
      <header class="sec__head">
        <p class="eyebrow reveal">Принципы</p>
        <h2 class="sec__h reveal" data-d="60">Почему DAYLUNG можно доверять</h2>
        <p class="sec__lead reveal" data-d="110">
          Мы не скрываем, как устроен подбор, и не выдаём рекламу за совет.
        </p>
      </header>

      <div class="adv">
        ${join(items.map((item, i) => html`
          <article class="card reveal" data-d="${i * 60}">
            <span class="card__ico">${icon(item.icon, { size: 18 })}</span>
            <h3>${item.title}</h3>
            <p>${item.text}</p>
          </article>
        `))}
      </div>
    </div>
  </section>
  `;
}

function ctaSection({ settings }) {
  return html`
  <section class="sec sec--tight">
    <div class="wrap">
      <div class="cta reveal">
        <div class="cta__glow" aria-hidden="true"></div>
        <div class="cta__in">
          <h2>Опишите задачу — подберём варианты</h2>
          <p>Одно предложение обычными словами. Без регистрации и оплаты.</p>
          <form class="cta__form" data-ask-form>
            <label class="sr-only" for="askCta">Что вам нужно</label>
            <input class="cta__input" id="askCta" type="text" name="q" placeholder="Например: хостинг для портфолио до 500 ₽">
            <button class="btn btn--primary" type="submit">Найти</button>
          </form>
        </div>
      </div>
    </div>
  </section>
  `;
}

/** Блоки, добавленные владельцем через «Доработку сайта». */
function customBlocks(blocks) {
  const safe = blocks
    .map((b) => {
      const result = sanitizeComponent(b.html ?? '');
      if (!result.ok || !result.html) return '';
      return `<section class="sec sec--tight"><div class="wrap">${result.html}</div></section>`;
    })
    .filter(Boolean);

  return safe.length ? raw(safe.join('\n')) : raw('');
}

/* ── Сборка страницы ─────────────────────────────────────── */
export function renderHome(data) {
  const { settings, categories, services, example, blocks = [] } = data;

  const body = html`
    ${heroSection({ settings, categoryCount: categories.length, serviceCount: services.length })}
    ${categoriesSection({ categories, services })}
    ${demoSection({ example, categories })}
    ${howSection()}
    ${trustSection()}
    ${customBlocks(blocks)}
    ${ctaSection({ settings })}
  `;

  return page({
    title: '',
    description: settings.site.tagline,
    body,
    categories,
  });
}
