/**
 * Список категорий: порядок, вкл/выкл, CRUD.
 */
import { html, join, when } from '../../render/html.js';
import { icon } from '../../components/icons.js';
import { adminPage } from './layout.js';

export function renderCategories({ items, services, counts, current, flash }) {
  const body = html`
    <div class="page-head">
      <div>
        <h1>Категории</h1>
        <p>Порядок в этом списке определяет порядок блоков на главной и в меню.</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--primary btn--s" href="/admin/categories/new">
          ${icon('plus', { size: 15 })} Новая категория
        </a>
      </div>
    </div>

    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>Все категории</h2>
          <p>${items.length} ${items.length === 1 ? 'категория' : 'категорий'}</p>
        </div>
        <span class="tag tag--info">порядок: ↑ ↓</span>
      </div>
      <div class="panel__body panel__body--flush tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th style="width:32px"></th>
              <th>Название</th>
              <th>Описание</th>
              <th>Сервисов</th>
              <th>Статус</th>
              <th style="text-align:right">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${when(items.length === 0, html`
              <tr><td colspan="6">
                <div class="empty">
                  <h3>Категорий пока нет</h3>
                  <p>Создайте первую — она появится на главной странице.</p>
                  <a class="btn btn--primary btn--s" href="/admin/categories/new">Создать категорию</a>
                </div>
              </td></tr>
            `)}

            ${join(items.map((c, i) => html`
              <tr>
                <td class="tbl__drag" style="text-align:center">
                  <form method="post" action="/admin/categories/${c.id}/move" style="display:inline">
                    <input type="hidden" name="dir" value="up">
                    <button type="submit" title="Выше" ${i === 0 ? 'disabled' : ''}
                      style="color:var(--tx-3);font-size:.9rem;line-height:1;padding:2px 4px${i === 0 ? ';opacity:.3' : ''}">↑</button>
                  </form>
                  <form method="post" action="/admin/categories/${c.id}/move" style="display:inline">
                    <input type="hidden" name="dir" value="down">
                    <button type="submit" title="Ниже" ${i === items.length - 1 ? 'disabled' : ''}
                      style="color:var(--tx-3);font-size:.9rem;line-height:1;padding:2px 4px${i === items.length - 1 ? ';opacity:.3' : ''}">↓</button>
                  </form>
                </td>
                <td>
                  <div style="display:flex;align-items:center;gap:9px">
                    <span style="color:var(--acc-2)">${icon(c.icon, { size: 16 })}</span>
                    <div>
                      <div class="tbl__name">${c.name}</div>
                      <div class="tbl__sub">/category/${c.slug}</div>
                    </div>
                  </div>
                </td>
                <td style="max-width:320px;color:var(--tx-2);font-size:.82rem">${c.tagline}</td>
                <td style="font-family:var(--mono)">${services.filter((s) => s.categoryId === c.id).length}</td>
                <td>
                  <span class="tag tag--${c.enabled ? 'ok' : 'warn'}">${c.enabled ? 'включена' : 'выключена'}</span>
                </td>
                <td>
                  <div class="tbl__actions">
                    <form method="post" action="/admin/categories/${c.id}/toggle">
                      <button class="btn btn--ghost btn--xs" type="submit" title="${c.enabled ? 'Выключить' : 'Включить'}">
                        ${icon(c.enabled ? 'eyeOff' : 'eye', { size: 13 })}
                      </button>
                    </form>
                    <a class="btn btn--ghost btn--xs" href="/admin/categories/${c.id}">${icon('edit', { size: 13 })}</a>
                    <form method="post" action="/admin/categories/${c.id}/delete" id="delCat-${c.id}">
                      <button class="btn btn--danger btn--xs" type="submit" title="Удалить"
                        data-confirm="Удалить категорию «${c.name}»? Сервисы внутри останутся в базе без категории.">
                        ${icon('trash', { size: 13 })}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            `))}
          </tbody>
        </table>
      </div>
    </div>

    <div class="safety">
      ${icon('info', { size: 18 })}
      <div>
        Изменения категорий применяются сразу — это работа с данными каталога.
        Изменения кода и структуры страниц идут через <a class="link" href="/admin/editor">Доработку сайта</a>
        и <a class="link" href="/admin/versions">Версии</a>.
      </div>
    </div>
  `;

  return adminPage({
    title: 'Категории', subtitle: 'Контент', active: 'categories',
    counts, currentVersion: current, body, flash,
  });
}

