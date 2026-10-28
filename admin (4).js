/**
 * Маршруты административной панели.
 *
 * Все, кроме /admin/login, требуют активной сессии.
 * Проверка выполняется в middleware requireAdmin.
 */
import { config } from '../config.js';
import * as categoriesRepo from '../db/repositories/categories.js';
import * as servicesRepo from '../db/repositories/services.js';
import * as settingsRepo from '../db/repositories/settings.js';
import * as recommendationsRepo from '../db/repositories/recommendations.js';
import * as versions from '../services/versions.js';
import * as affiliate from '../services/affiliate.js';
import { recommend, providerInfo } from '../services/ai/recommend.js';
import { sanitizeComponent, inspectCode, parseInstruction } from '../security/sanitize.js';
import { createSession, destroySession, sessionCookieOptions, clearCookieOptions } from '../security/auth.js';
import { safeEqual } from '../util/ids.js';
import * as rateLimit from '../security/rateLimit.js';
import { readFlash, redirectFlash } from '../views/admin/layout.js';
import { renderLogin } from '../views/admin/login.js';
import { renderDashboard } from '../views/admin/dashboard.js';
import { renderCategories, renderCategoryForm } from '../views/admin/categories.js';
import { renderServices, renderServiceForm } from '../views/admin/services.js';
import { renderEditor, renderPreviewList } from '../views/admin/editor.js';
import { renderPreviewCompare, renderVersions } from '../views/admin/versions.js';
import { html, when } from '../render/html.js';

const COOKIE = config.session.cookieName;

/* ── Сбор общих счётчиков для сайдбара ───────────────────── */
async function collectCounts() {
  const [categories, services, versionsList, recs] = await Promise.all([
    categoriesRepo.list({ includeDisabled: true }),
    servicesRepo.list({ includeUnpublished: true }),
    versions.list(),
    recommendationsRepo.list({ includeDrafts: true }),
  ]);

  return {
    raw: { categories, services, versionsList, recs },
    counts: {
      categories: categories.length,
      categoriesEnabled: categories.filter((c) => c.enabled !== false).length,
      services: services.length,
      servicesPublished: services.filter((s) => s.published !== false).length,
      versions: versionsList.length,
      previews: versionsList.filter((v) => v.status === 'preview').length,
      recommendations: recs.filter((r) => r.published).length,
    },
  };
}

/* ── Middleware ──────────────────────────────────────────── */
export async function requireAdmin(ctx) {
  if (!ctx.pathname.startsWith('/admin')) return;
  if (ctx.pathname === '/admin/login') return;

  const session = ctx.locals.session;
  if (!session) {
    ctx.redirect(`/admin/login?next=${encodeURIComponent(ctx.pathname)}`);
    return false;
  }
}

