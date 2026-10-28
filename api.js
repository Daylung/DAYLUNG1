/**
 * Публичный JSON API (только чтение).
 *
 * Фронтенд и будущие клиенты (мобильное приложение, интеграции) работают
 * через эти эндпоинты, а не через внутренние репозитории напрямую.
 *
 *   GET /api/categories            — включённые категории
 *   GET /api/services              — опубликованные сервисы (?category=slug)
 *   GET /api/services/:idOrSlug    — один сервис
 *   GET /api/search?q=...          — подбор через RecommendationService
 *   GET /api/health                — статус сервера и провайдера ИИ
 *
 * Здесь нет записи, нет админских полей и нет партнёрских URL:
 * outbound-ссылка всегда отдаётся как /go/:id (см. services/affiliate.js).
 */
import * as categoriesRepo from '../db/repositories/categories.js';
import * as servicesRepo from '../db/repositories/services.js';
import { recommend, providerInfo } from '../services/ai/recommend.js';

/** Оставляем только публичные поля — без внутренних служебных полей. */
function publicService(s) {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    categoryId: s.categoryId,
    tagline: s.tagline,
    description: s.description,
    logo: s.logo ?? null,
    price: s.price ?? null,
    priceValue: s.priceValue ?? null,
    rating: s.rating ?? null,
    pros: s.pros ?? [],
    cons: s.cons ?? [],
    platforms: s.platforms ?? [],
    goUrl: `/go/${s.id}`,
  };
}

function publicCategory(c) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    icon: c.icon,
    accent: c.accent,
    order: c.order,
  };
}

export function registerApiRoutes(router) {
  router.get('/api/health', async (ctx) => {
    ctx.sendJson({ ok: true, ai: providerInfo(), time: new Date().toISOString() });
  });

  router.get('/api/categories', async (ctx) => {
    const categories = await categoriesRepo.list();
    ctx.sendJson({ items: categories.map(publicCategory) });
  });

  router.get('/api/services', async (ctx) => {
    const slug = (ctx.get('category') ?? '').trim();
    let categoryId = null;

    if (slug) {
      const category = await categoriesRepo.findBySlug(slug);
      if (!category || category.enabled === false) {
        ctx.sendJson({ error: 'Категория не найдена' }, 404);
        return;
      }
      categoryId = category.id;
    }

    const services = await servicesRepo.list({ categoryId });
    ctx.sendJson({ items: services.map(publicService) });
  });

  router.get('/api/services/:key', async (ctx) => {
    const key = ctx.params.key;
    // Сначала ищем по id, затем по slug — оба варианта допустимы.
    const service =
      (await servicesRepo.findById(key)) ?? (await servicesRepo.findBySlug(key));

    if (!service || service.published === false) {
      ctx.sendJson({ error: 'Сервис не найден' }, 404);
      return;
    }
    ctx.sendJson({ item: publicService(service) });
  });

  router.get('/api/search', async (ctx) => {
    const q = (ctx.get('q') ?? '').trim();
    if (q.length < 2) {
      ctx.sendJson({ error: 'Запрос слишком короткий' }, 400);
      return;
    }
    const result = await recommend(q);
    ctx.sendJson(result);
  });
}
