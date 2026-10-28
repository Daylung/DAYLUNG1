/**
 * Репозиторий категорий.
 *
 * Единственное место, где читаются и пишутся категории.
 * Маршруты и шаблоны работают только через эти функции —
 * поэтому переход на настоящую БД затронет лишь этот файл.
 */
import { read, update } from '../store.js';
import { makeId, slugify, uniqueSlug } from '../../util/ids.js';

const NAME = 'categories';

export async function list({ includeDisabled = false } = {}) {
  const rows = await read(NAME, []);
  const filtered = includeDisabled ? rows : rows.filter((c) => c.enabled !== false);
  return [...filtered].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function findById(id) {
  const rows = await read(NAME, []);
  return rows.find((c) => c.id === id) ?? null;
}

export async function findBySlug(slug) {
  const rows = await read(NAME, []);
  return rows.find((c) => c.slug === slug) ?? null;
}

export async function countServices(categoryId, services) {
  return services.filter((s) => s.categoryId === categoryId && s.published !== false).length;
}

/** Ожидаемая форма для валидации входящих данных. */
export function normalize(input, existing = null) {
  const errors = [];
  const name = String(input.name ?? '').trim();
  if (name.length < 2) errors.push('Название: минимум 2 символа');
  if (name.length > 60) errors.push('Название: максимум 60 символов');

  const tagline = String(input.tagline ?? '').trim();
  if (tagline.length > 160) errors.push('Краткое описание: максимум 160 символов');

  const description = String(input.description ?? '').trim();
  if (description.length > 600) errors.push('Описание: максимум 600 символов');

  return {
    errors,
    value: {
      id: existing?.id ?? makeId('cat'),
      slug: existing?.slug ?? '',
      name,
      tagline,
      description,
      icon: String(input.icon ?? 'grid').trim() || 'grid',
      accent: /^#[0-9a-f]{6}$/i.test(input.accent ?? '') ? input.accent : '#7a5cff',
      order: Number.isFinite(Number(input.order)) ? Number(input.order) : (existing?.order ?? 999),
      enabled: input.enabled === undefined ? (existing?.enabled ?? true) : Boolean(input.enabled),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function create(input) {
  const rows = await read(NAME, []);
  const { errors, value } = normalize(input);
  if (errors.length) return { ok: false, errors };

  const taken = rows.map((c) => c.slug);
  value.slug = uniqueSlug(slugify(value.name), taken);

  const next = [...rows, value];
  await update(NAME, () => next);
  return { ok: true, value };
}

export async function edit(id, input) {
  const rows = await read(NAME, []);
  const index = rows.findIndex((c) => c.id === id);
  if (index === -1) return { ok: false, errors: ['Категория не найдена'] };

  const { errors, value } = normalize(input, rows[index]);
  if (errors.length) return { ok: false, errors };

  const next = [...rows];
  next[index] = value;
  await update(NAME, () => next);
  return { ok: true, value };
}

export async function remove(id) {
  const rows = await read(NAME, []);
  const next = rows.filter((c) => c.id !== id);
  if (next.length === rows.length) return false;
  await update(NAME, () => next);
  return true;
}

/** Перемещение в списке: пересчитываем порядок по массиву id. */
export async function reorder(orderedIds) {
  const rows = await read(NAME, []);
  const position = new Map(orderedIds.map((id, i) => [id, i + 1]));

  const next = rows.map((c) => ({
    ...c,
    order: position.has(c.id) ? position.get(c.id) : c.order,
    updatedAt: position.has(c.id) ? new Date().toISOString() : c.updatedAt,
  }));

  await update(NAME, () => next);
  return next.sort((a, b) => a.order - b.order);
}

export async function setEnabled(id, enabled) {
  const rows = await read(NAME, []);
  const next = rows.map((c) =>
    c.id === id ? { ...c, enabled: Boolean(enabled), updatedAt: new Date().toISOString() } : c,
  );
  await update(NAME, () => next);
  return next.find((c) => c.id === id) ?? null;
}

/** Следующий свободный порядковый номер. */
export async function nextOrder() {
  const rows = await read(NAME, []);
  return rows.reduce((max, c) => Math.max(max, c.order ?? 0), 0) + 1;
}
