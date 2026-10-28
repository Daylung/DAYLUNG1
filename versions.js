/**
 * ════════════════════════════════════════════════════════════
 *  СИСТЕМА ВЕРСИЙ, ПРЕДПРОСМОТРА И РЕЗЕРВНЫХ КОПИЙ
 * ════════════════════════════════════════════════════════════
 *
 *  Жизненный цикл изменения:
 *
 *   1. draft      — черновик. Написан текст инструкции, вставлен
 *                   компонент или код. Рабочий сайт не затронут.
 *   2. preview    — создана отдельная версия-предпросмотр.
 *                   Снимок всех данных сохранён в data/versions/.
 *                   Посмотреть можно по /preview/<id>, посетители
 *                   основной версии ничего не увидят.
 *   3. applied    — владелец нажал «Применить». Снимок записан
 *                   в рабочую ветку. Перед этим старая рабочая
 *                   версия ушла в data/backups/.
 *   4. discarded  — предпросмотр отменён, снимок удалён.
 *
 *  Откат: любая применённая версия может быть восстановлена —
 *  её снимок снова становится рабочим, а текущая уходит в бэкапы.
 *
 *  Важно: применение НЕ исполняет присланный код. Код лежит в
 *  ветке как файл и требует отдельного деплоя.
 */
import { read, write, writeRaw, readRaw, listBlobKeys, deleteBlob } from '../db/store.js';
import { makeId } from '../util/ids.js';

const NAME = 'versions';

/* Ключи блобов в хранилище: не зависят от файловой системы. */
const snapshotKey = (versionId) => `version:${versionId}`;
const backupKey = (name) => `backup:${name}`;

/** Таблицы, которые попадают в снимок. */
const SNAPSHOT_TABLES = ['categories', 'services', 'recommendations', 'settings'];