export function registerAdminRoutes(router) {
  /* ── Вход ─────────────────────────────────────────────── */
  router.get('/admin/login', async (ctx) => {
    const categories = await categoriesRepo.list();
    void categories;

    if (ctx.locals.session) {
      ctx.redirect('/admin');
      return;
    }

    const notice = !config.admin.password
      ? 'Пароль не задан. Укажите ADMIN_PASSWORD в файле .env и перезапустите сервер.'
      : null;

    ctx.sendHtml(renderLogin({ notice, user: config.admin.user }));
  });

  router.post('/admin/login', async (ctx) => {
    if (!config.admin.password) {
      ctx.sendHtml(renderLogin({
        error: 'Вход отключён: ADMIN_PASSWORD не задан в .env',
        user: config.admin.user,
      }), 503);
      return;
    }

    // Учёт попытки ДО сравнения пароля — атомарно, чтобы параллельные запросы
    // не обходили лимит.
    const decision = await rateLimit.attempt(ctx.ip);
    if (!decision.allowed) {
      ctx.sendHtml(renderLogin({ error: decision.message, user: config.admin.user }), 429);
      return;
    }

    const form = await ctx.form();
    const user = String(form.user ?? '').trim();
    const password = String(form.password ?? '');

    const userOk = safeEqual(user, config.admin.user);
    const passOk = safeEqual(password, config.admin.password);

    if (!userOk || !passOk) {
      ctx.sendHtml(renderLogin({
        error: `Неверный логин или пароль. Осталось попыток: ${Math.max(decision.left, 0)}`,
        user,
      }), 401);
      return;
    }

    await rateLimit.reset(ctx.ip);
    const { cookieValue, maxAge } = createSession(config.admin.user);
    ctx.setCookie(COOKIE, cookieValue, sessionCookieOptions(maxAge));
    ctx.redirect('/admin');
  });

  router.post('/admin/logout', async (ctx) => {
    destroySession(ctx.cookies[COOKIE]);
    ctx.clearCookie(COOKIE, clearCookieOptions());
    ctx.redirect('/admin/login');
  });

  /* ── Dashboard ────────────────────────────────────────── */
  router.get('/admin', async (ctx) => {
    const { counts, raw } = await collectCounts();
    const [currentVersion, backups, clickStats, settings] = await Promise.all([
      versions.current(),
      versions.listBackups(),
      affiliate.clickStats(),
      settingsRepo.get(),
    ]);

    void settings;

    const catMap = new Map(raw.categories.map((c) => [c.id, c]));

    ctx.sendHtml(renderDashboard({
      counts,
      categories: raw.categories,
      services: raw.services.map((s) => ({
        ...s,
        categoryName: catMap.get(s.categoryId)?.name ?? '—',
      })),
      recentServices: raw.services
        .map((s) => ({ ...s, categoryName: catMap.get(s.categoryId)?.name ?? '—' }))
        .sort((a, b) => b.rating - a.rating),
      versions: raw.versionsList,
      current: currentVersion,
      aiProvider: providerInfo(),
      affiliate: affiliate.status(),
      backups,
      clickStats,
      flash: readFlash(ctx),
    }));
  });

  /* ── Категории ────────────────────────────────────────── */
  router.get('/admin/categories', async (ctx) => {
    const { counts, raw } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderCategories({
      items: raw.categories,
      services: raw.services,
      counts,
      current: currentVersion,
      flash: readFlash(ctx),
    }));
  });

  router.get('/admin/categories/new', async (ctx) => {
    const { counts } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderCategoryForm({
      category: { order: await categoriesRepo.nextOrder(), enabled: true, icon: 'grid', accent: '#7a5cff' },
      action: '/admin/categories/new',
      counts, current: currentVersion,
      flash: readFlash(ctx),
      isNew: true,
    }));
  });

  router.post('/admin/categories/new', async (ctx) => {
    const form = await ctx.form();
    const result = await categoriesRepo.create({
      ...form,
      enabled: form.enabled === '1',
    });

    if (!result.ok) {
      redirectFlash(ctx, '/admin/categories/new', 'err', 'Не удалось создать категорию', result.errors);
      return;
    }

    redirectFlash(ctx, '/admin/categories', 'ok', `Категория «${result.value.name}» создана`);
  });

  router.get('/admin/categories/:id', async (ctx) => {
    const category = await categoriesRepo.findById(ctx.params.id);
    if (!category) {
      ctx.redirect('/admin/categories');
      return;
    }

    const { counts } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderCategoryForm({
      category,
      action: `/admin/categories/${category.id}`,
      counts, current: currentVersion,
      flash: readFlash(ctx),
    }));
  });

  router.post('/admin/categories/:id', async (ctx) => {
    const form = await ctx.form();
    const result = await categoriesRepo.edit(ctx.params.id, {
      ...form,
      enabled: form.enabled === '1',
    });

    if (!result.ok) {
      redirectFlash(ctx, `/admin/categories/${ctx.params.id}`, 'err', 'Не удалось сохранить', result.errors);
      return;
    }

    redirectFlash(ctx, '/admin/categories', 'ok', `Категория «${result.value.name}» сохранена`);
  });

  router.post('/admin/categories/:id/toggle', async (ctx) => {
    const category = await categoriesRepo.findById(ctx.params.id);
    if (!category) {
      ctx.redirect('/admin/categories');
      return;
    }

    const updated = await categoriesRepo.setEnabled(category.id, !category.enabled);
    redirectFlash(
      ctx, '/admin/categories', 'ok',
      `Категория «${updated.name}» ${updated.enabled ? 'включена' : 'выключена'}`,
    );
  });

  router.post('/admin/categories/:id/move', async (ctx) => {
    const form = await ctx.form();
    const dir = form.dir === 'down' ? 'down' : 'up';
    const items = await categoriesRepo.list({ includeDisabled: true });

    const index = items.findIndex((c) => c.id === ctx.params.id);
    if (index === -1) {
      ctx.redirect('/admin/categories');
      return;
    }

    const swapWith = dir === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= items.length) {
      ctx.redirect('/admin/categories');
      return;
    }

    const ordered = items.map((c) => c.id);
    [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
    await categoriesRepo.reorder(ordered);

    ctx.redirect('/admin/categories');
  });

  router.post('/admin/categories/:id/delete', async (ctx) => {
    const category = await categoriesRepo.findById(ctx.params.id);
    if (!category) {
      ctx.redirect('/admin/categories');
      return;
    }

    const services = await servicesRepo.list({ includeUnpublished: true, categoryId: category.id });
    await categoriesRepo.remove(category.id);

    const detail = services.length
      ? [`Сервисы этой категории (${services.length}) остались в базе без категории — назначьте им новую в разделе «Сервисы».`]
      : null;

    redirectFlash(ctx, '/admin/categories', 'ok', `Категория «${category.name}» удалена`, detail);
  });

  /* ── Сервисы ──────────────────────────────────────────── */
  router.get('/admin/services', async (ctx) => {
    const { counts, raw } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderServices({
      items: raw.services,
      categories: raw.categories,
      counts,
      current: currentVersion,
      flash: readFlash(ctx),
      filter: ctx.get('filter') ?? 'all',
    }));
  });

  router.get('/admin/services/new', async (ctx) => {
    const { counts, raw } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderServiceForm({
      service: null,
      categories: raw.categories,
      action: '/admin/services/new',
      counts, current: currentVersion,
      flash: readFlash(ctx),
      isNew: true,
    }));
  });

  router.post('/admin/services/new', async (ctx) => {
    const form = await ctx.form();
    const result = await servicesRepo.create(fromForm(form));

    if (!result.ok) {
      redirectFlash(ctx, '/admin/services/new', 'err', 'Не удалось создать сервис', result.errors);
      return;
    }

    redirectFlash(ctx, '/admin/services', 'ok', `Сервис «${result.value.name}» создан`);
  });

  router.get('/admin/services/:id', async (ctx) => {
    const service = await servicesRepo.findById(ctx.params.id);
    if (!service) {
      ctx.redirect('/admin/services');
      return;
    }

    const { counts, raw } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderServiceForm({
      service,
      categories: raw.categories,
      action: `/admin/services/${service.id}`,
      counts, current: currentVersion,
      flash: readFlash(ctx),
    }));
  });

  router.post('/admin/services/:id', async (ctx) => {
    const form = await ctx.form();
    const result = await servicesRepo.edit(ctx.params.id, fromForm(form));

    if (!result.ok) {
      redirectFlash(ctx, `/admin/services/${ctx.params.id}`, 'err', 'Не удалось сохранить', result.errors);
      return;
    }

    redirectFlash(ctx, '/admin/services', 'ok', `Сервис «${result.value.name}» сохранён`);
  });

  router.post('/admin/services/:id/toggle', async (ctx) => {
    const service = await servicesRepo.findById(ctx.params.id);
    if (!service) {
      ctx.redirect('/admin/services');
      return;
    }

    const updated = await servicesRepo.setPublished(service.id, !service.published);
    redirectFlash(
      ctx, '/admin/services', 'ok',
      `Сервис «${updated.name}» ${updated.published ? 'опубликован' : 'снят с публикации'}`,
    );
  });

  router.post('/admin/services/:id/delete', async (ctx) => {
    const service = await servicesRepo.findById(ctx.params.id);
    if (!service) {
      ctx.redirect('/admin/services');
      return;
    }

    await servicesRepo.remove(service.id);
    redirectFlash(ctx, '/admin/services', 'ok', `Сервис «${service.name}» удалён`);
  });

  /* ── Рекомендации ─────────────────────────────────────── */
  router.get('/admin/recommendations', async (ctx) => {
    const { counts, raw } = await collectCounts();
    const currentVersion = await versions.current();

    const body = html`
      <div class="page-head">
        <div>
          <h1>Рекомендации</h1>
          <p>Запросы, по которым выполнялся подбор. Публикация — отдельным действием.</p>
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <h2>История подборов</h2>
            <p>Хранятся последние 200 запросов</p>
          </div>
        </div>
        <div class="panel__body panel__body--flush tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>Запрос</th><th>Категория</th><th>Сервисов</th><th>Статус</th><th>Когда</th></tr>
            </thead>
            <tbody>
              ${when(raw.recs.length === 0, html`
                <tr><td colspan="5"><div class="empty"><p>Пока нет ни одного подбора.</p></div></td></tr>
              `)}
              ${raw.recs.map((r) => html`
                <tr>
                  <td style="max-width:340px">${r.query}</td>
                  <td>${r.categorySlug ?? '—'}</td>
                  <td style="font-family:var(--mono)">${(r.serviceIds ?? []).length}</td>
                  <td><span class="tag tag--${r.published ? 'ok' : 'warn'}">${r.published ? 'опубликована' : 'черновик'}</span></td>
                  <td style="font-size:.78rem;color:var(--tx-3);white-space:nowrap">
                    ${new Date(r.createdAt).toLocaleString('ru-RU')}
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const { adminPage } = await import('../views/admin/layout.js');
    ctx.sendHtml(adminPage({
      title: 'Рекомендации', subtitle: 'Контент', active: 'recommendations',
      counts, currentVersion, body, flash: readFlash(ctx),
    }));
  });

  /* ── Доработка сайта ──────────────────────────────────── */
  router.get('/admin/editor', async (ctx) => {
    const { counts } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderEditor({
      counts, current: currentVersion, flash: readFlash(ctx),
    }));
  });

  router.post('/admin/editor/analyze', async (ctx) => {
    const form = await ctx.form();
    const mode = form.mode === 'preview' ? 'preview' : 'analyze';

    const instruction = String(form.instruction ?? '');
    const component = String(form.component ?? '');
    const code = String(form.code ?? '');

    const parsed = instruction.trim() ? parseInstruction(instruction) : null;
    const componentCheck = component.trim() ? sanitizeComponent(component) : null;
    const codeCheck = code.trim() ? inspectCode(code) : null;

    // Режим «проверить» — просто показать результат разбора
    if (mode === 'analyze') {
      const { counts } = await collectCounts();
      const currentVersion = await versions.current();

      ctx.sendHtml(renderEditor({
        counts, current: currentVersion, flash: null,
        values: { instruction, component, code, title: form.title, description: form.description },
        parseResult: parsed?.ok ? parsed : null,
        componentCheck,
        codeCheck,
      }));
      return;
    }

    // Режим «создать предпросмотр»
    const hasContent = instruction.trim() || component.trim() || code.trim();
    if (!hasContent) {
      const { counts } = await collectCounts();
      const currentVersion = await versions.current();

      ctx.sendHtml(renderEditor({
        counts, current: currentVersion,
        flash: { type: 'err', text: 'Добавьте описание изменения, компонент или код' },
        values: { instruction, component, code },
      }));
      return;
    }

    if (componentCheck && !componentCheck.ok) {
      const { counts } = await collectCounts();
      const currentVersion = await versions.current();
      ctx.sendHtml(renderEditor({
        counts, current: currentVersion,
        flash: { type: 'err', text: componentCheck.error },
        values: { instruction, component, code },
        componentCheck,
      }));
      return;
    }

    const title = String(form.title ?? '').trim()
      || (parsed?.tasks?.[0]?.description ?? 'Изменение без названия');

    const version = await versions.createPreview({
      title,
      description: String(form.description ?? '').trim() || instruction.slice(0, 300),
      author: 'owner',
      type: String(form.type ?? 'content'),
      instruction,
      componentHtml: componentCheck?.ok ? componentCheck.html : '',
      code,
    });

    redirectFlash(ctx, `/admin/preview/${version.id}`, 'ok',
      `Создан предпросмотр ${version.label}. Рабочий сайт не изменён.`);
  });

  /* ── Предпросмотры ────────────────────────────────────── */
  router.get('/admin/preview', async (ctx) => {
    const { counts, raw } = await collectCounts();
    const currentVersion = await versions.current();

    ctx.sendHtml(renderPreviewList({
      previews: raw.versionsList.filter((v) => v.status === 'preview'),
      current: currentVersion,
      counts,
      flash: readFlash(ctx),
    }));
  });

  router.get('/admin/preview/:id', async (ctx) => {
    const version = await versions.findById(ctx.params.id);
    if (!version) {
      ctx.redirect('/admin/preview');
      return;
    }

    const { counts } = await collectCounts();
    const currentVersion = await versions.current();

    const currentSnapshot = await versions.takeSnapshot();
    const previewSnapshot = await loadPreviewSnapshot(version.id);

    const after = previewSnapshot?.tables
      ? {
          categories: previewSnapshot.tables.categories?.length ?? 0,
          services: previewSnapshot.tables.services?.length ?? 0,
          recommendations: previewSnapshot.tables.recommendations?.length ?? 0,
        }
      : null;

    ctx.sendHtml(renderPreviewCompare({
      version,
      currentSnapshot,
      previewInfo: {
        after,
        safeComponentHtml: Boolean(version.componentHtml),
      },
      current: currentVersion,
      counts,
      flash: readFlash(ctx),
    }));
  });

  router.post('/admin/preview/:id/apply', async (ctx) => {
    const result = await versions.apply(ctx.params.id);

    if (!result.ok) {
      redirectFlash(ctx, `/admin/preview/${ctx.params.id}`, 'err', result.error);
      return;
    }

    redirectFlash(ctx, '/admin/versions', 'ok',
      `Версия ${result.version.label} применена. Предыдущая сохранена в резервные копии.`);
  });

  router.post('/admin/preview/:id/discard', async (ctx) => {
    const result = await versions.discard(ctx.params.id);

    if (!result.ok) {
      redirectFlash(ctx, '/admin/preview', 'err', result.error);
      return;
    }

    redirectFlash(ctx, '/admin/preview', 'ok', 'Предпросмотр отменён, снимок удалён');
  });

  /* ── Версии ───────────────────────────────────────────── */
  router.get('/admin/versions', async (ctx) => {
    const { counts } = await collectCounts();
    const [list, currentVersion, backups] = await Promise.all([
      versions.list(),
      versions.current(),
      versions.listBackups(),
    ]);

    ctx.sendHtml(renderVersions({
      versions: list,
      current: currentVersion,
      counts,
      backups,
      flash: readFlash(ctx),
    }));
  });

  router.post('/admin/versions/:id/restore', async (ctx) => {
    const result = await versions.restore(ctx.params.id);

    if (!result.ok) {
      // Не редиректим: показываем страницу версий с тем же адресом и сообщением,
      // чтобы владелец видел причину отказа. Данные при этом не менялись.
      const { counts } = await collectCounts();
      const [list, currentVersion, backups] = await Promise.all([
        versions.listWithRestoreFlag(),
        versions.current(),
        versions.listBackups(),
      ]);

      ctx.sendHtml(renderVersions({
        versions: list,
        current: currentVersion,
        counts,
        backups,
        flash: { type: 'err', text: result.error },
      }), 409);
      return;
    }

    redirectFlash(ctx, '/admin/versions', 'ok',
      `Восстановлена версия ${result.version.label}. Текущее состояние сохранено в резервную копию.`);
  });

  /* ── Настройки ────────────────────────────────────────── */
  router.get('/admin/settings', async (ctx) => {
    const { counts } = await collectCounts();
    const [currentVersion, settings] = await Promise.all([versions.current(), settingsRepo.get()]);
    const { adminPage } = await import('../views/admin/layout.js');

    const body = html`
      <div class="page-head">
        <div>
          <h1>Настройки</h1>
          <p>Тексты главного экрана. Применяются сразу после сохранения.</p>
        </div>
      </div>

      <form method="post" action="/admin/settings">
        <div class="panel">
          <div class="panel__head"><h2>Главный экран</h2></div>
          <div class="panel__body">
            <div class="form-grid">
              <div class="field field--full">
                <label for="headline">Заголовок</label>
                <input class="inp" id="headline" name="headline" value="${settings.site.headline}" maxlength="120">
              </div>

              <div class="field field--full">
                <label for="tagline">Подзаголовок</label>
                <textarea class="txt" id="tagline" name="tagline" rows="3" maxlength="300">${settings.site.tagline}</textarea>
              </div>

              <div class="field field--full">
                <label for="examples">Примеры запросов</label>
                <textarea class="txt txt--mono" id="examples" name="examples" rows="4">${(settings.site.examples ?? []).join('\n')}</textarea>
                <span class="field__hint">По одному на строку. Показываются под полем поиска</span>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn--primary" type="submit">Сохранить</button>
            </div>
          </div>
        </div>
      </form>

      <div class="panel">
        <div class="panel__head"><h2>Переменные окружения</h2></div>
        <div class="panel__body" style="font-size:.83rem;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;gap:12px">
            <span style="color:var(--tx-3)">AI_PROVIDER</span>
            <span style="font-family:var(--mono)">${providerInfo().requested}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px">
            <span style="color:var(--tx-3)">AI_API_KEY</span>
            <span style="font-family:var(--mono)">${providerInfo().hasKey ? 'задан' : 'не задан'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:12px">
            <span style="color:var(--tx-3)">AFFILIATE_TRACKING</span>
            <span style="font-family:var(--mono)">${config.affiliate.tracking ? 'on' : 'off'}</span>
          </div>
          <p style="color:var(--tx-3);margin-top:6px">
            Значения читаются из <code>.env</code> и не отображаются в интерфейсе целиком.
            Ключи никогда не попадают в HTML или логи.
          </p>
        </div>
      </div>
    `;

    ctx.sendHtml(adminPage({
      title: 'Настройки', subtitle: 'Система', active: 'settings',
      counts, currentVersion, body, flash: readFlash(ctx),
    }));
  });

  router.post('/admin/settings', async (ctx) => {
    const form = await ctx.form();
    const examples = String(form.examples ?? '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    await settingsRepo.saveSite({
      headline: String(form.headline ?? '').trim() || 'Не знаешь, какой сервис выбрать?',
      tagline: String(form.tagline ?? '').trim(),
      examples,
    });

    redirectFlash(ctx, '/admin/settings', 'ok', 'Настройки главного экрана сохранены');
  });
}

/* ── Вспомогательные ─────────────────────────────────────── */

function fromForm(form) {
  const list = (value) => (value === undefined ? [] : String(value).split('\n').map((s) => s.trim()).filter(Boolean));

  return {
    name: form.name,
    categoryId: form.categoryId,
    tagline: form.tagline,
    description: form.description,
    price: form.price,
    priceValue: form.priceValue,
    rating: form.rating,
    pros: list(form.pros),
    cons: list(form.cons),
    platforms: Array.isArray(form.platforms) ? form.platforms : (form.platforms ? [form.platforms] : []),
    metricQuality: form.metricQuality,
    metricPrice: form.metricPrice,
    metricSpeed: form.metricSpeed,
    logoText: String(form.name ?? '').trim().slice(0, 1).toUpperCase(),
    logoHue: form.logoHue,
    url: form.url,
    affiliateUrl: form.affiliateUrl,
    published: form.published === '1',
    featured: form.featured === '1',
  };
}

/** Читает сохранённый снимок предпросмотра с диска. */
async function loadPreviewSnapshot(versionId) {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { config } = await import('../config.js');

  try {
    const file = path.join(config.dataDir, 'versions', `${versionId}.json`);
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}
