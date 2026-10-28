/**
 * Сравнение текущей и предварительной версии + страница версий.
 */
import { html, join, when } from '../../render/html.js';
import { icon } from '../../components/icons.js';
import { adminPage } from './layout.js';
import { formatDateTime, relativeTime } from '../../util/format.js';

/** Сводка по снимку: сколько чего было. */
function summarize(snapshot) {
  if (!snapshot?.tables) return null;
  const t = snapshot.tables;
  return {
    categories: Array.isArray(t.categories) ? t.categories.length : 0,
    services: Array.isArray(t.services) ? t.services.length : 0,
    recommendations: Array.isArray(t.recommendations) ? t.recommendations.length : 0,
    takenAt: snapshot.takenAt,
  };
}

export function renderPreviewCompare({
  version, currentSnapshot, previewInfo, current, counts, flash,
}) {
  const before = summarize(currentSnapshot);
  const after = previewInfo?.after ?? null;

  const rows = [
    { label: 'Категорий', before: before?.categories, after: after?.categories },
    { label: 'Сервисов', before: before?.services, after: after?.services },
    { label: 'Рекомендаций', before: before?.recommendations, after: after?.recommendations },
  ];

  const body = html`
    <div class="page-head">
      <div>
        <h1>Сравнение версий</h1>
        <p>Слева — то, что работает сейчас. Справа — что будет после применения.</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--ghost btn--s" href="/admin/preview">Назад</a>
      </div>
    </div>

    <div class="compare">
      <div class="compare__col">
        <div class="compare__head">
          <span>Текущая версия</span>
          <span class="verchip"><i></i>${current?.label ?? '—'}</span>
        </div>
        <div class="compare__body">
          ${join(rows.map((r) => html`
            <div class="compare__row"><span>${r.label}</span><b>${r.before ?? '—'}</b></div>
          `))}
          <div class="compare__row">
            <span>Снимок сделан</span>
            <span>${before ? formatDateTime(before.takenAt) : '—'}</span>
          </div>
        </div>
      </div>

      <div class="compare__col compare__col--new">
        <div class="compare__head">
          <span>Предпросмотр новой версии</span>
          <span class="tag tag--warn">не применено</span>
        </div>
        <div class="compare__body">
          ${join(rows.map((r) => {
            const changed = r.before !== r.after && r.after !== undefined;
            return html`
              <div class="compare__row">
                <span>${r.label}</span>
                <b class="${changed ? 'compare__diff' : ''}">${r.after ?? r.before ?? '—'}</b>
              </div>
            `;
          }))}
          <div class="compare__row">
            <span>Заголовок</span>
            <span>${version.title}</span>
          </div>
          <div class="compare__row">
            <span>Тип</span>
            <span>${version.type}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>${version.title}</h2>
          <p>${version.label} · ${formatDateTime(version.createdAt)} · автор ${version.author}</p>
        </div>
      </div>
      <div class="panel__body">
        <p style="font-size:.88rem;color:var(--tx-2);margin-bottom:16px">${version.description || 'Без описания'}</p>

        ${when(version.instruction, html`
          <div class="parse-out" style="margin-bottom:16px">
            <h4>Инструкция владельца</h4>
            <p style="color:var(--tx-2);font-size:.85rem">${version.instruction}</p>
            <div style="margin-top:10px;font-size:.75rem;color:var(--tx-3)">
              Сохранено как текст. На сервере не исполнялось.
            </div>
          </div>
        `)}

        ${when(version.componentHtml, html`
          <div style="margin-bottom:16px">
            <h4 style="font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);margin-bottom:10px">
              Компонент после санитизации
            </h4>
            <div style="padding:16px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-m)">
              ${when(previewInfo?.safeComponentHtml, html`
                <div style="font-size:.85rem;color:var(--tx-2)">
                  Компонент прошёл проверку. Теги вне белого списка удалены.
                </div>
              `)}
            </div>
            <details style="margin-top:10px">
              <summary style="font-size:.8rem;color:var(--tx-3);cursor:pointer">Показать исходный текст</summary>
              <pre style="margin-top:8px;padding:12px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-s);overflow-x:auto;font-size:.76rem;font-family:var(--mono);color:var(--tx-2)">${version.componentHtml}</pre>
            </details>
          </div>
        `)}

        ${when(version.code, html`
          <div style="margin-bottom:16px">
            <h4 style="font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);margin-bottom:8px">
              JavaScript-модуль
            </h4>
            <div class="msg msg--warn" style="font-size:.8rem">
              ${icon('alert', { size: 15 })}
              <span>Код не подключён к сайту. Он сохранён как файл и требует отдельного деплоя после ревью.</span>
            </div>
            <pre style="margin-top:10px;padding:12px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-s);overflow-x:auto;font-size:.76rem;font-family:var(--mono);color:var(--tx-2);max-height:260px">${version.code}</pre>
          </div>
        `)}

        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:16px;border-top:1px solid var(--line)">
          <form method="post" action="/admin/preview/${version.id}/apply">
            <button class="btn btn--primary" type="submit"
              data-confirm="Применить изменения к рабочему сайту? Текущая версия будет сохранена в резервную копию.">
              ${icon('check', { size: 15 })} Применить изменения
            </button>
          </form>
          <form method="post" action="/admin/preview/${version.id}/discard">
            <button class="btn btn--danger" type="submit"
              data-confirm="Отменить предпросмотр? Снимок будет удалён безвозвратно.">
              ${icon('x', { size: 15 })} Отменить
            </button>
          </form>
          <a class="btn btn--ghost" href="/preview/${version.id}" target="_blank">
            ${icon('external', { size: 15 })} Открыть сайт в этой версии
          </a>
        </div>
      </div>
    </div>
  `;

  return adminPage({
    title: 'Сравнение версий', subtitle: `Предпросмотр ${version.label}`, active: 'preview',
    counts, currentVersion: current, body, flash,
  });
}

