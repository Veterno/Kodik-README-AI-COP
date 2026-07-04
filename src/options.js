'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { DEFAULT_ANSWERS, TRANSLATION_CONFIG, AI_CONFIG } = require('./config');

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
  const options = {
    target: targetDir,
    output: path.resolve(targetDir, argv.output || configFromFile.output || '.'),
    nonInteractive: argv.nonInteractive || configFromFile.nonInteractive || false,
    dryRun: argv.dryRun || configFromFile.dryRun || false,
    validate: argv.validate || configFromFile.validate || false,
    projectName: argv.projectName || configFromFile.projectName || null,
    
    // Настройки AI
    ai: {
      enabled: argv.ai !== undefined ? argv.ai : (configFromFile.ai?.enabled !== undefined ? configFromFile.ai.enabled : (process.env.USE_AI !== 'false')),
      model: argv.model || configFromFile.ai?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      apiKey: argv.apiKey || configFromFile.ai?.apiKey || process.env.OPENAI_API_KEY,
      apiUrl: argv.apiUrl || configFromFile.ai?.apiUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },

    // Настройки контента
    content: {
      tone: argv.tone || configFromFile.content?.tone || DEFAULT_ANSWERS.tone,
      generationLanguage: argv.generationLanguage || configFromFile.content?.generationLanguage || process.env.GENERATION_LANGUAGE || 'ru',
      targetLanguage: argv.targetLanguage || configFromFile.content?.targetLanguage || TRANSLATION_CONFIG.TARGET_LANGUAGE || 'ru',
      noTranslate: argv.noTranslate || configFromFile.content?.noTranslate || !TRANSLATION_CONFIG.ENABLED,
      translateSections: argv.translateSection || configFromFile.content?.translateSections || TRANSLATION_CONFIG.SECTIONS,
    },

    // Интерактивные ответы (начальные значения)
    answers: {
      ...DEFAULT_ANSWERS,
      ...(configFromFile.answers || {}),
      tone: argv.tone || configFromFile.content?.tone || DEFAULT_ANSWERS.tone,
    }
  };

  return options;
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
