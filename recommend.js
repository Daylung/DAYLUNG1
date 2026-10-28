/**
 * ════════════════════════════════════════════════════════════
 *  AI RECOMMENDATION SERVICE
 * ════════════════════════════════════════════════════════════
 *
 *  Слой, изолирующий логику подбора от конкретного провайдера.
 *  Шаблоны и маршруты вызывают только recommend(query) —
 *  поэтому смена провайдера не затрагивает интерфейс.
 *
 *  Контракт ответа:
 *  {
 *    query:     строка запроса пользователя,
 *    categories: [{ id, slug, name, score }],
 *    services:   [{ id, slug, name, match, reasons[], warnings[], data }],
 *    comparison: [{ label, values: [{ serviceId, value }] }],
 *    summary:    строка — итоговая рекомендация,
 *    provider:   'mock' | 'openai' | ...
 *  }
 *
 *  Провайдеры регистрируются в REGISTRY. По умолчанию активен mock:
 *  он работает без сети и ключей, поэтому проект запускается
 *  одной командой и ничего не стоит.
 */
import { config } from '../../config.js';
import * as categoriesRepo from '../../db/repositories/categories.js';
import * as servicesRepo from '../../db/repositories/services.js';

/* ── Правила mock-провайдера ────────────────────────────── */

const INTENTS = [
  {
    slug: 'vpn',
    keywords: ['vpn', 'впн', 'стриминг', 'netflix', 'ютуб', 'youtube', 'путешеств', 'ipad', 'iphone', 'приватн', 'обход'],
    weight: 1,
  },
  {
    slug: 'ai',
    keywords: ['ai', 'ии', 'нейросет', 'gpt', 'чат', 'программир', 'python', 'питон', 'код', 'учёб', 'учеб', 'конспект', 'текст'],
    weight: 1,
  },
  {
    slug: 'hosting',
    keywords: ['хостинг', 'сервер', 'домен', 'сайт', 'деплой', 'портфолио', 'wordpress', 'vps'],
    weight: 1,
  },
  {
    slug: 'business',
    keywords: ['crm', 'бухгалтер', 'учёт', 'учет', 'задач', 'проект', 'рассылк', 'маркет', 'платеж', 'бизнес', 'студи'],
    weight: 1,
  },
];

const BUDGET_HINTS = [
  { re: /(недорог|дешёв|дешев|бюджет|эконом|до \d+|небольш)/, cheap: true },
  { re: /(лучш|качеств|премиум|топ|максимальн)/, cheap: false },
];

