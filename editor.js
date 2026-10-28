/**
 * Раздел «Доработка сайта».
 *
 * Три вида ввода, каждый обрабатывается по-своему:
 *  1. текстовая инструкция → разбор в задачи (не исполняется);
 *  2. HTML-компонент      → санитизация по белому списку;
 *  3. JS-модуль           → проверка на опасные конструкции,
 *                            сохраняется в ветку и не подключается.
 *
 * Кнопка «Создать предварительную версию» не трогает рабочий сайт.
 */
import { html, join, when, lazyWhen } from '../../render/html.js';
import { icon } from '../../components/icons.js';
import { adminPage } from './layout.js';

export function renderEditor({
  counts, current, flash,
  values = {},
  parseResult = null,
  componentCheck = null,
  codeCheck = null,
}) {
  const body = html`
    <div class="page-head">
      <div>
        <h1>Доработка сайта</h1>
        <p>
          Опишите изменение словами, вставьте компонент или код.
          Ничего не попадёт на рабочий сайт без вашего подтверждения.
        </p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--ghost btn--s" href="/admin/versions">История версий</a>
      </div>
    </div>

    <div class="safety">
      ${icon('shieldCheck', { size: 18 })}
      <div>
        <b>Изменения создаются как предпросмотр.</b>
        Текстовая инструкция не исполняется как код: сервер разбирает её
        в список задач и показывает вам. HTML проходит санитизацию, JavaScript
        сохраняется в отдельную ветку и не подключается к работающему сайту.
      </div>
    </div>

    <form method="post" action="/admin/editor/analyze" id="editorForm">
      <div class="editor-grid">
        <div>
          <!-- 1. Текстовая инструкция -->
          <div class="panel">
            <div class="panel__head">
              <div>
                <h2>Что вы хотите изменить?</h2>
                <p>Обычными словами. Instructions → задачи, не код.</p>
              </div>
            </div>
            <div class="panel__body">
              <label class="sr-only" for="instruction">Описание изменения</label>
              <textarea
                class="bigfield"
                id="instruction"
                name="instruction"
                placeholder="Например: Добавь категорию «Браузеры» между AI и VPN"
              >${values.instruction ?? ''}</textarea>

              ${lazyWhen(parseResult, () => html`
                <div class="parse-out" style="margin-top:14px">
                  <h4>Разбор запроса</h4>
                  ${join(parseResult.tasks.map((t) => html`
                    <div class="parse-out__task">
                      <span class="parse-out__code">${t.action}</span>
                      <span>${t.description}</span>
                    </div>
                  `))}
                  ${when(parseResult.entities?.length, html`
                    <div style="margin-top:10px;font-size:.79rem;color:var(--tx-3)">
                      Распознанные сущности:
                      ${join(parseResult.entities.map((e) => html`<span class="tag">${e}</span>`))}
                    </div>
                  `)}
                  <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:.77rem;color:var(--tx-3)">
                    Инструкция сохранена как текст. Автоматического исполнения нет.
                  </div>
                </div>
              `)}
            </div>
          </div>

          <!-- 2. Компонент -->
          <div class="panel">
            <div class="panel__head">
              <div>
                <h2>Вставить код компонента</h2>
                <p>HTML из LLM Studio. Проходит санитизацию перед сохранением</p>
              </div>
              <button class="btn btn--ghost btn--xs" type="button" id="insertSample">Вставить пример</button>
            </div>
            <div class="panel__body">
              <div class="codebox">
                <div class="codebox__bar">
                  <span>component.html</span>
                  <span>белый список тегов · без скриптов</span>
                </div>
                <textarea
                  name="component"
                  id="component"
                  spellcheck="false"
                  placeholder="<section class=&quot;card&quot;>&#10;  <h3>Новый блок</h3>&#10;  <p>Описание</p>&#10;</section>"
                >${values.component ?? ''}</textarea>
              </div>

              ${lazyWhen(componentCheck, () => html`
                <div class="msg msg--${componentCheck.warnings.length ? 'warn' : 'ok'}" style="margin-top:14px">
                  ${icon(componentCheck.warnings.length ? 'alert' : 'check', { size: 15 })}
                  <div>
                    <div>${componentCheck.ok ? 'Компонент проверен' : componentCheck.error}</div>
                    ${when(componentCheck.warnings.length, html`
                      <ul>${join(componentCheck.warnings.map((w) => html`<li>${w}</li>`))}</ul>
                    `)}
                  </div>
                </div>
              `)}
            </div>
          </div>

          <!-- 3. JS-модуль -->
          <div class="panel">
            <div class="panel__head">
              <div>
                <h2>JavaScript-модуль</h2>
                <p>Сохраняется в ветку предпросмотра, не исполняется</p>
              </div>
            </div>
            <div class="panel__body">
              <div class="codebox">
                <div class="codebox__bar">
                  <span>module.js</span>
                  <span>статический анализ</span>
                </div>
                <textarea
                  name="code"
                  id="code"
                  spellcheck="false"
                  placeholder="export function mount(el) {&#10;  el.textContent = 'Готово';&#10;}"
                >${values.code ?? ''}</textarea>
              </div>

              ${lazyWhen(codeCheck, () => html`
                <div class="msg msg--${codeCheck.findings.length ? 'warn' : 'ok'}" style="margin-top:14px">
                  ${icon(codeCheck.findings.length ? 'alert' : 'check', { size: 15 })}
                  <div>
                    <div>${codeCheck.ok ? 'Проверка завершена' : codeCheck.error}</div>
                    ${when(codeCheck.findings.length, html`
                      <ul>${join(codeCheck.findings.map((f) => html`<li>${f}</li>`))}</ul>
                    `)}
                    ${when(!codeCheck.findings.length, html`
                      <div style="margin-top:4px">Опасных конструкций не найдено. Код всё равно не подключён к сайту.</div>
                    `)}
                  </div>
                </div>
              `)}
            </div>
          </div>
        </div>

        <!-- Правая колонка -->
        <aside>
          <div class="panel">
            <div class="panel__head"><h2>Публикация</h2></div>
            <div class="panel__body" style="display:flex;flex-direction:column;gap:14px">
              <div class="field">
                <label for="title">Название изменения</label>
                <input class="inp" id="title" name="title" value="${values.title ?? ''}" maxlength="120"
                  placeholder="Добавлена категория Браузеры">
              </div>

              <div class="field">
                <label for="description">Что меняется</label>
                <textarea class="txt" id="description" name="description" rows="3"
                  placeholder="Кратко для истории версий">${values.description ?? ''}</textarea>
              </div>

              <div class="field">
                <label for="type">Тип изменения</label>
                <select class="sel" id="type" name="type">
                  <option value="content">Контент</option>
                  <option value="design">Дизайн</option>
                  <option value="structure">Структура</option>
                  <option value="feature">Функциональность</option>
                </select>
              </div>

              <button class="btn btn--ghost btn--block" type="submit" name="mode" value="analyze">
                ${icon('search', { size: 15 })} Проверить
              </button>

              <button class="btn btn--primary btn--block" type="submit" name="mode" value="preview">
                ${icon('eye', { size: 15 })} Создать предварительную версию
              </button>

              <p style="font-size:.75rem;color:var(--tx-3);line-height:1.5">
                Рабочий сайт останется без изменений. Предпросмотр можно
                проверить и только потом применить.
              </p>
            </div>
          </div>

          <div class="panel">
            <div class="panel__head"><h2>Текущая версия</h2></div>
            <div class="panel__body" style="font-size:.83rem;display:flex;flex-direction:column;gap:10px">
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--tx-3)">Версия</span>
                <span class="verchip"><i></i>${current?.label ?? '—'}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--tx-3)">Всего версий</span>
                <span>${counts.versions ?? 0}</span>
              </div>
              <div style="display:flex;justify-content:space-between">
                <span style="color:var(--tx-3)">В предпросмотре</span>
                <span>${counts.previews ?? 0}</span>
              </div>
              <a class="btn btn--ghost btn--xs" href="/admin/preview" style="margin-top:4px">
                Открыть предпросмотры
              </a>
            </div>
          </div>
        </aside>
      </div>
    </form>
  `;

  return adminPage({
    title: 'Доработка сайта', subtitle: 'Разработка', active: 'editor',
    counts, currentVersion: current, body, flash,
  });
}

