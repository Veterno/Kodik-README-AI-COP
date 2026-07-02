#!/usr/bin/env node
'use strict';

/**
 * src/index.js — точка входа Kodik README AI.
 *
 * Алгоритм:
 *   1. tree.buildFileTree           — дерево файлов проекта
 *   2. manifest.findManifest        — поиск манифеста
 *   3. mainFile.findMainFile        — поиск главного файла
 *   4. interactive.runInteractive   — опрос (если не --non-interactive)
 *   5. contextCollector.collectBusinessContext — сбор бизнес-контекста
 *   6. generateReadme.generateReadme — генерация README (локально, без AI)
 *   7. saveReadme.saveReadme        — запись README.md
 *
 * Запуск: `node src/index.js [путь_к_проекту] [--non-interactive]`
 */

const fs = require('fs');
const path = require('path');
const process = require('process');

require('dotenv').config();

const { log } = require('./logger');
const { buildFileTree, collectFlatFileList } = require('./tree');
const { findManifest } = require('./manifest');
const { findMainFile } = require('./mainFile');
const { generateReadme } = require('./generateReadme');
const { saveReadme } = require('./saveReadme');
const { runInteractive } = require('./interactive');
const { collectBusinessContext } = require('./contextCollector');
const { collectCodeContext } = require('./codeContext');

async function main() {
  console.log('\n\x1b[1m\x1b[35m📝 Kodik README AI\x1b[0m — автоматический генератор README.md\n');

  // Ручной разбор аргументов (без minimist)
  const args = process.argv.slice(2);
  const flags = { nonInteractive: args.includes('--non-interactive') };
  const cliArg = args.find(a => !a.startsWith('--')); // первый позиционный аргумент

  const targetDir = path.resolve(cliArg || process.env.TARGET_DIR || process.cwd());

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    log.error(`Указанная папка не существует или не является директорией: ${targetDir}`);
    process.exit(1);
  }

  log.info(`Целевая папка: ${targetDir}`);

  // 1. Дерево + плоский список файлов
  log.step('Шаг 1/6. Сканирую структуру проекта…');
  const tree = buildFileTree(targetDir);
  const flatFiles = collectFlatFileList(targetDir);
  log.ok('Структура файлов получена.');

  // 2. Манифест
  log.step('Шаг 2/6. Ищу файл манифеста…');
  const manifest = findManifest(targetDir);
  if (manifest) log.ok(`Найден манифест: ${manifest.name}`);
  else log.warn('Манифест не найден — продолжаю без него.');

  // 3. Главный файл
  log.step('Шаг 3/6. Ищу главный файл исходного кода…');
  const mainFile = findMainFile(targetDir, manifest);
  if (mainFile) log.ok(`Найден главный файл: ${mainFile.name}`);
  else log.warn('Главный файл не найден — продолжаю без него.');

  // 4. Интерактивный опрос
  log.step('Шаг 4/6. Провожу интерактивный опрос (если не отключен)…');
  const interactiveAnswers = await runInteractive(flags);
  if (!flags.nonInteractive) {
    log.ok('Опрос завершён.');
  } else {
    log.info('Режим --non-interactive: используются значения по умолчанию.');
  }

  // 5. Сбор бизнес-контекста
  log.step('Шаг 5/6. Собираю бизнес-контекст (Git-логи, документы)…');
  const businessContext = collectBusinessContext(targetDir);
  log.ok('Бизнес-контекст собран.');

  // 6. Генерация README (локально, без AI)
  log.step('Шаг 6/6. Генерирую README на основе стека…');
  let markdown;
  let stack;
  try {
    const result = await generateReadme({
      projectName: path.basename(targetDir),
      tree,
      flatFiles,
      manifest,
      mainFile,
      interactiveAnswers,
      businessContext,
    });
    markdown = result.markdown;
    stack = result.stack;
    log.ok(`Стек: ${stack.language || 'не определён'}${stack.framework ? ' + ' + stack.framework : ''}.`);
    log.ok('README сгенерирован локально.');
  } catch (err) {
    log.error(`Ошибка при генерации README: ${err.message}`);
    process.exit(1);
  }

  // 7. Сохранение
  log.step('Сохраняю README.md…');
  try {
    const outPath = saveReadme(targetDir, markdown);
    log.ok(`README.md успешно создан: ${outPath}`);
  } catch (err) {
    log.error(`Не удалось сохранить README.md: ${err.message}`);
    process.exit(1);
  }

  console.log('\n\x1b[32m\x1b[1m✓ Готово!\x1b[0m Файл README.md сгенерирован.\n');
}

process.on('unhandledRejection', (reason) => {
  log.error(`Необработанное отклонение Promise: ${reason instanceof Error ? reason.message : reason}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  log.error(`Непредвиденная ошибка: ${err.message}`);
  process.exit(1);
});

main();