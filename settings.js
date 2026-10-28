/**
 * Настройки сайта: заголовки, подзаголовок, примеры запросов.
 * Отдельный файл — чтобы редактор контента мог менять тексты
 * без пересборки шаблонов.
 */
import { read, update } from '../store.js';
import { seedSettings } from '../seed.js';

const NAME = 'settings';

export async function get() {
  const stored = await read(NAME, seedSettings);
  // Мягкое слияние с дефолтами: новые поля не ломают старые данные
  return {
    site: { ...seedSettings.site, ...(stored.site ?? {}) },
    blocks: Array.isArray(stored.blocks) ? stored.blocks : [],
  };
}

export async function saveSite(patch) {
  const current = await get();
  const next = {
    ...current,
    site: {
      ...current.site,
      ...patch,
      examples: Array.isArray(patch.examples)
        ? patch.examples.map((e) => String(e).trim()).filter(Boolean).slice(0, 8)
        : current.site.examples,
    },
  };
  await update(NAME, () => next);
  return next.site;
}

export async function setBlocks(blocks) {
  const current = await get();
  await update(NAME, () => ({ ...current, blocks }));
  return blocks;
}

export async function addBlock(block) {
  const current = await get();
  const blocks = [...current.blocks, block];
  await update(NAME, () => ({ ...current, blocks }));
  return blocks;
}

export async function removeBlock(id) {
  const current = await get();
  const blocks = current.blocks.filter((b) => b.id !== id);
  await update(NAME, () => ({ ...current, blocks }));
  return blocks;
}
