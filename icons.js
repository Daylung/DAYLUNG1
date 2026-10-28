/**
 * Набор иконок проекта.
 *
 * Один источник правды: иконки вставлены инлайном как SVG-пути,
 * поэтому не нужны шрифты, спрайты и лишние запросы.
 * Чтобы добавить новую — допишите запись в ICONS.
 */
import { raw } from '../render/html.js';

const ICONS = {
  sparkles: '<path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5"/><circle cx="12" cy="12" r="3.2"/>',
  shield: '<path d="M12 3l7.5 3.4v5.2c0 4.4-3.1 7.8-7.5 9.4-4.4-1.6-7.5-5-7.5-9.4V6.4z"/><path d="M9.2 12.2l2.1 2.1 3.8-4"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12.5h18"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  arrow: '<path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5"/>',
  arrowUp: '<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16M9.5 7V5h5v2M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14.5 5.5l4 4"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.5 5.8A10.5 10.5 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 4"/><path d="M6.3 7.9A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1.2 0 2.3-.2 3.3-.6"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 17.5l9 5 9-5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5V10h5.5"/><path d="M12 8v4.3l3 1.7"/>',
  code: '<path d="M8.5 8 4 12l4.5 4M15.5 8 20 12l-4.5 4M13.5 4.5l-3 15"/>',
  wand: '<path d="M4 20 15 9"/><path d="M13.5 4.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/><path d="M19 13l.7 1.3 1.3.7-1.3.7-.7 1.3-.7-1.3-1.3-.7 1.3-.7z"/>',
  shieldCheck: '<path d="M12 3l7.5 3.4v5.2c0 4.4-3.1 7.8-7.5 9.4-4.4-1.6-7.5-5-7.5-9.4V6.4z"/><path d="M8.8 11.8l2.3 2.3 4.1-4.4"/>',
  star: '<path d="M12 3.6l2.5 5.6 5.9.7-4.3 4.1 1.1 5.9L12 17l-5.2 2.9 1.1-5.9L3.6 9.9l5.9-.7z"/>',
  home: '<path d="M4 10.5 12 3l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  logout: '<path d="M9 4.5H5.5A1.5 1.5 0 0 0 4 6v12a1.5 1.5 0 0 0 1.5 1.5H9"/><path d="M15.5 8 20 12l-4.5 4M20 12H9"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  alert: '<path d="M12 4 2.8 20h18.4z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v15.5H5.5A1.5 1.5 0 0 0 4 21z"/><path d="M4 5.5v15"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
  arrowRight: '<path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5"/>',
  arrowLeft: '<path d="M19 12H6M11.5 5.5 5 12l6.5 6.5"/>',
};

/**
 * Возвращает SVG-иконку.
 * @param {string} name — ключ из ICONS
 * @param {object} opts — { size, class, stroke }
 */
export function icon(name, opts = {}) {
  const path = ICONS[name] ?? ICONS.grid;
  const size = opts.size ?? 20;
  const cls = opts.class ? ` class="${opts.class}"` : '';
  const stroke = opts.stroke ?? 1.7;

  return raw(
    `<svg${cls} viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" ` +
    `style="fill:none;stroke:currentColor;stroke-width:${stroke};stroke-linecap:round;stroke-linejoin:round">` +
    `${path}</svg>`,
  );
}

export const iconNames = Object.keys(ICONS);
