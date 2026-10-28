/**
 * Безопасные шаблоны без внешних зависимостей.
 *
 * Правило: любая подстановка экранируется автоматически.
 * Если нужно вставить готовый HTML — оберните его в raw().
 * Забыть про экранирование здесь невозможно, и это главная
 * защита от XSS в пользовательском и админском интерфейсе.
 */

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

export function esc(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (ch) => ESCAPES[ch]);
}

/** Помеченный как безопасный фрагмент HTML. */
export class RawHtml {
  constructor(value) {
    this.value = String(value ?? '');
  }
  toString() {
    return this.value;
  }
}

export function raw(value) {
  return new RawHtml(value);
}

function stringify(value) {
  if (value instanceof RawHtml) return value.value;
  if (Array.isArray(value)) return value.map(stringify).join('');
  if (value === null || value === undefined || value === false) return '';
  if (value === true) return '';
  return esc(value);
}

/** Шаблонный литерал с автоэкранированием. */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += stringify(values[i]) + strings[i + 1];
  }
  return raw(out);
}

/** Собирает массив фрагментов в один. */
export function join(fragments) {
  return raw(fragments.map(stringify).join(''));
}

/** Условный рендер. */
export function when(condition, fragment) {
  return condition ? fragment : raw('');
}

/**
 * Ленивый условный рендер.
 *
 * when() вычисляет фрагмент всегда — если внутри обращение
 * к свойству возможно null-объекта, шаблон упадёт ещё до проверки.
 * lazyWhen принимает функцию и вызывает её только при истинном условии.
 */
export function lazyWhen(condition, factory) {
  return condition ? factory() : raw('');
}

/**
 * Собирает атрибуты, отбрасывая пустые значения.
 * Значения экранируются.
 */
export function attrs(map) {
  return Object.entries(map)
    .filter(([, v]) => v !== null && v !== undefined && v !== false && v !== '')
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`))
    .join('');
}
