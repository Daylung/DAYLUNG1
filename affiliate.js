/**
 * ════════════════════════════════════════════════════════════
 *  ПАРТНЁРСКИЕ ССЫЛКИ И УЧЁТ ПЕРЕХОДОВ
 * ════════════════════════════════════════════════════════════
 *
 *  Правила:
 *  • frontend никогда не знает, партнёрская ссылка или нет —
 *    он всегда вызывает outboundUrl(service);
 *  • при включённом AFFILIATE_TRACKING ссылка идёт через /go/:id,
 *    где фиксируется клик и происходит 302 на нужный адрес;
 *  • отключить партнёрские ссылки можно одной переменной
 *    окружения, без правки кода;
 *  • если партнёрская ссылка пуста, используется официальная.
 */
import { config } from '../config.js';
import { read, update } from '../db/store.js';

const CLICKS = 'clicks';
const MAX_CLICKS = 5000;

/** Куда в итоге ведёт ссылка. */
export function resolveTarget(service) {
  if (!service) return null;
  const affiliate = String(service.affiliateUrl ?? '').trim();
  const official = String(service.url ?? '').trim();

  if (affiliate && config.affiliate.tracking) return affiliate;
  if (affiliate && !config.affiliate.tracking) return official || affiliate;
  return official;
}

export function isAffiliate(service) {
  return Boolean(String(service?.affiliateUrl ?? '').trim());
}

/**
 * Публичная ссылка для шаблонов.
 * При включённом трекинге — внутренний редирект, иначе прямой адрес.
 */
export function outboundUrl(service) {
  const target = resolveTarget(service);
  if (!target) return null;
  return config.affiliate.tracking ? `/go/${service.id}` : target;
}

/** Отображается ли пометка «партнёрская ссылка». */
export function showsDisclosure(service) {
  return isAffiliate(service) && config.affiliate.tracking;
}

export async function recordClick({ serviceId, referer, userAgent }) {
  const clicks = await read(CLICKS, []);
  const entry = {
    serviceId,
    at: new Date().toISOString(),
    referer: referer ? String(referer).slice(0, 300) : null,
    userAgent: userAgent ? String(userAgent).slice(0, 200) : null,
  };

  const next = [entry, ...clicks].slice(0, MAX_CLICKS);
  await update(CLICKS, () => next);
  return entry;
}

export async function clickStats() {
  const clicks = await read(CLICKS, []);
  const byService = new Map();

  for (const c of clicks) {
    byService.set(c.serviceId, (byService.get(c.serviceId) ?? 0) + 1);
  }

  return {
    total: clicks.length,
    byService: Object.fromEntries(byService),
    recent: clicks.slice(0, 10),
  };
}

export function status() {
  return {
    trackingEnabled: config.affiliate.tracking,
    mode: config.affiliate.tracking ? 'redirect' : 'direct',
  };
}
