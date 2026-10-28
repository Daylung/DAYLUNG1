/**
 * Репозиторий сервисов.
 *
 * Ссылки: официальная и партнёрская хранятся отдельно.
 * Публичный слой сам решает, какую показывать, поэтому замена
 * партнёрской ссылки никогда не требует правки шаблонов.
 */
import { read, update } from '../store.js';
import { makeId, slugify, uniqueSlug } from '../../util/ids.js';

const NAME = 'services';

const PLATFORM_VALUES = ['web', 'ios', 'android', 'macos', 'windows', 'linux', 'vscode', 'jetbrains', 'github', 'gitlab'];

function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value ?? '')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function list({ includeUnpublished = false, categoryId = null } = {}) {
  const rows = await read(NAME, []);
  let filtered = rows;

  if (!includeUnpublished) filtered = filtered.filter((s) => s.published !== false);
  if (categoryId) filtered = filtered.filter((s) => s.categoryId === categoryId);

  return filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

export async function findById(id) {
  const rows = await read(NAME, []);
  return rows.find((s) => s.id === id) ?? null;
}

export async function findBySlug(slug) {
  const rows = await read(NAME, []);
  return rows.find((s) => s.slug === slug) ?? null;
}

export async function findManyByIds(ids) {
  const rows = await read(NAME, []);
  const map = new Map(rows.map((s) => [s.id, s]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

export function normalize(input, existing = null) {
  const errors = [];

  const name = String(input.name ?? '').trim();
  if (name.length < 2) errors.push('Название: минимум 2 символа');
  if (name.length > 60) errors.push('Название: максимум 60 символов');

  const categoryId = String(input.categoryId ?? '').trim();
  if (!categoryId) errors.push('Выберите категорию');

  const tagline = String(input.tagline ?? '').trim();
  if (tagline.length > 120) errors.push('Подзаголовок: максимум 120 символов');

  const url = String(input.url ?? '').trim();
  if (url && !/^https?:\/\//i.test(url)) errors.push('URL сайта должен начинаться с http:// или https://');

  const affiliateUrl = String(input.affiliateUrl ?? '').trim();
  if (affiliateUrl && !/^https?:\/\//i.test(affiliateUrl)) {
    errors.push('Партнёрская ссылка должна начинаться с http:// или https://');
  }

  const rating = Number(input.rating ?? 0);
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) errors.push('Рейтинг: число от 0 до 5');

  const priceValue = Number(input.priceValue ?? 0);
  if (!Number.isFinite(priceValue) || priceValue < 0) errors.push('Число в цене: не может быть отрицательным');

  const metrics = {
    quality: clamp(Number(input.metricQuality ?? 75)),
    price: clamp(Number(input.metricPrice ?? 75)),
    speed: clamp(Number(input.metricSpeed ?? 75)),
  };

  return {
    errors,
    value: {
      id: existing?.id ?? makeId('svc'),
      slug: existing?.slug ?? '',
      name,
      categoryId,
      tagline,
      description: String(input.description ?? '').trim(),
      logo: {
        text: (String(input.logoText ?? name).trim() || name).slice(0, 1).toUpperCase(),
        hue: Number.isFinite(Number(input.logoHue)) ? Number(input.logoHue) : (existing?.logo?.hue ?? 258),
      },
      price: String(input.price ?? '').trim(),
      priceValue: Math.round(priceValue),
      rating: Math.round(rating * 10) / 10,
      pros: toList(input.pros),
      cons: toList(input.cons),
      platforms: toList(input.platforms).filter((p) => PLATFORM_VALUES.includes(p)),
      metrics,
      url,
      affiliateUrl,
      published: input.published === undefined ? (existing?.published ?? true) : Boolean(input.published),
      featured: input.featured === undefined ? (existing?.featured ?? false) : Boolean(input.featured),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function clamp(n) {
  if (!Number.isFinite(n)) return 75;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function create(input) {
  const rows = await read(NAME, []);
  const { errors, value } = normalize(input);
  if (errors.length) return { ok: false, errors };

  value.slug = uniqueSlug(slugify(value.name), rows.map((s) => s.slug));

  await update(NAME, () => [...rows, value]);
  return { ok: true, value };
}

export async function edit(id, input) {
  const rows = await read(NAME, []);
  const index = rows.findIndex((s) => s.id === id);
  if (index === -1) return { ok: false, errors: ['Сервис не найден'] };

  const { errors, value } = normalize(input, rows[index]);
  if (errors.length) return { ok: false, errors };

  const next = [...rows];
  next[index] = value;
  await update(NAME, () => next);
  return { ok: true, value };
}

export async function remove(id) {
  const rows = await read(NAME, []);
  const next = rows.filter((s) => s.id !== id);
  if (next.length === rows.length) return false;
  await update(NAME, () => next);
  return true;
}

export async function setPublished(id, published) {
  const rows = await read(NAME, []);
  const next = rows.map((s) =>
    s.id === id ? { ...s, published: Boolean(published), updatedAt: new Date().toISOString() } : s,
  );
  await update(NAME, () => next);
  return next.find((s) => s.id === id) ?? null;
}

export const knownPlatforms = PLATFORM_VALUES;
