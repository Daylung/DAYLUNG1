/**
 * Публичные маршруты.
 */
import { html, when } from '../render/html.js';
import * as categoriesRepo from '../db/repositories/categories.js';
import * as servicesRepo from '../db/repositories/services.js';
import * as settingsRepo from '../db/repositories/settings.js';
import * as recommendationsRepo from '../db/repositories/recommendations.js';
import { recommend } from '../services/ai/recommend.js';
import * as affiliate from '../services/affiliate.js';
import { renderHome } from '../views/home.js';
import { renderCategory, renderServices } from '../views/category.js';
import { renderService, renderServiceNotFound } from '../views/service.js';
import { renderSearch } from '../views/search.js';
import { page } from '../views/layout.js';

export function registerPublicRoutes(router) {
  /* ── Главная ─────────────────────────────────────────── */
  router.get('/', async (ctx) => {
    const [settings, categories, services] = await Promise.all([
      settingsRepo.get(),
      categoriesRepo.list(),
      servicesRepo.list(),
    ]);

    // Демонстрация: лучший сервис в первой категории + соседи
    const example = buildExample(services, categories);

    ctx.sendHtml(renderHome({
      settings,
      categories,
      services,
      example,
      blocks: settings.blocks ?? [],
    }));
  });

  /* ── Каталог всех сервисов ───────────────────────────── */
  router.get('/services', async (ctx) => {
    const [categories, services] = await Promise.all([
      categoriesRepo.list(),
      servicesRepo.list(),
    ]);
    ctx.sendHtml(renderServices({ services, categories }));
  });

  /* ── Категория ───────────────────────────────────────── */
  router.get('/category/:slug', async (ctx) => {
    const [category, categories] = await Promise.all([
      categoriesRepo.findBySlug(ctx.params.slug),
      categoriesRepo.list(),
    ]);

    if (!category || category.enabled === false) {
      ctx.sendHtml(notFoundPage({ categories, title: 'Категория не найдена' }), 404);
      return;
    }

    const services = await servicesRepo.list({ categoryId: category.id });
    ctx.sendHtml(renderCategory({ category, services, categories }));
  });

  /* ── Сервис: по slug или по id (/service/codelight или /service/svc_codelight) ── */
  router.get('/service/:slug', async (ctx) => {
    const key = ctx.params.slug;
    const [bySlug, categories] = await Promise.all([
      servicesRepo.findBySlug(key),
      categoriesRepo.list(),
    ]);
    const service = bySlug ?? (await servicesRepo.findById(key));

    if (!service || service.published === false) {
      ctx.sendHtml(renderServiceNotFound({ categories }), 404);
      return;
    }

    // Если открыли по id — переводим на канонический slug-адрес
    if (!bySlug) {
      ctx.redirect(`/service/${service.slug}`, 301);
      return;
    }

    const category = await categoriesRepo.findById(service.categoryId);
    if (!category) {
      ctx.sendHtml(renderServiceNotFound({ categories }), 404);
      return;
    }

    const siblings = await servicesRepo.list({ categoryId: category.id });
    const related = siblings.filter((s) => s.id !== service.id).slice(0, 3);

    ctx.sendHtml(renderService({ service, category, related, categories }));
  });

  /* ── Подбор ──────────────────────────────────────────── */
  router.get('/search', async (ctx) => {
    const query = (ctx.get('q') ?? '').trim();
    const categories = await categoriesRepo.list();

    if (!query) {
      ctx.redirect('/#ask');
      return;
    }

    const result = await recommend(query);

    if (!result.ok) {
      ctx.sendHtml(renderSearch({
        query,
        result: { ...result, services: [], categories: [], comparison: [], summary: result.error, provider: 'mock' },
        categories,
      }));
      return;
    }

    ctx.sendHtml(renderSearch({ query, result, categories }));
  });

  /* ── Переход по партнёрской ссылке ───────────────────── */
  router.get('/go/:id', async (ctx) => {
    const service = await servicesRepo.findById(ctx.params.id);
    if (!service) {
      ctx.redirect('/services');
      return;
    }

    const target = affiliate.resolveTarget(service);
    if (!target) {
      ctx.redirect(`/service/${service.slug}`);
      return;
    }

    await affiliate.recordClick({
      serviceId: service.id,
      referer: ctx.req.headers.referer,
      userAgent: ctx.req.headers['user-agent'],
    });

    ctx.res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' });
    ctx.res.end();
  });

  /* ── Служебные страницы ──────────────────────────────── */
  router.get('/about', async (ctx) => {
    const categories = await categoriesRepo.list();
    ctx.sendHtml(page({
      title: 'О проекте',
      categories,
      body: html`
        <section class="sec">
          <div class="wrap" style="max-width:720px">
            <p class="eyebrow">О проекте</p>
            <h1 class="sec__h" style="margin-bottom:18px">DAYLUNG помогает выбрать сервис</h1>
            <p class="sec__lead" style="margin-bottom:18px">
              Мы собираем цифровые сервисы в одном каталоге и объясняем разницу
              между ними вместо того, чтобы продавать один вариант.
            </p>
            <p style="color:var(--tx-2);margin-bottom:14px">
              На этом этапе данные демонстрационные: все сервисы в каталоге вымышлены.
              Проект находится в разработке, реальные данные появятся позже.
            </p>
            <p style="color:var(--tx-2)">
              Подбор работает на правилах по данным каталога. Подключение языковой
              модели запланировано как отдельный слой — он не меняет интерфейс.
            </p>
          </div>
        </section>
      `,
    }));
  });

  for (const [path, title, text] of [
    ['/privacy', 'Конфиденциальность', 'Мы не собираем персональные данные без необходимости. Запросы к подбору обезличены. Логи сервера не содержат содержимого запросов.'],
    ['/terms', 'Условия использования', 'Сервис предоставляется как есть, в демонстрационном режиме. Данные о сервисах могут быть неполными и требуют проверки на официальном сайте.'],
  ]) {
    router.get(path, async (ctx) => {
      const categories = await categoriesRepo.list();
      ctx.sendHtml(page({
        title,
        categories,
        body: html`
          <section class="sec">
            <div class="wrap" style="max-width:640px">
              <p class="eyebrow">Правовая информация</p>
              <h1 class="sec__h" style="margin-bottom:16px">${title}</h1>
              <p style="color:var(--tx-2)">${text}</p>
            </div>
          </section>
        `,
      }));
    });
  }
}

