#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

// Загружаем .env из текущей рабочей директории
const dotenv = require('dotenv');
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath, override: true });

const { log, initLogger, closeLogger } = require('./core/logger');
const { findMainFile } = require('./scanner/entryDetector');
const { generateReadme } = require('./generator/readmeGenerator');
const { saveReadme } = require('./output/persistence');
const { runInteractive } = require('./interfaces/cli/interactive');
const { collectBusinessContext } = require('./context/contextCollector');
// const { collectCodeContext } = require('./context/codeContext');
const { scanProject } = require('./scanner/projectScanner');
const { finalScan } = require('./output/processors/finalScanner');
const { validateReadme } = require('./validation/aiRules');
const { applyFixes, validateLocal } = require('./validation/localRules');
const { resolveOptions } = require('./interfaces/cli/options');
const { PluginManager } = require('./pluginManager');
const { i18n, t } = require('./core/i18n');const pkg = require('../package.json');

async function main(customArgv) {
  // 1. Предварительное определение языка для i18n
  let tempArgv = customArgv || process.argv.slice(2);
  if (!Array.isArray(tempArgv)) {
    // Если передан объект (например, из yargs в тестах), пробуем превратить его в массив или просто игнорируем
    tempArgv = [];
  }
  const langIdx = tempArgv.indexOf('--lang');  const envLang = process.env.KODIK_LANG || process.env.LANG?.split('_')[0];
  const initialLang = (langIdx !== -1 ? tempArgv[langIdx + 1] : envLang) || 'ru';
  
  i18n.init(initialLang);

  initLogger();

  const argv = customArgv || yargs(hideBin(process.argv))
    .usage(t('cli.usage'))
    .positional('target', {
      describe: t('cli.opt_target'),
      type: 'string'
    })
    .option('lang', {
      describe: t('cli.opt_lang'),
      type: 'string',
      default: 'ru'
    })
    .option('n', {
      alias: 'non-interactive',
      describe: t('cli.opt_non_interactive'),
      type: 'boolean'
    })
    .option('ai', {
      describe: t('cli.opt_ai'),
      type: 'boolean'
    })
    .option('m', {
      alias: 'model',
      describe: t('cli.opt_model'),
      type: 'string'
    })
    .option('api-url', {
      describe: t('cli.opt_api_url'),
      type: 'string'
    })
    .option('api-key', {
      describe: t('cli.opt_api_key'),
      type: 'string'
    })
    .option('o', {
      alias: 'output',
      describe: t('cli.opt_output'),
      type: 'string'
    })
    .option('dry-run', {
      describe: t('cli.opt_dry_run'),
      type: 'boolean'
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
    .option('fix', {
      describe: 'Автоматически исправлять ошибки в README (требует --validate)',
      type: 'boolean'
    })    .option('projectName', {
      describe: 'Явное название проекта (переопределяет package.json)',
      type: 'string'
    })
    .option('prompt-version', {
      describe: 'Версия промптов (latest или номер)',
      type: 'string',
      default: 'latest'
    })
    .option('dry-run', {      describe: 'Показать результат без сохранения',
      type: 'boolean'
    })
    .option('translate-section', {
      describe: 'Секции для перевода (можно несколько)',
      type: 'array'
    })
    .option('code-paths', {
      describe: 'Список папок для поиска кода (через запятую)',
      type: 'string'
    })
    .option('docs-files', {
      describe: 'Список имен файлов документации (через запятую)',
      type: 'string'
    })
    .option('max-files-per-dir', {
      describe: 'Макс. количество файлов в папке перед сворачиванием в дереве',
      type: 'number'
    })
    .example('$0 .', 'Сгенерировать README для текущей папки')    .example('$0 ./my-project --non-interactive', 'Тихая генерация с дефолтами')
    .example('$0 --tone marketing --language en', 'Маркетинговый тон на английском')
    .option('template', {
      describe: 'Путь к файлу шаблона (.md)',
      type: 'string'
    })
    .option('style', {
      describe: 'Стиль оформления',
      choices: ['modern', 'minimal'],
      type: 'string'
    })
    .option('section-order', {
      describe: 'Порядок разделов через запятую',
      type: 'string'
    })
    .option('disable-section', {
      describe: 'Отключить раздел (можно несколько)',
      type: 'array'
    })
    .option('enable-section', {
      describe: 'Включить раздел (можно несколько)',
      type: 'array'
    })
    .option('no-plugins', {
      describe: 'Отключить загрузку всех плагинов',
      type: 'boolean'
    })
    .command(require('./commands/plugin'))
    .command(require('./commands/template'))
    .help('h')    .alias('h', 'help')
    .version('v', 'Показать версию', pkg.version)
    .alias('v', 'version')
    .wrap(null)
    .argv;

  console.log('\n\x1b[1m\x1b[35m📝 Kodik README AI\x1b[0m — автоматический генератор README.md\n');

  const options = resolveOptions(argv);

  const pluginManager = new PluginManager(options);
  await pluginManager.load();
  // Уведомление о локальном режиме
  if (argv.ai !== false) {
    if (!options.ai.enabled) {
      if (options.ai.disabledReason === 'MISSING_KEY') {
        log.warn('⚠️  API-ключ не найден или содержит плейсхолдер. Работаем в локальном режиме (без AI).');
        console.log('   Чтобы использовать AI, укажите валидный OPENAI_API_KEY в .env или через --api-key.\n');
      } else {
        log.info('ℹ️  AI-генерация отключена. Работаем в локальном режиме.');
      }
    } else {
      const isLocalAI = options.ai.apiUrl?.includes('localhost') || options.ai.apiUrl?.includes('127.0.0.1') || options.ai.apiKey === 'ollama';
      if (isLocalAI) {
        log.info('🤖 Используется локальный AI-провайдер (Ollama/LM Studio).');
      } else {
        log.info('🌐 Используется облачный AI-провайдер (OpenAI/DeepSeek/Groq).');
      }
    }
  }
  const targetDir = options.target;
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    log.error(`Указанная папка не существует или не является директорией: ${targetDir}`);
    process.exit(1);
  }

  log.info(`Целевая папка: ${targetDir}`);
  if (options.dryRun) log.warn('Режим DRY RUN: файл не будет сохранен.');

  // 1. Единое сканирование
  log.step('Шаг 1/6. Сканирую проект…');
  await pluginManager.runHook('beforeScan');
  const scanResult = scanProject(targetDir, options.scanner);
  const { tree, flatFiles, manifests, detectedLicense: scannedLicense, docs, codeContext } = scanResult;
  await pluginManager.runHook('afterScan', { projectData: scanResult });
  log.ok('Сканирование завершено.');  // 2. Манифест и Лицензия
  log.step('Шаг 2/6. Обрабатываю манифест и лицензию…');
  
  /**
   * Определение названия проекта (Приоритет: CLI > package.json > имя папки)
   */
  let projectName = options.projectName;
  
  const rootPackageJson = manifests.find(m => m.name === 'package.json' && (m.relPath === 'package.json' || (m.relPath && !m.relPath.includes('/'))));
  
  if (!projectName && rootPackageJson) {
    try {
      // Очищаем содержимое от возможной пометки об обрезке
      const cleanContent = rootPackageJson.content.replace(/\n\.\.\. \(файл обрезан\)$/, '');
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

  if (manifests.length > 0) {
    log.ok(`Найдено манифестов: ${manifests.length} (${manifests.map(m => m.name).join(', ')})`);
  } else {
    log.warn('Манифесты не найдены — продолжаю без них.');
  }

  log.info(`Название проекта: ${projectName}`);

  const detectedLicense = scannedLicense;
  if (detectedLicense) log.ok(`Обнаружена лицензия: ${detectedLicense}`);

  // 3. Главный файл
  log.step('Шаг 3/6. Ищу главный файл исходного кода…');
  const mainFile = findMainFile(targetDir, manifests[0] || null, flatFiles);
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
  try {
    const { getGitLogSummary } = require('./context/contextCollector');
    const gitLog = getGitLogSummary(targetDir);
    
    // Формируем финальный бизнес-контекст, используя уже собранные доки из сканера
    const docsContent = {};
    docs.forEach(doc => {
      if (doc.name.toLowerCase() !== 'readme.md') {
        docsContent[doc.name] = doc.content;
      }
    });

    businessContext = { ...gitLog, docs: docsContent };
    log.ok('Бизнес-контекст и контекст кода собраны.');  } catch (err) {
    log.warn(`Ошибка при сборе контекста: ${err.message}. Продолжаю с ограниченным контекстом.`);
  }  // 6. Генерация README
  log.step('Шаг 6/6. Генерирую README…');
  let markdown;
  let stack;
  try {
    await pluginManager.runHook('beforeGenerate', {
      projectName,
      context: { businessContext, codeContext }
    });
    const result = await generateReadme({
      projectName,
      tree,
      flatFiles,
      manifests,
      mainFile,
      interactiveAnswers,
      businessContext,
      codeContext,
      detectedLicense,
      options // Пробрасываем все опции
    });
    markdown = result.markdown;
    stack = result.stack;
    await pluginManager.runHook('afterGenerate', { rawContent: markdown, stack });
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
    await pluginManager.runHook('beforeBuild', { markdown });
    await pluginManager.runHook('afterBuild', { markdown });
    
    console.log('\n--- DRY RUN: Содержимое README.md ---\n');
    console.log(markdown);
    console.log('\n--- КОНЕЦ ---');
  } else {
    await pluginManager.runHook('beforeBuild', { markdown });
    await pluginManager.runHook('afterBuild', { markdown });
    // Локальная валидация и исправление перед сохранением, если передан флаг --fix
    if (argv.fix) {
      log.step('Проверка и автоисправление README...');
      const localReport = validateLocal(markdown, options.content);
      if (localReport.fixes.length > 0) {
        // Создаем резервную копию, если файл уже существует
        const outPath = path.join(options.output, 'README.md');
        if (fs.existsSync(outPath)) {
          const backupPath = `${outPath}.bak`;
          fs.copyFileSync(outPath, backupPath);
          log.info(`Создана резервная копия: ${backupPath}`);
        }
        markdown = applyFixes(markdown, localReport.fixes);
        log.ok(`Применено исправлений: ${localReport.fixes.length}`);
      } else {
        log.info('Исправления не требуются.');
      }
    }

    log.step('Сохраняю README.md...');
    try {
      const outPath = saveReadme(options.output, markdown);
      log.ok(`README.md успешно создан: ${outPath}`);
    } catch (err) {
      log.error(`Не удалось сохранить README.md: ${err.message}`);
      process.exit(1);
    }
  }

  // 9. Валидация
  const validationCtx = await pluginManager.runHook('validate');
  if (validationCtx.errors && validationCtx.errors.length > 0) {
    log.warn('Ошибки плагинов:');
    validationCtx.errors.forEach(e => console.log(`  - ${e}`));
  }
  if (options.validate) {
    log.step('Запускаю валидацию сгенерированного README...');
    const contextForValidation = `Project: ${projectName}\nStack: ${stack.language}${stack.framework ? ' + ' + stack.framework : ''}\nStructure:\n${tree}`;
    try {
      const validation = await validateReadme(markdown, contextForValidation, options);
      console.log('\n--- Результаты валидации ---');
      if (validation.scores) {
        console.log(`Точность: ${validation.scores.accuracy}/10`);
        console.log(`Ясность: ${validation.scores.clarity}/10`);
        console.log(`Полнота: ${validation.scores.completeness}/10`);
        console.log(`Отсутствие галлюцинаций: ${validation.scores.hallucinations}/10`);
      }
      if (validation.local) {
        console.log(`Локальные ошибки: ${validation.local.errors.length}`);
        console.log(`Локальные предупреждения: ${validation.local.warnings.length}`);
      }
      console.log(`Отзыв: ${validation.feedback || 'Нет отзывов'}`);
      console.log('----------------------------\n');
    } catch (err) {
      log.warn(`Валидация не удалась: ${err.message}`);
    }
  }
  console.log('\n\x1b[32m\x1b[1m✓ Готово!\x1b[0m\n');
  closeLogger();
}

const handleExit = () => {  closeLogger();
  process.exit();
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

process.on('unhandledRejection', (reason, promise) => {
  log.error('Критическая ошибка: Необработанное отклонение Promise', reason instanceof Error ? reason : new Error(String(reason)));
  // Даем время логгеру записать сообщение перед выходом
  setTimeout(() => {
    closeLogger();
    process.exit(1);
  }, 100);
});

process.on('uncaughtException', (err) => {
  log.error('Критическая ошибка: Непредвиденное исключение', err);
  setTimeout(() => {
    closeLogger();
    process.exit(1);
  }, 100);
});
if (require.main === module) {
  main().catch(err => {
    const msg = err.message || '';
    
    if (msg.includes('OPENAI_API_KEY')) {
      log.error('Ошибка конфигурации: API-ключ не найден.');
      console.log('\x1b[33mПодсказка: Создайте файл .env и добавьте OPENAI_API_KEY=ваш_ключ или используйте флаг --api-key.\x1b[0m');
    } else if (msg.includes('Ошибка сети') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      log.error('Ошибка сети: Не удалось подключиться к AI-сервису.');
      console.log('\x1b[33mПодсказка: Проверьте интернет-соединение и доступность OPENAI_BASE_URL.\x1b[0m');
    } else if (msg.includes('Модель не найдена') || msg.includes('404')) {
      log.error('Ошибка AI: Указанная модель не найдена.');
      console.log('\x1b[33mПодсказка: Проверьте название модели в параметре --model или OPENAI_MODEL.\x1b[0m');
    } else if (msg.includes('Ошибка авторизации') || msg.includes('401')) {
      log.error('Ошибка авторизации: Неверный API-ключ.');
      console.log('\x1b[33mПодсказка: Убедитесь, что OPENAI_API_KEY корректен.\x1b[0m');
    } else {
      log.error(`Критическая ошибка: ${msg}`);
      if (process.env.DEBUG !== 'true') {
        console.log('\x1b[90mДля получения подробной информации запустите с DEBUG=true\x1b[0m');
      }
    }

    if (process.env.DEBUG === 'true') {
      console.error(err);
    }

    closeLogger();
    process.exit(1);
  });
}

module.exports = { main };
