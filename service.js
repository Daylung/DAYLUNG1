/**
 * Страница отдельного сервиса.
 */
import { html, join, when } from '../render/html.js';
import { icon } from '../components/icons.js';
import { serviceTile, plural } from '../components/layout.js';
import { page } from './layout.js';
import { outboundUrl, showsDisclosure } from '../services/affiliate.js';
import { formatRating, formatDate } from '../util/format.js';

const PLATFORM_LABEL = {
  web: 'браузер',
  ios: 'iOS',
  android: 'Android',
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  vscode: 'VS Code',
  jetbrains: 'JetBrains',
  github: 'GitHub',
  gitlab: 'GitLab',
};

export function renderService({ service, category, related = [], categories }) {
  const href = outboundUrl(service);

  const body = html`
    <section class="sec sec--tight">
      <div class="wrap">
        <nav class="ftr__links" style="margin-bottom:18px;font-size:.82rem;color:var(--tx-3)">
          <a href="/">Главная</a>
          <span>/</span>
          <a href="/category/${category.slug}">${category.name}</a>
          <span>/</span>
          <span>${service.name}</span>
        </nav>

        <div class="demo-grid" style="grid-template-columns:1fr 320px">
          <div>
            <div class="svc__head" style="margin-bottom:18px">
              <span class="svc__logo" style="--h:${service.logo?.hue ?? 258};width:52px;height:52px;font-size:1.25rem">
                ${service.logo?.text ?? service.name[0]}
              </span>
              <div class="svc__titles">
                <h1 style="font-size:clamp(1.5rem,3.2vw,2rem);margin-bottom:4px">${service.name}</h1>
                <p class="svc__tagline" style="font-size:.88rem">${service.tagline}</p>
              </div>
            </div>

            <p class="svc__desc" style="font-size:.95rem;margin-bottom:22px">${service.description}</p>

            <div class="svc__cols" style="margin-bottom:22px">
              <div>
                <h4 style="font-size:.74rem;letter-spacing:.09em;text-transform:uppercase;color:var(--tx-3);margin-bottom:10px">Преимущества</h4>
                <ul class="svc__list svc__list--pros">
                  ${join((service.pros ?? []).map((p) => html`<li>${p}</li>`))}
                </ul>
              </div>
              <div>
                <h4 style="font-size:.74rem;letter-spacing:.09em;text-transform:uppercase;color:var(--tx-3);margin-bottom:10px">Недостатки</h4>
                <ul class="svc__list svc__list--cons">
                  ${join((service.cons ?? []).map((c) => html`<li>${c}</li>`))}
                </ul>
              </div>
            </div>

            <div class="panel" style="margin-bottom:20px">
              <div class="panel__head"><h2>Оценки по критериям</h2></div>
              <div class="panel__body">
                ${join([
                  ['Качество', service.metrics?.quality],
                  ['Цена', service.metrics?.price],
                  ['Скорость', service.metrics?.speed],
                ].map(([label, value]) => html`
                  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;font-size:.84rem">
                    <span style="width:80px;flex-shrink:0;color:var(--tx-2)">${label}</span>
                    <i style="flex:1;height:5px;border-radius:3px;background:var(--surf-3);position:relative;overflow:hidden">
                      <i style="position:absolute;inset:0 auto 0 0;width:${value ?? 0}%;border-radius:3px;background:linear-gradient(90deg,var(--acc),var(--acc-2))"></i>
                    </i>
                    <span style="width:34px;text-align:right;font-family:var(--mono);font-size:.78rem;color:var(--tx-3)">${value ?? 0}</span>
                  </div>
                `))}
              </div>
            </div>

            ${when(related.length, html`
              <h2 style="font-size:1.1rem;margin:34px 0 14px">Другие сервисы в категории</h2>
              <div class="results">
                ${join(related.map((s, i) => serviceTile(s, { delay: i * 50 })))}
              </div>
            `)}
          </div>

          <aside style="position:sticky;top:calc(var(--hdr-bar,64px) + 20px)">
            <div class="panel" style="margin-bottom:16px">
              <div class="panel__body">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                  <span class="svc__rating" style="font-size:1rem">
                    ${icon('star', { size: 15, stroke: 0 })}
                    ${formatRating(service.rating)}
                    <small>/ 5</small>
                  </span>
                  <span class="tag tag--acc">${service.price}</span>
                </div>

                ${when(href, html`
                  <a class="btn btn--primary btn--block" href="${href}" rel="nofollow noopener" target="_blank" style="margin-bottom:10px">
                    Перейти на сайт
                  </a>
                  ${when(showsDisclosure(service), html`
                    <p class="disclosure" style="margin-bottom:14px;display:block">
                      Это партнёрская ссылка. Цена для вас не меняется.
                    </p>
                  `)}
                `)}

                <div style="padding-top:14px;border-top:1px solid var(--line);font-size:.8rem;color:var(--tx-3);display:flex;flex-direction:column;gap:8px">
                  <div style="display:flex;justify-content:space-between;gap:10px">
                    <span>Категория</span>
                    <a class="link" href="/category/${category.slug}">${category.name}</a>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:10px">
                    <span>Платформы</span>
                    <span style="color:var(--tx-2);text-align:right">
                      ${(service.platforms ?? []).map((p) => PLATFORM_LABEL[p] ?? p).join(', ') || '—'}
                    </span>
                  </div>
                  <div style="display:flex;justify-content:space-between;gap:10px">
                    <span>Обновлено</span>
                    <span style="color:var(--tx-2)">${formatDate(service.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="msg msg--info" style="font-size:.78rem">
              ${icon('info', { size: 15 })}
              <span>Данные демонстрационные. Перед покупкой проверьте условия на сайте сервиса.</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;

  return page({
    title: service.name,
    description: service.tagline || service.description?.slice(0, 150),
    body,
    categories,
    activeSlug: category.slug,
  });
}

/** Страница «не найдено» — используется для 404 сервисов. */
export function renderServiceNotFound({ categories }) {
  return page({
    title: 'Сервис не найден',
    body: html`
      <section class="sec">
        <div class="wrap" style="text-align:center;max-width:520px">
          <h1 class="sec__h" style="margin-bottom:12px">Сервис не найден</h1>
          <p class="sec__lead" style="margin-bottom:24px">
            Возможно, он снят с публикации или ссылка устарела.
          </p>
          <a class="btn btn--primary" href="/services">Перейти в каталог</a>
        </div>
      </section>
    `,
    categories,
  });
}