/* ── Вспомогательные ─────────────────────────────────────── */

/** Готовит демонстрационный блок: лучший сервис категории и альтернативы. */
function buildExample(services, categories) {
  if (!services.length) return null;

  const byCategory = categories
    .map((c) => ({ category: c, items: services.filter((s) => s.categoryId === c.id) }))
    .filter((g) => g.items.length >= 2);

  const group = byCategory[0];
  if (!group) return null;

  const top = group.items.slice(0, 3);

  return {
    query: `Какой ${group.category.name.toLowerCase()}-сервис выбрать? Сравните варианты и объясните разницу`,
    categories: [{ id: group.category.id, name: group.category.name, slug: group.category.slug }],
    summary: `${group.category.name}: ${top.length} варианта из каталога. Первый — с лучшим рейтингом и оценками по критериям, ниже — альтернативы с другим соотношением цены и возможностей.`,
    services: top.map((s, i) => ({
      data: s,
      match: Math.round(92 - i * 7),
      role: i === 0 ? 'Оптимальный выбор' : i === 1 ? 'Альтернатива' : 'Ещё вариант',
      reasons: (s.pros ?? []).slice(0, 2),
      warnings: (s.cons ?? []).slice(0, 2),
    })),
  };
}

function notFoundPage({ categories, title }) {
  return page({
    title,
    categories,
    body: html`
      <section class="sec">
        <div class="wrap" style="text-align:center;max-width:520px">
          <h1 class="sec__h" style="margin-bottom:12px">${title}</h1>
          <p class="sec__lead" style="margin-bottom:24px">
            Проверьте адрес или вернитесь к каталогу.
          </p>
          <a class="btn btn--primary" href="/">На главную</a>
        </div>
      </section>
    `,
  });
}
