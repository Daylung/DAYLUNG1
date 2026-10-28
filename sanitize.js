/**
 * ════════════════════════════════════════════════════════════
 *  ВАЛИДАЦИЯ КОДА И РАЗДЕЛЕНИЕ ТИПОВ ВВОДА
 * ════════════════════════════════════════════════════════════
 *
 *  Главное правило безопасности проекта:
 *  текстовая инструкция из админки НИКОГДА не исполняется
 *  на сервере. Между «хочу изменить сайт» и «сайт изменился»
 *  всегда стоит человек и явное подтверждение.
 *
 *  Четыре разных типа ввода обрабатываются по-разному:
 *
 *   instruction — текстовое описание желаемого изменения.
 *                 Сохраняется как строка, разбирается человеком
 *                 (или будущим AI-планировщиком) в список задач.
 *                 НЕ исполняется.
 *
 *   data        — структурированные данные (категория, сервис).
 *                 Валидируется по схеме репозитория.
 *
 *   component   — декларативная разметка из белого списка тегов.
 *                 Проходит санитизацию, скрипты вырезаются.
 *
 *   module      — JavaScript-модуль для Git-ветки.
 *                 Сохраняется в файл, но НЕ подключается
 *                 и НЕ исполняется до ревью и деплоя.
 */

/** Теги, которые разрешено использовать в компонентах. */
const ALLOWED_TAGS = new Set([
  'div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'main',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'em', 'b', 'i', 'u', 'small',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'button', 'figure', 'figcaption', 'blockquote', 'cite', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'picture', 'source', 'br', 'hr', 'svg', 'path', 'circle', 'rect', 'line', 'g', 'defs', 'linearGradient', 'stop',
]);

/** Теги, которые вырезаются вместе с содержимым. */
const FORBIDDEN_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'link', 'meta', 'base'];

/** Атрибуты-обработчики событий и опасные протоколы. */
const UNSAFE_ATTR = /^on/i;
const UNSAFE_URL = /^\s*(javascript|data|vbscript):/i;

const ALLOWED_ATTR = new Set([
  'class', 'id', 'href', 'src', 'alt', 'title', 'width', 'height', 'viewbox', 'fill', 'stroke',
  'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry',
  'x1', 'y1', 'x2', 'y2', 'points', 'opacity', 'aria-label', 'aria-hidden', 'role', 'target', 'rel',
  'loading', 'decoding', 'type', 'colspan', 'rowspan',
]);

export const MAX_COMPONENT_BYTES = 60_000;
export const MAX_INSTRUCTION_CHARS = 4_000;
export const MAX_CODE_BYTES = 120_000;

/**
 * Санитизация HTML-компонента.
 * Работает без DOM-парсера: вырезает запрещённые блоки целиком,
 * затем фильтрует теги и атрибуты по белому списку.
 */
export function sanitizeComponent(input) {
  const warnings = [];
  let source = String(input ?? '');

  if (source.length > MAX_COMPONENT_BYTES) {
    return { ok: false, error: `Компонент больше ${Math.round(MAX_COMPONENT_BYTES / 1000)} КБ`, html: '', warnings };
  }

  // 1. Удаляем опасные блоки вместе с содержимым
  for (const tag of FORBIDDEN_TAGS) {
    const blockRe = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    const selfRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    if (blockRe.test(source) || selfRe.test(source)) {
      warnings.push(`Удалён небезопасный тег <${tag}>`);
    }
    source = source.replace(blockRe, '').replace(selfRe, '');
  }

  // 2. Удаляем HTML-комментарии (могут скрывать условные комментарии IE)
  source = source.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Фильтруем каждый тег
  source = source.replace(/<\/?([a-zA-Z][\w:-]*)([^>]*)>/g, (match, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag) && !ALLOWED_TAGS.has(rawTag)) return '';

    const attrs = filterAttrs(rawAttrs, warnings);
    return match.startsWith('</') ? `</${rawTag}>` : `<${rawTag}${attrs}>`;
  });

  // 4. Подозрительные конструкции, которые прошли фильтр
  if (/<[^>]*\son\w+\s*=/i.test(source)) {
    warnings.push('Найдены обработчики событий — удалены');
  }

  return { ok: true, html: source.trim(), warnings: [...new Set(warnings)] };
}

