#!/usr/bin/env node
/**
 * npm run seed
 *
 * Создаёт недостающие файлы данных из seed. Существующие данные НЕ трогает.
 * Безопасно запускать сколько угодно раз.
 */
import { ensureSeed } from '../src/db/seedRunner.js';
import { config } from '../src/config.js';

await ensureSeed();
console.log(`✔ Данные проверены: ${config.dataDir}`);
console.log('  Существующие файлы не изменены.');
