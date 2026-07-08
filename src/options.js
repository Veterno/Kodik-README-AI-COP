'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { DEFAULT_ANSWERS, TRANSLATION_CONFIG, AI_CONFIG, CODE_PATHS, DOCS_FILES, MAX_FILES_PER_DIR, DEFAULT_SECTIONS, DEFAULT_EMOJIS } = require('./config');
const { log } = require('./logger');
const { maskSensitive } = require('./utils/sensitive');

/**
 * Объединяет настройки из разных источников с учетом приоритета:
 * 1. CLI аргументы
 * 2. Файл конфигурации (--config)
 * 3. Переменные окружения (.env)
 * 4. Значения по умолчанию
 */
function resolveOptions(argv) {
  const configFromFile = loadConfigFile(argv.config);

  // Приоритет для целевой папки: позиционный аргумент > --target > env > cwd
  const targetDir = path.resolve(
    argv._[0] || argv.target || process.env.TARGET_DIR || process.cwd()
  );

  // Формируем итоговый объект опций
  const mainLanguage = argv.language || argv.l || process.env.LANGUAGE || 'ru';

  const options = {
    target: targetDir,
    output: path.resolve(targetDir, argv.output || configFromFile.output || '.'),
    language: argv.lang || configFromFile.language || process.env.KODIK_LANG || process.env.LANG?.split('_')[0] || 'ru',    nonInteractive: argv.nonInteractive || configFromFile.nonInteractive || false,
    dryRun: argv.dryRun || configFromFile.dryRun || false,
    validate: argv.validate || configFromFile.validate || false,
    projectName: argv.projectName || configFromFile.projectName || null,
    
    // Настройки AI
    ai: {
      enabled: argv.ai !== undefined ? argv.ai : (configFromFile.ai?.enabled !== undefined ? configFromFile.ai.enabled : (process.env.USE_AI !== 'false')),
      model: argv.model || configFromFile.ai?.model || process.env.OPENAI_MODEL || (argv.apiUrl?.includes('deepseek') || process.env.OPENAI_BASE_URL?.includes('deepseek') ? 'deepseek-chat' : 'gpt-4o-mini'),
      apiKey: argv.apiKey || configFromFile.ai?.apiKey || process.env.OPENAI_API_KEY,
      apiUrl: argv.apiUrl || configFromFile.ai?.apiUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      promptVersion: argv.promptVersion || configFromFile.ai?.promptVersion || 'latest',
    },
    // Настройки контента
    content: {
      tone: argv.tone || configFromFile.content?.tone || DEFAULT_ANSWERS.tone,
      generationLanguage: argv.generationLanguage || configFromFile.content?.generationLanguage || process.env.GENERATION_LANGUAGE || mainLanguage,
      targetLanguage: argv.targetLanguage || configFromFile.content?.targetLanguage || process.env.TARGET_LANGUAGE || mainLanguage,
      language: argv.targetLanguage || argv.language || argv.l || configFromFile.content?.targetLanguage || process.env.TARGET_LANGUAGE || mainLanguage,
      noTranslate: argv.noTranslate || configFromFile.content?.noTranslate || !TRANSLATION_CONFIG.ENABLED,
      translateSections: argv.translateSection || configFromFile.content?.translateSections || TRANSLATION_CONFIG.SECTIONS,
      templatePath: argv.template || configFromFile.content?.templatePath || null,
      style: argv.style || configFromFile.content?.style || 'modern',
      emojis: { ...DEFAULT_EMOJIS, ...(configFromFile.content?.emojis || {}) },
      sections: resolveSections(argv, configFromFile),
    },

    // Интерактивные ответы (начальные значения)
    answers: {
      ...DEFAULT_ANSWERS,
      ...(configFromFile.answers || {}),
      tone: argv.tone || configFromFile.content?.tone || DEFAULT_ANSWERS.tone,
    },
    // Гибкие настройки структуры
    scanner: {
      codePaths: (argv.codePaths || process.env.CODE_PATHS || configFromFile.scanner?.codePaths || '').split(',').map(s => s.trim()).filter(Boolean),
      docsFiles: new Set((argv.docsFiles || process.env.DOCS_FILES || configFromFile.scanner?.docsFiles || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)),
      maxFilesPerDir: parseInt(argv.maxFilesPerDir || process.env.MAX_FILES_PER_DIR || configFromFile.scanner?.maxFilesPerDir || MAX_FILES_PER_DIR, 10),
    },

    // Настройки плагинов
    plugins: argv.plugins || configFromFile.plugins || [],
    localPluginsPath: argv.localPluginsPath || configFromFile.localPluginsPath || './plugins',
    disabledPlugins: argv.disabledPlugins || configFromFile.disabledPlugins || []
  };
  // Fallback на дефолты, если списки пустые
  if (options.scanner.codePaths.length === 0) options.scanner.codePaths = CODE_PATHS;
  if (options.scanner.docsFiles.size === 0) options.scanner.docsFiles = new Set(DOCS_FILES.map(f => f.toLowerCase()));

  // Валидация настроек AI
  validateAiOptions(options);

  if (process.env.DEBUG === 'true') {
    log.debug('Resolved AI Options:', {
      enabled: options.ai.enabled,
      model: options.ai.model,
      apiUrl: options.ai.apiUrl,
      apiKey: options.ai.apiKey ? maskSensitive(options.ai.apiKey) : 'MISSING'
    });
  }

  return options;
}

