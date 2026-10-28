/**
 * Управление сервисами.
 */
import { html, join, when } from '../../render/html.js';
import { icon } from '../../components/icons.js';
import { adminPage } from './layout.js';
import { formatRating } from '../../util/format.js';

export function renderServices({ items, categories, counts, current, flash, filter = 'all' }) {
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const filtered = filter === 'published'
    ? items.filter((s) => s.published)
    : filter === 'drafts'
      ? items.filter((s) => !s.published)
      : items;

  const body = html`
    <div class="page-head">
      <div>
        <h1>Сервисы</h1>
        <p>Каталог, из которого DAYLUNG собирает рекомендации.</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--primary btn--s" href="/admin/services/new">
          ${icon('plus', { size: 15 })} Новый сервис
        </a>
      </div>
    </div>

    <div class="tabs" role="tablist">
      <a class="tabs__btn${filter === 'all' ? ' is-on' : ''}" href="/admin/services">Все (${items.length})</a>
      <a class="tabs__btn${filter === 'published' ? ' is-on' : ''}" href="/admin/services?filter=published">Опубликованы (${items.filter((s) => s.published).length})</a>
      <a class="tabs__btn${filter === 'drafts' ? ' is-on' : ''}" href="/admin/services?filter=drafts">Черновики (${items.filter((s) => !s.published).length})</a>
    </div>

    <div class="panel">
      <div class="panel__body panel__body--flush tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Сервис</th>
              <th>Категория</th>
              <th>Цена</th>
              <th>Рейтинг</th>
              <th>Ссылки</th>
              <th>Статус</th>
              <th style="text-align:right">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${when(filtered.length === 0, html`
              <tr><td colspan="7">
                <div class="empty">
                  <h3>Сервисов нет</h3>
                  <p>Добавьте первый сервис — он появится в каталоге и в подборе.</p>
                  <a class="btn btn--primary btn--s" href="/admin/services/new">Добавить сервис</a>
                </div>
              </td></tr>
            `)}

            ${join(filtered.map((s) => html`
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:9px">
                    <span class="svc__logo" style="--h:${s.logo?.hue ?? 258};width:28px;height:28px;font-size:.75rem;border-radius:8px">
                      ${s.logo?.text ?? s.name[0]}
                    </span>
                    <div>
                      <div class="tbl__name">${s.name}</div>
                      <div class="tbl__sub">${s.slug}</div>
                    </div>
                  </div>
                </td>
                <td>${catMap.get(s.categoryId)?.name ?? '—'}</td>
                <td style="white-space:nowrap">${s.price}</td>
                <td>${formatRating(s.rating)}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    ${when(s.url, html`<span class="tag tag--ok" title="официальный сайт">off</span>`)}
                    ${when(s.affiliateUrl, html`<span class="tag tag--acc" title="партнёрская ссылка">aff</span>`)}
                    ${when(!s.url && !s.affiliateUrl, html`<span class="tag tag--warn">нет</span>`)}
                  </div>
                </td>
                <td>
                  <span class="tag tag--${s.published ? 'ok' : 'warn'}">${s.published ? 'опубликован' : 'черновик'}</span>
                </td>
                <td>
                  <div class="tbl__actions">
                    <form method="post" action="/admin/services/${s.id}/toggle">
                      <button class="btn btn--ghost btn--xs" type="submit" title="${s.published ? 'Снять с публикации' : 'Опубликовать'}">
                        ${icon(s.published ? 'eyeOff' : 'eye', { size: 13 })}
                      </button>
                    </form>
                    <a class="btn btn--ghost btn--xs" href="/admin/services/${s.id}">${icon('edit', { size: 13 })}</a>
                    <form method="post" action="/admin/services/${s.id}/delete">
                      <button class="btn btn--danger btn--xs" type="submit"
                        data-confirm="Удалить сервис «${s.name}»?">${icon('trash', { size: 13 })}</button>
                    </form>
                  </div>
                </td>
              </tr>
            `))}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return adminPage({
    title: 'Сервисы', subtitle: 'Контент', active: 'services',
    counts, currentVersion: current, body, flash,
  });
}

export function renderServiceForm({ service, categories, action, counts, current, flash, isNew = false }) {
  const s = service ?? {
    name: '', categoryId: categories[0]?.id ?? '', tagline: '', description: '',
    price: '', priceValue: 0, rating: 0, pros: [], cons: [], platforms: [],
    metrics: { quality: 75, price: 75, speed: 75 }, url: '', affiliateUrl: '',
    published: true, featured: false, logo: { text: '', hue: 258 },
  };

  const platforms = [
    ['web', 'браузер'], ['ios', 'iOS'], ['android', 'Android'], ['macos', 'macOS'],
    ['windows', 'Windows'], ['linux', 'Linux'], ['vscode', 'VS Code'],
    ['jetbrains', 'JetBrains'], ['github', 'GitHub'], ['gitlab', 'GitLab'],
  ];

  const body = html`
    <div class="page-head">
      <div>
        <h1>${isNew ? 'Новый сервис' : `Сервис: ${s.name}`}</h1>
        <p>${isNew ? 'Появится в каталоге после сохранения.' : `Страница: /service/${s.slug}`}</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--ghost btn--s" href="/admin/services">Назад</a>
        ${when(!isNew, html`<a class="btn btn--ghost btn--s" href="/service/${s.slug}" target="_blank">Открыть на сайте</a>`)}
      </div>
    </div>

    <form method="post" action="${action}">
      <div class="panel">
        <div class="panel__head"><h2>Основное</h2></div>
        <div class="panel__body">
          <div class="form-grid">
            <div class="field">
              <label for="name">Название *</label>
              <input class="inp" id="name" name="name" value="${s.name}" required maxlength="60" placeholder="Aurora VPN">
            </div>

            <div class="field">
              <label for="categoryId">Категория *</label>
              <select class="sel" id="categoryId" name="categoryId" required>
                ${join(categories.map((c) => html`
                  <option value="${c.id}" ${c.id === s.categoryId ? 'selected' : ''}>${c.name}</option>
                `))}
              </select>
            </div>

            <div class="field field--full">
              <label for="tagline">Подзаголовок</label>
              <input class="inp" id="tagline" name="tagline" value="${s.tagline}" maxlength="120"
                placeholder="Быстрый VPN для стриминга и поездок">
            </div>

            <div class="field field--full">
              <label for="description">Описание</label>
              <textarea class="txt" id="description" name="description" rows="4"
                placeholder="Для кого подходит, чем отличается, что важно знать">${s.description}</textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h2>Цена и рейтинг</h2>
            <p>Число цены используется при сортировке по бюджету</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="form-grid">
            <div class="field">
              <label for="price">Цена (как показывать)</label>
              <input class="inp" id="price" name="price" value="${s.price}" placeholder="от 480 ₽ / мес">
            </div>

            <div class="field">
              <label for="priceValue">Цена в рублях (число)</label>
              <input class="inp" id="priceValue" name="priceValue" type="number" min="0" step="1" value="${s.priceValue ?? 0}">
              <span class="field__hint">Только для сравнения — на сайте не показывается</span>
            </div>

            <div class="field">
              <label for="rating">Рейтинг (0–5)</label>
              <input class="inp" id="rating" name="rating" type="number" min="0" max="5" step="0.1" value="${s.rating ?? 0}">
            </div>

            <div class="field">
              <label for="logoHue">Оттенок логотипа (0–360)</label>
              <input class="inp" id="logoHue" name="logoHue" type="number" min="0" max="360" value="${s.logo?.hue ?? 258}">
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h2>Плюсы и минусы</h2>
            <p>По одному пункту на строку. Минусы обязательны — это принцип проекта</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="form-grid">
            <div class="field">
              <label for="pros">Преимущества</label>
              <textarea class="txt txt--mono" id="pros" name="pros" rows="5" placeholder="Стабильные 4K&#10;Поддержка на русском">${(s.pros ?? []).join('\n')}</textarea>
            </div>

            <div class="field">
              <label for="cons">Недостатки</label>
              <textarea class="txt txt--mono" id="cons" name="cons" rows="5" placeholder="Дороже среднего&#10;Нет бесплатного тарифа">${(s.cons ?? []).join('\n')}</textarea>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h2>Оценки по критериям</h2>
            <p>От 0 до 100. Используются в подборе и сравнении</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="form-grid">
            <div class="field">
              <label for="metricQuality">Качество</label>
              <input class="inp" id="metricQuality" name="metricQuality" type="number" min="0" max="100" value="${s.metrics?.quality ?? 75}">
            </div>
            <div class="field">
              <label for="metricPrice">Цена (100 = дешёвый)</label>
              <input class="inp" id="metricPrice" name="metricPrice" type="number" min="0" max="100" value="${s.metrics?.price ?? 75}">
            </div>
            <div class="field">
              <label for="metricSpeed">Скорость</label>
              <input class="inp" id="metricSpeed" name="metricSpeed" type="number" min="0" max="100" value="${s.metrics?.speed ?? 75}">
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head"><h2>Платформы</h2></div>
        <div class="panel__body">
          <div style="display:flex;flex-wrap:wrap;gap:12px 20px">
            ${join(platforms.map(([value, label]) => html`
              <label class="check">
                <input type="checkbox" name="platforms" value="${value}"
                  ${(s.platforms ?? []).includes(value) ? 'checked' : ''}>
                ${label}
              </label>
            `))}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h2>Ссылки</h2>
            <p>Официальная — для всех. Партнёрская подставляется автоматически, если задана</p>
          </div>
        </div>
        <div class="panel__body">
          <div class="form-grid">
            <div class="field field--full">
              <label for="url">Официальный сайт</label>
              <input class="inp" id="url" name="url" type="url" value="${s.url}" placeholder="https://example.com/service">
            </div>

            <div class="field field--full">
              <label for="affiliateUrl">Партнёрская ссылка</label>
              <input class="inp" id="affiliateUrl" name="affiliateUrl" type="url" value="${s.affiliateUrl}" placeholder="https://example.com/ref?id=...">
              <span class="field__hint">
                Пока пусто — используется официальная. Переходы считаются через /go/:id.
                Отключается переменной AFFILIATE_TRACKING.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head"><h2>Публикация</h2></div>
        <div class="panel__body">
          <div style="display:flex;flex-direction:column;gap:12px">
            <label class="check">
              <input type="checkbox" name="published" value="1" ${s.published ? 'checked' : ''}>
              Опубликован — виден в каталоге и участвует в подборе
            </label>
            <label class="check">
              <input type="checkbox" name="featured" value="1" ${s.featured ? 'checked' : ''}>
              Выделить на главной странице
            </label>
          </div>

          <div class="form-actions">
            <button class="btn btn--primary" type="submit">${isNew ? 'Создать сервис' : 'Сохранить'}</button>
            <a class="btn btn--ghost" href="/admin/services">Отмена</a>
          </div>
        </div>
      </div>
    </form>
  `;

  return adminPage({
    title: isNew ? 'Новый сервис' : 'Редактирование',
    subtitle: 'Контент', active: 'services',
    counts, currentVersion: current, body, flash,
  });
}
