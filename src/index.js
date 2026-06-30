#!/usr/bin/env node
'use strict';
/**
 * src/index.js — точка входа Kodik README AI.
 *
 * Алгоритм (см. документацию по модулям):
 *   1. tree.buildFileTree           — дерево файлов проекта
 *   2. manifest.findManifest        — поиск package.json / requirements.txt / ...
 *   3. mainFile.findMainFile        — поиск главного файла кода
 *   4. generateReadme.generateReadme — определение стека + запрос к Kodik AI
 *   5. saveReadme.saveReadme        — запись README.md с резервной копией
 *
 * Запуск: `node src/index.js [путь_к_проекту]` или `npm start`.
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
async function main() {
  console.log('\n\x1b[1m\x1b[35m📝 Kodik README AI\x1b[0m — автоматический генератор README.md\n');
  const cliArg = process.argv[2];
  const targetDir = path.resolve(cliArg || process.env.TARGET_DIR || process.cwd());
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    log.error(`Указанная папка не существует или не является директорией: ${targetDir}`);
    process.exit(1);
  }
  log.info(`Целевая папка: ${targetDir}`);
  // 1. Дерево + плоский список файлов
  log.step('Шаг 1/5. Сканирую структуру проекта…');
  const tree = buildFileTree(targetDir);
  const flatFiles = collectFlatFileList(targetDir);
  log.ok('Структура файлов получена.');
  // 2. Манифест
  log.step('Шаг 2/5. Ищу файл манифеста…');
  const manifest = findManifest(targetDir);
  if (manifest) log.ok(`Найден манифест: ${manifest.name}`);
  else log.warn('Манифест не найден — продолжаю без него.');
  // 3. Главный файл
  log.step('Шаг 3/5. Ищу главный файл исходного кода…');
  const mainFile = findMainFile(targetDir, manifest);
  if (mainFile) log.ok(`Найден главный файл: ${mainFile.name}`);
  else log.warn('Главный файл не найден — продолжаю без него.');
  // 4. Определение стека + запрос в Kodik AI
  log.step('Шаг 4/5. Анализирую стек и отправляю запрос в Kodik AI…');
  let markdown;
  let stack;
  try {
    const result = await generateReadme({
      projectName: path.basename(targetDir),
      tree,
      flatFiles,
      manifest,
      mainFile,
    });
    markdown = result.markdown;
    stack = result.stack;
    log.ok(`Стек: ${stack.language || 'не определён'}${stack.framework ? ' + ' + stack.framework : ''}.`);
    log.ok('Ответ от Kodik AI получен.');
  } catch (err) {
    log.error(`Ошибка при обращении к Kodik AI: ${err.message}`);
    log.info('Проверьте интернет-соединение, переменные .env и доступность API.');
    process.exit(1);
  }
  // 5. Сохранение
  log.step('Шаг 5/5. Сохраняю README.md…');
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