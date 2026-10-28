/**
 * Страница результатов подбора: /search?q=...
 */
import { html, join, when } from '../render/html.js';
import { icon } from '../components/icons.js';
import { serviceCard, plural } from '../components/layout.js';
import { page } from './layout.js';

export function renderSearch({ query, result, categories }) {
  const hasServices = result.services?.length > 0;

  const body = html`
    <section class="sec sec--tight">
      <div class="wrap">
        <nav class="ftr__links" style="margin-bottom:18px;font-size:.82rem;color:var(--tx-3)">
          <a href="/">Главная</a>
          <span>/</span>
          <span>Подбор</span>
        </nav>

        <div class="demo-grid">
          <aside class="demo-query">
            <span class="demo-query__ava" aria-hidden="true">Вы</span>
            <p class="demo-query__text">${query}</p>
            <div class="demo-query__meta">
              <span>${icon('layers', { size: 14 })} ${result.categories.map((c) => c.name).join(', ') || '—'}</span>
              <span>${icon('settings', { size: 14 })} провайдер: ${result.provider}</span>
              <span>${icon('shieldCheck', { size: 14 })} без оплаты и регистрации</span>
            </div>
            <a class="btn btn--ghost btn--s btn--block" href="/" style="margin-top:16px">Изменить запрос</a>
          </aside>

          <div>
            <div class="demo-answer__head">
              <span class="demo-badge">
                ${icon('sparkles', { size: 13 })}
                ${hasServices
                  ? `${result.services.length} ${plural(result.services.length, 'вариант', 'варианта', 'вариантов')}`
                  : 'Нет подходящих вариантов'}
              </span>
              ${when(result.fallbackReason, html`<span class="tag tag--warn">${result.fallbackReason}</span>`)}
            </div>

            <p class="demo-summary">${result.summary}</p>

            ${when(result.note, html`
              <div class="msg msg--info" style="font-size:.8rem">
                ${icon('info', { size: 15 })}
                <span>${result.note}</span>
              </div>
            `)}

            ${when(hasServices, html`
              <div class="results">
                ${join(result.services.map((s, i) => serviceCard(s.data, {
                  match: s.match,
                  role: s.role,
                  reasons: s.reasons,
                  warnings: s.warnings,
                  best: i === 0,
                })))}
              </div>

              <div style="margin-top:26px">
                <h2 style="font-size:1.02rem;margin-bottom:12px">Сравнение по критериям</h2>
                <div class="panel">
                  <div class="panel__body">
                    ${join(result.comparison.map((row) => html`
                      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:.83rem">
                        <span style="width:86px;flex-shrink:0;color:var(--tx-2)">${row.label}</span>
                        <div style="flex:1;display:flex;gap:6px">
                          ${join(row.values.map((v) => {
                            const svc = result.services.find((s) => s.id === v.serviceId);
                            return html`
                              <i title="${svc?.name ?? ''}: ${v.value}"
                                 style="flex:1;height:26px;border-radius:6px;position:relative;overflow:hidden;background:var(--surf-3)">
                                <i style="position:absolute;inset:0 auto 0 0;width:${v.value}%;background:linear-gradient(90deg,var(--acc),var(--acc-2));opacity:.75"></i>
                                <span style="position:absolute;inset:0;display:grid;place-items:center;font-size:.7rem;font-family:var(--mono);color:var(--tx)">${v.value}</span>
                              </i>
                            `;
                          }))}
                        </div>
                      </div>
                    `))}
                    <div style="display:flex;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:.74rem;color:var(--tx-3);flex-wrap:wrap">
                      ${join(result.services.map((s) => html`<span style="flex:1;text-align:center">${s.name}</span>`))}
                    </div>
                  </div>
                </div>
              </div>
            `)}

            ${when(!hasServices, html`
              <div class="card" style="text-align:center;padding:40px 24px">
                <h3 style="margin-bottom:8px">По этому запросу ничего не нашлось</h3>
                <p style="color:var(--tx-2);font-size:.89rem;margin-bottom:18px">
                  Попробуйте описать задачу иначе или посмотрите категории.
                </p>
                <a class="btn btn--ghost btn--s" href="/#categories">Все категории</a>
              </div>
            `)}
          </div>
        </div>
      </div>
    </section>
  `;

  return page({
    title: `Подбор: ${query.slice(0, 50)}`,
    description: result.summary,
    body,
    categories,
  });
}
