/**
 * Репозиторий рекомендаций (опубликованные подборки).
 * Используется для счётчика на дашборде и для истории запросов.
 */
import { read, update } from '../store.js';
import { makeId } from '../../util/ids.js';

const NAME = 'recommendations';
const MAX_STORED = 200;

export async function list({ includeDrafts = false } = {}) {
  const rows = await read(NAME, []);
  const filtered = includeDrafts ? rows : rows.filter((r) => r.published !== false);
  return [...filtered].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function count({ includeDrafts = false } = {}) {
  return (await list({ includeDrafts })).length;
}

export async function record({ query, categorySlug, serviceIds, summary, published = false }) {
  const rows = await read(NAME, []);
  const entry = {
    id: makeId('rec'),
    query: String(query ?? '').slice(0, 300),
    categorySlug: categorySlug ?? null,
    serviceIds: Array.isArray(serviceIds) ? serviceIds.slice(0, 6) : [],
    summary: String(summary ?? '').slice(0, 600),
    published,
    createdAt: new Date().toISOString(),
  };

  const next = [entry, ...rows].slice(0, MAX_STORED);
  await update(NAME, () => next);
  return entry;
}

export async function remove(id) {
  const rows = await read(NAME, []);
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await update(NAME, () => next);
  return true;
}