export function renderVersions({ versions, current, counts, backups, flash }) {
  const body = html`
    <div class="page-head">
      <div>
        <h1>История версий</h1>
        <p>Каждое применённое изменение фиксируется. Любую версию со снимком можно восстановить.</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--primary btn--s" href="/admin/editor">Новое изменение</a>
      </div>
    </div>

    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi">
        <div class="kpi__label">${icon('history', { size: 14 })} Всего версий</div>
        <div class="kpi__value">${versions.length}</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">${icon('check', { size: 14 })} В рабочей ветке</div>
        <div class="kpi__value">${current?.label ?? '—'}</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">${icon('shieldCheck', { size: 14 })} Резервных копий</div>
        <div class="kpi__value">${backups.length}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel__head">
        <div>
          <h2>Все версии</h2>
          <p>От новых к старым</p>
        </div>
      </div>
      <div class="panel__body panel__body--flush">
        ${when(versions.length === 0, html`
          <div class="empty"><p>Версий пока нет.</p></div>
        `)}

        ${join(versions.map((v) => html`
          <div class="ver">
            <span class="ver__label">${v.label}</span>
            <div>
              <div class="ver__title">${v.title}</div>
              <div class="ver__desc">${v.description}</div>
              <div class="ver__meta">
                <span>${formatDateTime(v.createdAt)}</span>
                <span>${v.author}</span>
                <span class="tag tag--${
                  v.status === 'applied' ? 'ok'
                  : v.status === 'preview' ? 'warn'
                  : 'info'}">${
                  v.status === 'applied' ? 'рабочая'
                  : v.status === 'preview' ? 'предпросмотр'
                  : 'архив'}</span>
                ${when(v.restoredFrom, html`<span class="tag">откат</span>`)}
              </div>
            </div>
            <div class="ver__actions">
              ${when(v.status === 'preview', html`
                <a class="btn btn--ghost btn--xs" href="/admin/preview/${v.id}">Проверить</a>
              `)}
              ${when(v.status === 'archived' && v.restoreable, html`
                <form method="post" action="/admin/versions/${v.id}/restore">
                  <button class="btn btn--ghost btn--xs" type="submit"
                    data-confirm="Восстановить версию ${v.label}? Текущее состояние уйдёт в резервную копию.">
                    Восстановить
                  </button>
                </form>
              `)}
              ${when(v.status === 'archived' && !v.restoreable, html`
                <button class="btn btn--ghost btn--xs" type="button" disabled
                  title="Невозможно восстановить эту версию: сохранённый снимок отсутствует">
                  Недоступно
                </button>
              `)}
            </div>
          </div>
        `))}
      </div>
    </div>

    ${when(backups.length, html`
      <div class="panel">
        <div class="panel__head">
          <div>
            <h2>Резервные копии</h2>
            <p>Создаются автоматически перед каждым применением и откатом</p>
          </div>
        </div>
        <div class="panel__body" style="font-size:.82rem;color:var(--tx-3);display:flex;flex-direction:column;gap:6px">
          ${join(backups.slice(0, 8).map((b) => html`
            <div style="display:flex;justify-content:space-between;gap:10px;font-family:var(--mono);font-size:.75rem">
              <span>${b.file}</span>
            </div>
          `))}
        </div>
      </div>
    `)}
  `;

  return adminPage({
    title: 'Версии', subtitle: 'Разработка', active: 'versions',
    counts, currentVersion: current, body, flash,
  });
}