export async function list() {
  const rows = await read(NAME, []);
  return [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function findById(id) {
  const rows = await read(NAME, []);
  return rows.find((v) => v.id === id) ?? null;
}

export async function current() {
  const rows = await list();
  return rows.find((v) => v.status === 'applied') ?? null;
}

/** Следующий номер версии: v1.4 после v1.3. */
function nextLabel(rows) {
  const applied = rows.filter((v) => v.status === 'applied');
  const numbers = applied
    .map((v) => String(v.label ?? '').replace(/^v/, '').split('.').map(Number))
    .filter((parts) => parts.length === 2 && parts.every(Number.isFinite));

  if (!numbers.length) return 'v1.0';

  const max = numbers.reduce((best, cur) => {
    if (cur[0] > best[0]) return cur;
    if (cur[0] === best[0] && cur[1] > best[1]) return cur;
    return best;
  }, numbers[0]);

  return `v${max[0]}.${max[1] + 1}`;
}

/** Снимок всех данных. */
export async function takeSnapshot() {
  const snapshot = { takenAt: new Date().toISOString(), tables: {} };

  for (const table of SNAPSHOT_TABLES) {
    snapshot.tables[table] = await read(table, table === 'settings' ? {} : []);
  }

  return snapshot;
}

async function persistSnapshot(versionId, snapshot) {
  await writeRaw(snapshotKey(versionId), snapshot);
}

async function loadPersistedSnapshot(versionId) {
  return readRaw(snapshotKey(versionId), null);
}

/**
 * Есть ли у версии сохранённый снимок, из которого можно восстановить состояние.
 * Только чтение — без побочных эффектов.
 */
export async function hasSnapshot(versionId) {
  const direct = await loadPersistedSnapshot(versionId);
  if (direct) return true;
  return (await loadLatestBackup(versionId)) !== null;
}

/** Помечает каждую версию флагом restoreable — для списка в админке. */
export async function listWithRestoreFlag() {
  const rows = await list();
  return Promise.all(
    rows.map(async (v) => ({ ...v, restoreable: await hasSnapshot(v.id) })),
  );
}

/**
 * Создаёт предпросмотр: фиксирует текущее состояние как базу
 * и описывает предполагаемое изменение.
 */
export async function createPreview({ title, description, author, instruction, componentHtml, code, type }) {
  const rows = await read(NAME, []);
  const snapshot = await takeSnapshot();
  const id = makeId('ver');

  const version = {
    id,
    label: `${nextLabel(rows)}-preview`,
    title: String(title ?? 'Без названия').slice(0, 120),
    description: String(description ?? '').slice(0, 1000),
    author: author ?? 'owner',
    type: type ?? 'content',
    status: 'preview',
    createdAt: new Date().toISOString(),
    appliedAt: null,
    // Текст инструкции хранится как данные, не как код
    instruction: String(instruction ?? '').slice(0, 4000),
    componentHtml: String(componentHtml ?? ''),
    code: String(code ?? ''),
    baseVersionId: rows.find((v) => v.status === 'applied')?.id ?? null,
    tasks: [],
  };

  await persistSnapshot(id, snapshot);
  await write(NAME, [...rows, version]);
  return version;
}

/**
 * Применяет версию: старая рабочая уходит в бэкап,
 * снимок предпросмотра становится текущим состоянием.
 */
export async function apply(versionId) {
  const rows = await read(NAME, []);
  const version = rows.find((v) => v.id === versionId);
  if (!version) return { ok: false, error: 'Версия не найдена' };
  if (version.status !== 'preview') {
    return { ok: false, error: 'Применить можно только предпросмотр' };
  }

  const snapshot = await loadPersistedSnapshot(versionId);
  if (!snapshot) {
    return { ok: false, error: 'Снимок предпросмотра повреждён или удалён' };
  }

  const active = rows.find((v) => v.status === 'applied');

  // 1. Резервная копия текущего рабочего состояния
  if (active) {
    const currentSnapshot = await takeSnapshot();
    await writeRaw(backupKey(`${active.id}-${Date.now()}`), currentSnapshot);
  }

  // 2. Записываем снимок предпросмотра как рабочее состояние
  for (const table of SNAPSHOT_TABLES) {
    if (snapshot.tables[table] !== undefined) {
      await write(table, snapshot.tables[table]);
    }
  }

  // 3. Обновляем статусы
  const now = new Date().toISOString();
  const next = rows.map((v) => {
    if (v.id === versionId) {
      return { ...v, status: 'applied', appliedAt: now, label: String(v.label).replace('-preview', '') };
    }
    if (v.status === 'applied') {
      return { ...v, status: 'archived', archivedAt: now };
    }
    return v;
  });

  await write(NAME, next);
  return { ok: true, version: next.find((v) => v.id === versionId) };
}

export async function discard(versionId) {
  const rows = await read(NAME, []);
  const version = rows.find((v) => v.id === versionId);
  if (!version) return { ok: false, error: 'Версия не найдена' };
  if (version.status === 'applied') {
    return { ok: false, error: 'Рабочую версию нельзя отменить — используйте откат' };
  }

  const next = rows.filter((v) => v.id !== versionId);
  await write(NAME, next);

  await deleteBlob(snapshotKey(versionId));

  return { ok: true };
}

/**
 * Откат к любой архивной версии.
 * Восстанавливает снимок, если он есть; иначе создаёт
 * предпросмотр с текущими данными.
 */
/**
 * Последняя резервная копия указанной версии.
 *
 * Копии пишутся как `${versionId}-${timestamp}.json`, поэтому берём файл
 * с нужным префиксом и максимальной меткой времени.
 */
async function loadLatestBackup(versionId) {
  try {
    const own = await listBlobKeys(backupKey(`${versionId}-`));
    if (!own.length) return null;

    const raw = await readRaw(own[own.length - 1], null);
    if (!raw) return null;

    // Приводим к тому же виду, что и снапшот предпросмотра
    return raw.tables ? raw : { tables: raw };
  } catch {
    return null;
  }
}

export async function restore(versionId) {
  const rows = await read(NAME, []);
  const target = rows.find((v) => v.id === versionId);
  if (!target) return { ok: false, code: 'not_found', error: 'Версия не найдена' };

  let snapshot = await loadPersistedSnapshot(versionId);

  // Фолбэк: у версий, применённых до включения снапшотов (сидовые v1.0–v1.3),
  // файла в data/versions/ нет, зато есть резервная копия, снятая при публикации.
  // Без этого откат к ним был невозможен, хотя данные для отката существуют.
  if (!snapshot) {
    snapshot = await loadLatestBackup(versionId);
  }

  if (!snapshot) {
    return {
      ok: false,
      code: 'no_snapshot',
      error: 'Невозможно восстановить эту версию: сохранённый снимок отсутствует',
    };
  }

  // Бэкап текущего состояния перед откатом
  const currentSnapshot = await takeSnapshot();
  await writeRaw(backupKey(`before-restore-${Date.now()}`), currentSnapshot);

  for (const table of SNAPSHOT_TABLES) {
    if (snapshot.tables[table] !== undefined) {
      await write(table, snapshot.tables[table]);
    }
  }

  const now = new Date().toISOString();
  const restoreEntry = {
    id: makeId('ver'),
    label: `${nextLabel(rows)}`,
    title: `Откат к ${target.label}`,
    description: `Восстановлено состояние версии ${target.label} от ${target.createdAt}.`,
    author: 'owner',
    type: 'rollback',
    status: 'applied',
    createdAt: now,
    appliedAt: now,
    restoredFrom: target.id,
    instruction: '',
    componentHtml: '',
    code: '',
    baseVersionId: null,
    tasks: [],
  };

  const next = rows.map((v) =>
    v.status === 'applied' ? { ...v, status: 'archived', archivedAt: now } : v,
  );

  await write(NAME, [...next, restoreEntry]);
  return { ok: true, version: restoreEntry };
}

/** Список доступных резервных копий (ключи блобов, новые сверху). */
export async function listBackups() {
  try {
    const keys = await listBlobKeys(backupKey(''));
    return keys
      .sort()
      .reverse()
      .map((key) => {
        const name = key.slice(backupKey('').length);
        return { file: `${name}.json`, createdAt: name.split('-').pop() };
      });
  } catch {
    return [];
  }
}

export async function stats() {
  const rows = await list();
  return {
    total: rows.length,
    applied: rows.filter((v) => v.status === 'applied').length,
    preview: rows.filter((v) => v.status === 'preview').length,
    archived: rows.filter((v) => v.status === 'archived').length,
  };
}
