/**
 * Dashboard — сводка по проекту.
 */
import { html, join, when } from '../../render/html.js';
import { icon } from '../../components/icons.js';
import { adminPage } from './layout.js';
import { relativeTime, formatNumber } from '../../util/format.js';

export function renderDashboard(data) {
  const {
    counts, categories, services, versions, current, recentServices,
    aiProvider, affiliate, backups, clickStats, flash,
  } = data;

  const kpis = [
    { key: 'categories', label: 'Категории', value: counts.categories, hint: `${counts.categoriesEnabled} включены`, icon: 'grid', href: '/admin/categories' },
    { key: 'services', label: 'Сервисы', value: counts.services, hint: `${counts.servicesPublished} опубликованы`, icon: 'layers', href: '/admin/services' },
    { key: 'recommendations', label: 'Рекомендации', value: counts.recommendations, hint: 'опубликованные подборки', icon: 'sparkles', href: '/admin/recommendations' },
    { key: 'versions', label: 'Версии', value: counts.versions, hint: `${counts.previews} в предпросмотре`, icon: 'history', href: '/admin/versions' },
  ];

  const body = html`
    <div class="page-head">
      <div>
        <h1>Обзор проекта</h1>
        <p>Состояние каталога, версии и подготовка к подключению AI.</p>
      </div>
      <div class="page-head__actions">
        <a class="btn btn--ghost btn--s" href="/" target="_blank">Открыть сайт</a>
        <a class="btn btn--primary btn--s" href="/admin/editor">Доработка сайта</a>
      </div>
    </div>

    <div class="kpis">
      ${join(kpis.map((k) => html`
        <a class="kpi" href="${k.href}">
          <div class="kpi__label">${icon(k.icon, { size: 14 })} ${k.label}</div>
          <div class="kpi__value">${formatNumber(k.value)}</div>
          <div class="kpi__hint">${k.hint}</div>
        </a>
      `))}
    </div>

    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start" class="dash-grid">
      <div>
        <div class="panel">
          <div class="panel__head">
            <div>
              <h2>Последние изменения</h2>
              <p>История версий проекта</p>
            </div>
            <a class="btn btn--ghost btn--xs" href="/admin/versions">Все версии</a>
          </div>
          <div class="panel__body panel__body--flush">
            ${versions.length === 0
              ? html`<div class="empty"><p>Изменений пока не было.</p></div>`
              : join(versions.slice(0, 5).map((v) => html`
                <div class="ver">
                  <span class="ver__label">${v.label}</span>
                  <div>
                    <div class="ver__title">${v.title}</div>
                    <div class="ver__desc">${v.description}</div>
                    <div class="ver__meta">
                      <span>${relativeTime(v.createdAt)}</span>
                      <span>${v.author}</span>
                      <span class="tag tag--${v.status === 'applied' ? 'ok' : v.status === 'preview' ? 'warn' : 'info'}">${statusLabel(v.status)}</span>
                    </div>
                  </div>
                  <div class="ver__actions">
                    ${when(v.status === 'preview', html`<a class="btn btn--ghost btn--xs" href="/admin/preview/${v.id}">Проверить</a>`)}
                  </div>
                </div>
              `))}
          </div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <div>
              <h2>Сервисы в каталоге</h2>
              <p>Сначала по рейтингу</p>
            </div>
            <a class="btn btn--ghost btn--xs" href="/admin/services">Управлять</a>
          </div>
          <div class="panel__body panel__body--flush tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Сервис</th>
                  <th>Категория</th>
                  <th>Рейтинг</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                ${join(recentServices.slice(0, 6).map((s) => html`
                  <tr>
                    <td>
                      <div class="tbl__name">${s.name}</div>
                      <div class="tbl__sub">${s.slug}</div>
                    </td>
                    <td>${s.categoryName}</td>
                    <td>${s.rating.toFixed(1)}</td>
                    <td>
                      <span class="tag tag--${s.published ? 'ok' : 'warn'}">${s.published ? 'опубликован' : 'черновик'}</span>
                    </td>
                  </tr>
                `))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside>
        <div class="panel">
          <div class="panel__head"><h2>Состояние системы</h2></div>
          <div class="panel__body" style="font-size:.83rem;display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="color:var(--tx-3)">Версия сайта</span>
              <span class="verchip"><i></i>${current?.label ?? '—'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="color:var(--tx-3)">AI-провайдер</span>
              <span>${aiProvider.active}${when(aiProvider.fallback, html` <span class="tag tag--warn">fallback</span>`)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="color:var(--tx-3)">API-ключ</span>
              <span>${aiProvider.hasKey ? 'задан' : 'не задан'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="color:var(--tx-3)">Партнёрские ссылки</span>
              <span>${affiliate.trackingEnabled ? 'через /go/' : 'прямые'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="color:var(--tx-3)">Переходов всего</span>
              <span>${formatNumber(clickStats.total)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:10px">
              <span style="color:var(--tx-3)">Резервных копий</span>
              <span>${backups.length}</span>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel__head"><h2>Категории</h2></div>
          <div class="panel__body" style="display:flex;flex-direction:column;gap:9px">
            ${join(categories.map((c) => html`
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:.84rem">
                <span style="display:flex;align-items:center;gap:8px">
                  ${icon(c.icon, { size: 15 })}
                  ${c.name}
                </span>
                <span style="color:var(--tx-3);font-family:var(--mono);font-size:.76rem">
                  ${services.filter((s) => s.categoryId === c.id).length}
                </span>
              </div>
            `))}
          </div>
        </div>

        <div class="safety">
          ${icon('shieldCheck', { size: 18 })}
          <div>
            <b>Изменения не попадают на сайт сразу.</b>
            Любая правка сначала создаёт предпросмотр, и только после вашего
            подтверждения становится рабочей версией.
          </div>
        </div>
      </aside>
    </div>
  `;

  return adminPage({
    title: 'Dashboard',
    subtitle: 'Обзор',
    active: 'dashboard',
    counts,
    currentVersion: current,
    body,
    flash,
  });
}

function statusLabel(status) {
  const map = {
    applied: 'применена',
    preview: 'предпросмотр',
    archived: 'архив',
    draft: 'черновик',
  };
  return map[status] ?? status;
}
