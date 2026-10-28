/**
 * Точка входа для локального запуска.
 *
 * Запуск: npm start
 * Разработка: npm run dev (перезапуск при изменении файлов)
 *
 * На Vercel файл не используется — там работает api/index.js.
 * Сборка приложения живёт в app.js, чтобы обе точки входа были одинаковыми.
 */
import { config, startupWarnings } from './src/config.js';
import { createServer } from './src/http/router.js';
import { createApp, ensureData } from './app.js';
import { driverName } from './src/db/store.js';
import * as sweepers from './src/security/sweeper.js';

async function main() {
  await ensureData();

  const server = createServer(createApp());

  server.listen(config.port, config.host, () => {
    const url = `http://${config.host}:${config.port}`;
    console.log('');
    console.log('  ╭──────────────────────────────────────────────╮');
    console.log('  │  DAYLUNG — подбор цифровых сервисов          │');
    console.log('  ╰──────────────────────────────────────────────╯');
    console.log('');
    console.log(`  Сайт:        ${url}`);
    console.log(`  Админка:     ${url}/admin`);
    console.log(`  Логин:       ${config.admin.user}`);
    console.log(`  Окружение:   ${config.env}`);
    console.log(`  Хранилище:   ${driverName()}`);
    console.log(`  AI-провайдер: ${config.ai.provider}${config.ai.apiKey ? ' (ключ задан)' : ' (без ключа)'}`);
    console.log('');

    const warnings = startupWarnings();
    if (warnings.length) {
      console.log('  ⚠  Обратите внимание:');
      for (const w of warnings) console.log(`     · ${w}`);
      console.log('');
    }
  });

  sweepers.start();

  const shutdown = (signal) => {
    console.log(`\n${signal}: останавливаю сервер…`);
    sweepers.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Не удалось запустить сервер:', err);
  process.exit(1);
});