export function renderCategoryForm({ category, action, counts, current, flash, isNew = false }) {
  const c = category ?? { name: '', tagline: '', description: '', icon: 'grid', accent: '#7a5cff', enabled: true, order: 999 };

  const icons = ['grid', 'sparkles', 'shield', 'server', 'briefcase', 'layers', 'code', 'book', 'list', 'settings'];

  const body = html`
    <div class="page-head">
      <div>
        <h1>${isNew ? 'Новая категория' : `Категория: ${c.name}`}</h1>
        <p>${isNew ? 'Появится в меню и на главной странице сразу после сохранения.' : `Слаг: /category/${c.slug}`}</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--ghost btn--s" href="/admin/categories">Назад</a>
        ${when(!isNew, html`<a class="btn btn--ghost btn--s" href="/category/${c.slug}" target="_blank">Открыть на сайте</a>`)}
      </div>
    </div>

    <form method="post" action="${action}">
      <div class="panel">
        <div class="panel__head"><h2>Основное</h2></div>
        <div class="panel__body">
          <div class="form-grid">
            <div class="field field--full">
              <label for="name">Название *</label>
              <input class="inp" id="name" name="name" value="${c.name}" required maxlength="60" placeholder="Например: Браузеры">
              <span class="field__hint">Слаг создаётся автоматически из названия</span>
            </div>

            <div class="field field--full">
              <label for="tagline">Краткое описание</label>
              <input class="inp" id="tagline" name="tagline" value="${c.tagline}" maxlength="160"
                placeholder="AI-сервисы для работы, программирования, учёбы и творчества">
              <span class="field__hint">Показывается на карточке категории</span>
            </div>

            <div class="field field--full">
              <label for="description">Полное описание</label>
              <textarea class="txt" id="description" name="description" maxlength="600" rows="4"
                placeholder="Что сравниваем в этой категории и по каким критериям">${c.description}</textarea>
            </div>

            <div class="field">
              <label for="icon">Иконка</label>
              <select class="sel" id="icon" name="icon">
                ${join(icons.map((i) => html`<option value="${i}" ${i === c.icon ? 'selected' : ''}>${i}</option>`))}
              </select>
            </div>

            <div class="field">
              <label for="accent">Акцентный цвет</label>
              <input class="inp" id="accent" name="accent" type="text" value="${c.accent}" placeholder="#7a5cff" pattern="#[0-9a-fA-F]{6}">
              <span class="field__hint">Формат #rrggbb</span>
            </div>

            <div class="field">
              <label for="order">Порядок</label>
              <input class="inp" id="order" name="order" type="number" value="${c.order ?? 999}" min="1">
            </div>

            <div class="field">
              <label>Статус</label>
              <label class="check" style="padding-top:9px">
                <input type="checkbox" name="enabled" value="1" ${c.enabled ? 'checked' : ''}>
                Категория включена и видна на сайте
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button class="btn btn--primary" type="submit">${isNew ? 'Создать категорию' : 'Сохранить'}</button>
            <a class="btn btn--ghost" href="/admin/categories">Отмена</a>
          </div>
        </div>
      </div>
    </form>
  `;

  return adminPage({
    title: isNew ? 'Новая категория' : 'Редактирование',
    subtitle: 'Контент', active: 'categories',
    counts, currentVersion: current, body, flash,
  });
}