/**
 * Проверяет настройки AI и отключает его, если не хватает данных (например, API-ключа)
 */
function validateAiOptions(options) {
  if (!options.ai.enabled) return;

  let { apiKey, apiUrl } = options.ai;
  
  // Очищаем ключ от возможных кавычек и пробелов
  if (apiKey) {
    apiKey = apiKey.trim().replace(/^['"]|['"]$/g, '');
    options.ai.apiKey = apiKey;
  }

  const isOllama = apiUrl?.includes('ollama') || apiKey === 'ollama';
  const isLocal = apiUrl?.includes('localhost') || apiUrl?.includes('127.0.0.1');

  // Список типичных плейсхолдеров для ключа
  const placeholders = ['your-api-key-here', 'YOUR_OPENAI_API_KEY', 'sk-your-key-here'];
  
  // Проверяем, является ли ключ плейсхолдером или слишком коротким (реальные ключи > 20 симв)
  const isPlaceholder = !apiKey || 
    placeholders.includes(apiKey) || 
    apiKey === 'sk-...' || 
    apiKey.startsWith('sk-your-key') ||
    apiKey.length < 10;

  // Если не локальный провайдер и нет ключа (или ключ дефолтный/плейсхолдер)
  if (!isOllama && !isLocal && isPlaceholder) {
    options.ai.enabled = false;
    options.ai.disabledReason = 'MISSING_KEY';
  }
}

function resolveSections(argv, configFromFile) {
  let sections = configFromFile.content?.sections || [...DEFAULT_SECTIONS];

  if (argv.sectionOrder) {
    const order = argv.sectionOrder.split(',').map(s => s.trim());
    sections = sections.map(s => {
      const idx = order.indexOf(s.id);
      if (idx !== -1) return { ...s, order: (idx + 1) * 10, enabled: true };
      return s;
    });
  }

  if (argv.disableSection) {
    const disabled = (Array.isArray(argv.disableSection) ? argv.disableSection : [argv.disableSection]);
    sections = sections.map(s => disabled.includes(s.id) ? { ...s, enabled: false } : s);
  }

  if (argv.enableSection) {
    const enabled = (Array.isArray(argv.enableSection) ? argv.enableSection : [argv.enableSection]);
    sections = sections.map(s => enabled.includes(s.id) ? { ...s, enabled: true } : s);
  }

  return sections.sort((a, b) => (a.order || 0) - (b.order || 0));
}

function loadConfigFile(configPath) {
  if (!configPath) return {};
  
  const fullPath = path.resolve(configPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`\x1b[33mПредупреждение: Файл конфигурации не найден: ${fullPath}\x1b[0m`);
    return {};
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (fullPath.endsWith('.json')) {
      return JSON.parse(content);
    } else if (fullPath.endsWith('.yaml') || fullPath.endsWith('.yml')) {
      return yaml.load(content);
    }
  } catch (err) {
    console.error(`\x1b[31mОшибка при чтении файла конфигурации: ${err.message}\x1b[0m`);
  }
  return {};
}

module.exports = { resolveOptions };