function filterAttrs(rawAttrs, warnings) {
  let out = '';
  const attrRe = /([a-zA-Z_:][\w:.-]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;

  while ((m = attrRe.exec(rawAttrs)) !== null) {
    const name = m[1];
    const value = m[3] ?? m[4] ?? m[5] ?? '';
    const lower = name.toLowerCase();

    if (UNSAFE_ATTR.test(lower)) {
      warnings.push(`Удалён обработчик ${name}`);
      continue;
    }
    if (!ALLOWED_ATTR.has(lower)) continue;
    if ((lower === 'href' || lower === 'src') && UNSAFE_URL.test(value)) {
      warnings.push('Удалена ссылка с небезопасным протоколом');
      continue;
    }
    out += value ? ` ${lower}="${escapeAttr(value)}"` : ` ${lower}`;
  }

  return out;
}

function escapeAttr(value) {
  return String(value).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Проверка JavaScript-модуля.
 *
 * Модуль НЕ исполняется. Мы лишь ищем очевидно опасные конструкции,
 * чтобы владелец увидел предупреждение до сохранения в ветку.
 * Финальное решение — за человеком на этапе ревью.
 */
const DANGEROUS_PATTERNS = [
  { re: /\brequire\s*\(\s*['"]child_process['"]/, msg: 'Вызов child_process — исполнение системных команд' },
  { re: /\bimport\s*\(\s*['"]node:child_process['"]/, msg: 'Импорт child_process' },
  { re: /\bexec(Sync)?\s*\(/, msg: 'Вызов exec() — исполнение системных команд' },
  { re: /\bspawn(Sync)?\s*\(/, msg: 'Вызов spawn()' },
  { re: /\beval\s*\(/, msg: 'eval() — исполнение произвольной строки как кода' },
  { re: /new\s+Function\s*\(/, msg: 'new Function() — динамическое создание кода' },
  { re: /\bfs\.(unlink|rm|rmdir|writeFile|appendFile)/, msg: 'Операции записи и удаления в файловой системе' },
  { re: /process\.env\s*\[?\s*['"]?[A-Z_]*KEY/, msg: 'Попытка чтения API-ключа из окружения' },
  { re: /https?:\/\/(?!example\.com)/, msg: 'Внешний сетевой адрес — исходящие запросы' },
];

export function inspectCode(input) {
  const source = String(input ?? '');
  const findings = [];

  if (source.length > MAX_CODE_BYTES) {
    return { ok: false, error: `Код больше ${Math.round(MAX_CODE_BYTES / 1000)} КБ`, findings };
  }

  for (const { re, msg } of DANGEROUS_PATTERNS) {
    if (re.test(source)) findings.push(msg);
  }

  // Простейшая проверка парности скобок — ловит обрезанный вставкой код
  const balance = checkBalance(source);
  if (!balance.ok) findings.push(balance.message);

  return {
    ok: true,
    findings: [...new Set(findings)],
    // «Чистый» код всё равно не исполняется автоматически
    executable: false,
    note: 'Код сохранён как файл в ветке предпросмотра и не подключён к работающему сайту.',
  };
}

function checkBalance(source) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  let inString = null;
  let inComment = null;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inComment === 'line') {
      if (ch === '\n') inComment = null;
      continue;
    }
    if (inComment === 'block') {
      if (ch === '*' && next === '/') { inComment = null; i += 1; }
      continue;
    }
    if (inString) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === '/' && next === '/') { inComment = 'line'; i += 1; continue; }
    if (ch === '/' && next === '*') { inComment = 'block'; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }

    if (ch in pairs) stack.push(pairs[ch]);
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (stack.pop() !== ch) {
        return { ok: false, message: 'Нарушен баланс скобок — код обрезан или повреждён' };
      }
    }
  }

  if (stack.length) return { ok: false, message: 'Не закрыты скобки — код обрезан или повреждён' };
  return { ok: true };
}

/**
 * Разбор текстовой инструкции в задачи.
 *
 * Это НЕ исполнение кода. Мы лишь извлекаем из текста
 * предполагаемое действие, чтобы показать человеку,
 * что именно будет изменено.
 */
export function parseInstruction(input) {
  const text = String(input ?? '').trim();

  if (!text) return { ok: false, error: 'Опишите, что нужно изменить' };
  if (text.length > MAX_INSTRUCTION_CHARS) {
    return { ok: false, error: `Инструкция длиннее ${MAX_INSTRUCTION_CHARS} символов` };
  }

  const lower = text.toLowerCase();
  const tasks = [];

  const rules = [
    {
      action: 'category.create',
      test: /(добав|созда|new).*(категор|раздел)/,
      describe: 'Создать новую категорию',
    },
    {
      action: 'category.reorder',
      test: /(перестав|поменяй|сдвин|порядок)/,
      describe: 'Изменить порядок категорий',
    },
    {
      action: 'service.create',
      test: /(добав|созда).*(сервис|продукт)/,
      describe: 'Добавить сервис',
    },
    {
      action: 'service.update',
      test: /(измен|обнов|правь|редактир).*(сервис|продукт|цен|рейтинг)/,
      describe: 'Изменить данные сервиса',
    },
    {
      action: 'design.tweak',
      test: /(дизайн|цвет|шрифт|отступ|карточк|стил)/,
      describe: 'Изменить оформление',
    },
    {
      action: 'content.edit',
      test: /(текст|заголов|подзаголов|описан|копирайт)/,
      describe: 'Изменить текст на сайте',
    },
  ];

  for (const rule of rules) {
    if (rule.test.test(lower)) tasks.push({ action: rule.action, description: rule.describe });
  }

  // Названия в кавычках — вероятные сущности (категория, сервис)
  const quoted = [...text.matchAll(/[«"']([^»"']{2,60})[»"']/g)].map((m) => m[1].trim());

  if (!tasks.length) {
    tasks.push({ action: 'manual.review', description: 'Требуется ручной разбор — автоматически действие не распознано' });
  }

  return {
    ok: true,
    instruction: text,
    tasks,
    entities: quoted,
    // Ключевое поле: инструкция никогда не исполняется
    executesAutomatically: false,
  };
}