/** Определяет наиболее вероятную категорию по тексту запроса. */
function detectCategory(query, cats) {
  const text = query.toLowerCase();
  const scores = cats.map((cat) => {
    const intent = INTENTS.find((i) => i.slug === cat.slug);
    if (!intent) return { cat, score: 0 };
    const hits = intent.keywords.filter((kw) => text.includes(kw)).length;
    return { cat, score: hits * intent.weight };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0].cat : cats[0] ?? null;
}

function wantsCheap(query) {
  const text = query.toLowerCase();
  let cheap = null;
  for (const hint of BUDGET_HINTS) {
    if (hint.re.test(text)) cheap = hint.cheap;
  }
  return cheap;
}

/** Считает процент совпадения по простой модели весов. */
function scoreService(service, { cheap }) {
  const m = service.metrics ?? { quality: 70, price: 70, speed: 70 };
  const ratingPart = (service.rating / 5) * 40;
  const qualityPart = (m.quality / 100) * 30;
  const pricePart = (m.price / 100) * (cheap ? 30 : 15);

  let total = ratingPart + qualityPart + pricePart;
  if (!cheap) total += (m.speed / 100) * 15;

  return Math.max(20, Math.min(98, Math.round(total)));
}

function buildReasons(service, { cheap }) {
  const m = service.metrics ?? {};
  const reasons = [];

  if (cheap && m.price >= 85) reasons.push('Одна из самых низких цен в категории');
  if (m.quality >= 85) reasons.push('Высокие оценки качества по отзывам и тестам');
  if (m.speed >= 85) reasons.push('Быстро работает на повседневных задачах');
  if (service.pros?.[0]) reasons.push(service.pros[0]);
  if (!reasons.length && service.pros?.length) reasons.push(service.pros[0]);

  return reasons.slice(0, 3);
}

function buildComparison(services) {
  const rows = [
    { label: 'Качество', key: 'quality' },
    { label: 'Цена', key: 'price' },
    { label: 'Скорость', key: 'speed' },
  ];

  return rows.map((row) => ({
    label: row.label,
    values: services.map((s) => ({
      serviceId: s.id,
      value: Math.round(s.metrics?.[row.key] ?? 0),
    })),
  }));
}

/**
 * Mock-провайдер.
 * Работает полностью локально: правила + данные каталога.
 * Это не «настоящий AI», и в интерфейсе так и написано.
 */
async function mockProvider({ query }) {
  const [cats, allServices] = await Promise.all([
    categoriesRepo.list(),
    servicesRepo.list(),
  ]);

  if (!cats.length) {
    return {
      query,
      categories: [],
      services: [],
      comparison: [],
      summary: 'Каталог пока пуст — добавьте категории и сервисы в админке.',
      provider: 'mock',
    };
  }

  const category = detectCategory(query, cats);
  const cheap = wantsCheap(query);

  const pool = allServices.filter((s) => s.categoryId === category.id);
  const ranked = pool
    .map((service) => ({
      service,
      match: scoreService(service, { cheap }),
    }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);

  const services = ranked.map(({ service, match }, index) => ({
    id: service.id,
    slug: service.slug,
    name: service.name,
    match,
    role: index === 0 ? 'Оптимальный выбор' : index === 1 ? 'Альтернатива' : 'Ещё вариант',
    reasons: buildReasons(service, { cheap }),
    warnings: (service.cons ?? []).slice(0, 2),
    data: service,
  }));

  const summary = services.length
    ? `${category.name}: ${services.length} подходящий${services.length > 1 ? 'х' : ''} вариант. ` +
      `Лучше всего под запрос подходит ${services[0].name} — ${services[0].reasons[0]?.toLowerCase() ?? 'сбалансированные характеристики'}.`
    : `В категории «${category.name}» пока нет опубликованных сервисов.`;

  return {
    query,
    categories: [{ id: category.id, slug: category.slug, name: category.name, score: 100 }],
    services,
    comparison: buildComparison(services.map((s) => s.data)),
    summary,
    provider: 'mock',
    note: 'Подбор выполнен по правилам на основе данных каталога. Подключение AI-модели — следующий этап.',
  };
}

/* ── Заготовки для будущих провайдеров ──────────────────── */

/**
 * Шаблон реального провайдера.
 *
 * Реализуйте request() под нужный API. Ключ берётся только
 * из process.env через config.ai.apiKey и никогда не попадает
 * в клиентский код или логи.
 */
function createRemoteProvider(name) {
  return {
    name,
    available: () => Boolean(config.ai.apiKey),

    async recommend({ query }) {
      if (!config.ai.apiKey) {
        return mockProvider({ query });
      }

      // Пример будущей реализации:
      //
      // const controller = new AbortController();
      // const timer = setTimeout(() => controller.abort(), config.ai.timeoutMs);
      // const res = await fetch('https://api.provider.com/v1/recommend', {
      //   method: 'POST',
      //   signal: controller.signal,
      //   headers: {
      //     'Content-Type': 'application/json',
      //     Authorization: `Bearer ${config.ai.apiKey}`,
      //   },
      //   body: JSON.stringify({ query, catalog: await buildCatalogPrompt() }),
      // });
      // clearTimeout(timer);
      // return normalizeProviderResponse(await res.json());

      throw new Error(`Провайдер ${name} не реализован. Используйте AI_PROVIDER=mock.`);
    },
  };
}

const REGISTRY = {
  mock: { name: 'mock', available: () => true, recommend: mockProvider },
  openai: createRemoteProvider('openai'),
  anthropic: createRemoteProvider('anthropic'),
  yandex: createRemoteProvider('yandex'),
};

/** Активный провайдер: из конфига, с откатом на mock. */
function activeProvider() {
  const requested = config.ai.provider;
  const provider = REGISTRY[requested];
  if (!provider) return { provider: REGISTRY.mock, fallback: `Провайдер «${requested}» не найден` };
  if (!provider.available()) return { provider: REGISTRY.mock, fallback: 'Ключ API не задан' };
  return { provider, fallback: null };
}

/**
 * Единственная точка входа для остального приложения.
 */
export async function recommend(query) {
  const clean = String(query ?? '').trim().slice(0, 500);

  if (clean.length < 3) {
    return {
      ok: false,
      error: 'Опишите задачу хотя бы в двух словах',
      query: clean,
    };
  }

  const { provider, fallback } = activeProvider();

  try {
    const result = await provider.recommend({ query: clean });
    return {
      ok: true,
      ...result,
      requestedProvider: config.ai.provider,
      fallbackReason: fallback,
    };
  } catch (err) {
    // Ошибка провайдера не должна ломать страницу
    const result = await REGISTRY.mock.recommend({ query: clean });
    return {
      ok: true,
      ...result,
      requestedProvider: config.ai.provider,
      fallbackReason: `Ошибка провайдера: ${err.message}`,
    };
  }
}

export function providerInfo() {
  const { provider, fallback } = activeProvider();
  return {
    active: provider.name,
    requested: config.ai.provider,
    fallback,
    hasKey: Boolean(config.ai.apiKey),
  };
}

export const availableProviders = Object.keys(REGISTRY);