/** Список предпросмотров. */
export function renderPreviewList({ previews, current, counts, flash }) {
  const body = html`
    <div class="page-head">
      <div>
        <h1>Предпросмотры</h1>
        <p>Изменения, которые ещё не стали рабочей версией сайта.</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--primary btn--s" href="/admin/editor">Новое изменение</a>
      </div>
    </div>

    ${when(previews.length === 0, html`
      <div class="panel">
        <div class="empty">
          <h3>Предпросмотров нет</h3>
          <p>Создайте изменение в разделе «Доработка сайта» — оно появится здесь.</p>
          <a class="btn btn--primary btn--s" href="/admin/editor">Создать изменение</a>
        </div>
      </div>
    `)}

    ${join(previews.map((p) => html`
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2>${p.title}</h2>
            <p>${p.label} · создан ${new Date(p.createdAt).toLocaleString('ru-RU')} · ${p.author}</p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <a class="btn btn--ghost btn--xs" href="/admin/preview/${p.id}">Сравнить</a>
            <a class="btn btn--ghost btn--xs" href="/preview/${p.id}" target="_blank">Открыть предпросмотр</a>
          </div>
        </div>
        <div class="panel__body">
          <p style="font-size:.87rem;color:var(--tx-2);margin-bottom:12px">${p.description || 'Без описания'}</p>
          ${when(p.instruction, html`
            <div class="parse-out" style="font-size:.82rem">
              <h4>Инструкция владельца</h4>
              <p style="color:var(--tx-2)">${p.instruction}</p>
            </div>
          `)}
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <form method="post" action="/admin/preview/${p.id}/apply">
              <button class="btn btn--primary btn--s" type="submit"
                data-confirm="Применить изменения? Текущая версия уйдёт в резервную копию.">
                ${icon('check', { size: 14 })} Применить изменения
              </button>
            </form>
            <form method="post" action="/admin/preview/${p.id}/discard">
              <button class="btn btn--danger btn--s" type="submit"
                data-confirm="Отменить предпросмотр? Снимок будет удалён.">
                ${icon('x', { size: 14 })} Отменить
              </button>
            </form>
          </div>
        </div>
      </div>
    `))}
  `;

  return adminPage({
    title: 'Предпросмотр', subtitle: 'Разработка', active: 'preview',
    counts, currentVersion: current, body, flash,
  });
}
