#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
require('dotenv').config();

const { log, initLogger, closeLogger } = require('./logger');
const { findMainFile } = require('./mainFile');
const { generateReadme } = require('./generateReadme');
const { saveReadme } = require('./saveReadme');
const { runInteractive } = require('./interactive');
const { collectBusinessContext } = require('./contextCollector');
const { collectCodeContext } = require('./codeContext');
const { scanProject } = require('./scanner');
const { finalScan } = require('./finalScanner');
const { validateReadme } = require('./validator');
const { resolveOptions } = require('./options');
const pkg = require('../package.json');

async function main(customArgv) {
  initLogger();

  const argv = customArgv || yargs(hideBin(process.argv))
    .usage('Использование: $0 [target] [options]')
    .positional('target', {
      describe: 'Путь к проекту (целевая директория)',
      type: 'string'
    })
    .option('t', {
      alias: 'target',
      describe: 'Путь к проекту',
      type: 'string'
    })
    .option('n', {
      alias: 'non-interactive',
      describe: 'Пропустить интерактивный опрос',
      type: 'boolean'
    })
    .option('ai', {
      describe: 'Включить AI-генерацию',
      type: 'boolean'
    })
    .option('m', {
      alias: 'model',
      describe: 'Модель AI',
      type: 'string'
    })
    .option('api-url', {
      describe: 'URL API',
      type: 'string'
    })
    .option('api-key', {
      describe: 'API-ключ',
      type: 'string'
    })
    .option('tone', {
      describe: 'Тон описания',
      choices: ['technical', 'marketing', 'minimal'],
      type: 'string'
    })
    .option('l', {
      alias: 'language',
      describe: 'Язык для перевода',
      type: 'string'
    })
    .option('no-translate', {
      describe: 'Отключить финальный перевод',
      type: 'boolean'
    })
    .option('o', {
      alias: 'output',
      describe: 'Папка для сохранения README.md',
      type: 'string'
    })
    .option('c', {
      alias: 'config',
      describe: 'Путь к файлу конфигурации (JSON/YAML)',
      type: 'string'
    })
    .option('validate', {
      describe: 'Запустить валидацию после генерации',
      type: 'boolean'
    })
    .option('projectName', {
      describe: 'Явное название проекта (переопределяет package.json)',
      type: 'string'
    })
    .option('dry-run', {
      describe: 'Показать результат без сохранения',
      type: 'boolean'
    })
    .option('translate-section', {
      describe: 'Секции для перевода (можно несколько)',
      type: 'array'
    })
    .example('$0 .', 'Сгенерировать README для текущей папки')
    .example('$0 ./my-project --non-interactive', 'Тихая генерация с дефолтами')
    .example('$0 --tone marketing --language en', 'Маркетинговый тон на английском')
    .help('h')
    .alias('h', 'help')
    .version('v', 'Показать версию', pkg.version)
    .alias('v', 'version')
    .wrap(null)
    .argv;

  console.log('\n\x1b[1m\x1b[35m📝 Kodik README AI\x1b[0m — автоматический генератор README.md\n');

  const options = resolveOptions(argv);
  const targetDir = options.target;

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    log.error(`Указанная папка не существует или не является директорией: ${targetDir}`);
    process.exit(1);
  }

  log.info(`Целевая папка: ${targetDir}`);
  if (options.dryRun) log.warn('Режим DRY RUN: файл не будет сохранен.');

  // 1. Единое сканирование
  log.step('Шаг 1/6. Сканирую проект…');
  const scanResult = scanProject(targetDir);
  const { tree, flatFiles, manifests, detectedLicense: scannedLicense, docs } = scanResult;
  log.ok('Сканирование завершено.');

  // 2. Манифест и Лицензия
  log.step('Шаг 2/6. Обрабатываю манифест и лицензию…');
  const manifest = manifests.length > 0 ? manifests[0] : null;
  
  /**
   * Определение названия проекта (Приоритет: CLI > package.json > имя папки)
   */
  let projectName = options.projectName;
  
  if (!projectName && manifest && manifest.name === 'package.json') {
    try {
      // Очищаем содержимое от возможной пометки об обрезке
      const cleanContent = manifest.content.replace(/\n\.\.\. \(файл обрезан\)$/, '');
      const pkgData = JSON.parse(cleanContent);
      if (pkgData.name) {
        projectName = pkgData.name;
      }
    } catch (err) {
      log.debug(`Не удалось извлечь имя из package.json: ${err.message}`);
    }
  }

  if (!projectName) {
    projectName = path.basename(targetDir);
  }

  if (manifest) log.ok(`Найден манифест: ${manifest.name}`);
  else log.warn('Манифест не найден — продолжаю без него.');

  log.info(`Название проекта: ${projectName}`);

  const detectedLicense = scannedLicense;
  if (detectedLicense) log.ok(`Обнаружена лицензия: ${detectedLicense}`);

  // 3. Главный файл
  log.step('Шаг 3/6. Ищу главный файл исходного кода…');
  const mainFile = findMainFile(targetDir, manifest, flatFiles);
  if (mainFile) log.ok(`Найден главный файл: ${mainFile.name}`);
  else log.warn('Главный файл не найден — продолжаю без него.');

  // 4. Интерактивный опрос
  log.step('Шаг 4/6. Провожу интерактивный опрос (если не отключен)…');
  let interactiveAnswers;
  try {
    interactiveAnswers = await runInteractive(options, detectedLicense);
    if (!options.nonInteractive) {
      log.ok('Опрос завершён.');
    } else {
      log.info('Режим --non-interactive: используются значения из CLI/конфига/дефолтов.');
    }
  } catch (err) {
    log.warn(`Ошибка во время опроса: ${err.message}. Используются значения по умолчанию.`);
    interactiveAnswers = { ...options.answers, license: detectedLicense || options.answers.license };
  }

  // 5. Сбор бизнес-контекста
  log.step('Шаг 5/6. Собираю бизнес-контекст (Git-логи, документы)…');
  let businessContext = { commits: [], features: [], fixes: [], docs: {} };
  let codeContext = '';
  try {
    businessContext = collectBusinessContext(targetDir, docs);
    codeContext = collectCodeContext(targetDir, flatFiles, mainFile);
    log.ok('Бизнес-контекст и контекст кода собраны.');
  } catch (err) {
    log.warn(`Ошибка при сборе контекста: ${err.message}. Продолжаю с ограниченным контекстом.`);
  }

  // 6. Генерация README
  log.step('Шаг 6/6. Генерирую README…');
  let markdown;
  let stack;
  try {
    const result = await generateReadme({
      projectName,
      tree,
      flatFiles,
      manifests,
      manifest,
      mainFile,
      interactiveAnswers,
      businessContext,
      codeContext,
      detectedLicense,
      options // Пробрасываем все опции
    });
    markdown = result.markdown;
    stack = result.stack;
    log.ok(`Стек: ${stack.language || 'не определён'}${stack.framework ? ' + ' + stack.framework : ''}.`);
    log.ok('README сгенерирован.');
  } catch (err) {
    log.error(`Ошибка при генерации README: ${err.message}`);
    process.exit(1);
  }

  // 7. Финальный сканер (перевод)
  if (!options.content.noTranslate) {
    log.step(`Финальная обработка (перевод на ${options.content.targetLanguage})…`);
    try {
      markdown = await finalScan(markdown, options);
    } catch (err) {
      log.warn(`Ошибка в финальном сканере: ${err.message}`);
    }
  }
  // 8. Сохранение
  if (options.dryRun) {
    console.log('\n--- DRY RUN: Содержимое README.md ---\n');
    console.log(markdown);
    console.log('\n--- КОНЕЦ ---');
  } else {
    log.step('Сохраняю README.md…');
    try {
      const outPath = saveReadme(options.output, markdown);
      log.ok(`README.md успешно создан: ${outPath}`);
    } catch (err) {
      log.error(`Не удалось сохранить README.md: ${err.message}`);
      process.exit(1);
    }
  }

  // 9. Валидация
  if (options.validate) {
    log.step('Запускаю валидацию сгенерированного README…');
    const contextForValidation = `Project: ${projectName}\nStack: ${stack.language}${stack.framework ? ' + ' + stack.framework : ''}\nStructure:\n${tree}`;
    try {
      const validation = await validateReadme(markdown, contextForValidation, options);
      console.log('\n--- Результаты валидации ---');
      console.log(`Точность: ${validation.scores.accuracy}/10`);
      console.log(`Ясность: ${validation.scores.clarity}/10`);
      console.log(`Полнота: ${validation.scores.completeness}/10`);
      console.log(`Отсутствие галлюцинаций: ${validation.scores.hallucinations}/10`);
      console.log(`Отзыв: ${validation.feedback}`);
      console.log('----------------------------\n');
    } catch (err) {
      log.warn(`Валидация не удалась: ${err.message}`);
    }
  }

  console.log('\n\x1b[32m\x1b[1m✓ Готово!\x1b[0m\n');
  closeLogger();
}

const handleExit = () => {
  closeLogger();
  process.exit();
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

process.on('unhandledRejection', (reason) => {
  log.error('Необработанное отклонение Promise', reason);
  closeLogger();
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  log.error('Непредвиденная ошибка', err);
  closeLogger();
  process.exit(1);
});

if (require.main === module) {
  main().catch(err => {
    log.error('Критическая ошибка в главном цикле', err);
    closeLogger();
    process.exit(1);
  });
}

module.exports = { main };