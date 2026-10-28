const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** 27 октября 2026 */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 27.10.2026, 14:32 */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** «5 минут назад» */
export function relativeTime(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return 'только что';

  const units = [
    [60, 'минуту', 'минуты', 'минут'],
    [3600, 'час', 'часа', 'часов'],
    [86400, 'день', 'дня', 'дней'],
    [2592000, 'месяц', 'месяца', 'месяцев'],
  ];

  for (let i = units.length - 1; i >= 0; i -= 1) {
    const [divisor, one, few, many] = units[i];
    if (diff >= divisor) {
      const value = Math.floor(diff / divisor);
      if (i === 0) {
        const mod10 = value % 10;
        const mod100 = value % 100;
        if (mod10 === 1 && mod100 !== 11) return `${value} ${one} назад`;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${value} ${few} назад`;
        return `${value} ${many} назад`;
      }
      return `${value} ${plural(value, one, few, many)} назад`;
    }
  }
  return 'только что';
}

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** 4820 → «4 820» */
export function formatNumber(n) {
  return new Intl.NumberFormat('ru-RU').format(Number(n) || 0);
}

/** Рейтинг 4.7 → «4.7» */
export function formatRating(n) {
  return (Math.round((Number(n) || 0) * 10) / 10).toFixed(1);
}
