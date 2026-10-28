import crypto from 'node:crypto';

/** Короткий читаемый идентификатор: cat_k3f9x2. */
export function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

/** Слаг из произвольной строки, включая кириллицу. */
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export function slugify(input) {
  const transliterated = String(input ?? '')
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('');

  const slug = transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return slug || 'item';
}

/** Уникальный слаг в пределах списка занятых. */
export function uniqueSlug(base, taken) {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Безопасное сравнение строк постоянного времени. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  if (bufA.length !== bufB.length) {
    // Всё равно считаем хеш, чтобы время не зависело от длины
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
