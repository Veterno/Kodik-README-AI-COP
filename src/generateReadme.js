'use strict';

/**
 * src/generateReadme.js
 * Фасад для генерации README.md.
 * Выбирает стратегию (AI или локальная) и использует markdownBuilder для сборки.
 */

const { detectStack } = require('./stackDetector');
const { mergeStacks } = require('./utils/stackUtils');
const { AiClient } = require('./aiClient');const { log } = require('./logger');
const { buildMarkdown } = require('./markdownBuilder');
const { generateLocal } = require('./localGenerator');
const { loadPrompts } = require('./promptLoader');

/**
 * Генерирует README.
 */
async function generateReadme(params) {
  const { projectName, tree, flatFiles, manifests, options } = params;
  const useAI = options.ai.enabled;
  
  const stacks = manifests && manifests.length > 0 
    ? manifests.map(m => detectStack(m, flatFiles))
    : [detectStack(null, flatFiles)];
  
  const stack = mergeStacks(stacks);

  let readmeData;

  if (useAI) {
    try {
      readmeData = await generateWithAI(params, stack);
    } catch (err) {
      log.warn(`AI-генерация недоступна или ошибка: ${err.message}. Используется локальный режим.`);
      log.debug('AI Error:', err);
    }
  }

  if (!readmeData) {
    readmeData = generateLocal(params);
  }

  const markdown = buildMarkdown(readmeData, options);
  
  // Возвращаем стек для совместимости, если он нужен вызывающей стороне
  return { 
    markdown, 
    stack: readmeData.stack || stack 
  };
}
/**
 * Внутренняя функция для вызова AI.
 */
async function generateWithAI(params, stack) {
  const { projectName, tree, manifests, mainFile, businessContext, interactiveAnswers, codeContext, detectedLicense, options } = params;

  const context = buildContextString({
    projectName,
    tree,
    manifests,
    mainFile,
    businessContext,
    interactiveAnswers,
    stack,
    codeContext,
  });

  const tone = interactiveAnswers?.tone || options.content.tone || 'technical';
  const licenseName = detectedLicense || interactiveAnswers?.license || options.answers.license || 'MIT';
  const genLang = options.content?.generationLanguage || 'ru';
  
  const langMap = {
    'ru': 'русский', 'en': 'английский', 'es': 'испанский', 
    'fr': 'французский', 'de': 'немецкий', 'zh': 'китайский'
  };
  const langFull = langMap[genLang] || 'русский';

  // Загрузка промптов
  const prompts = loadPrompts(options.promptVersion || 'latest');
  
  let systemPrompt = prompts.systemPrompt
    .replace('{{generationLanguage}}', langFull.toUpperCase());

  // Добавляем few-shot примеры, если они есть
  if (prompts.fewShotExamples && prompts.fewShotExamples.length) {
    const examplesText = prompts.fewShotExamples.map(ex => 
      `Пример контекста:\n${ex.context}\n\nПример ответа:\n${JSON.stringify(ex.output, null, 2)}`
    ).join('\n\n');
    systemPrompt += '\n\nВот примеры правильных ответов (few-shot):\n' + examplesText;
  }

  // Добавляем информацию о тоне и лицензии в системный промпт
  systemPrompt += `\n\nТон описания: ${tone}.\nЛицензия проекта: ${licenseName}.`;

  const userPrompt = prompts.userPromptTemplate.replace('{{context}}', context);

  const client = new AiClient(options.ai);
  const jsonResult = await client.generateReadme({ systemPrompt, userPrompt }, { json: true });

  if (!jsonResult || typeof jsonResult !== 'object' || !jsonResult.title) {
    throw new Error('Невалидный ответ от AI');
  }

  return jsonResult;
}
/**
 * Строит текстовый контекст для AI-генерации.
 */
function buildContextString({ projectName, tree, manifests, mainFile, businessContext, interactiveAnswers, stack, codeContext }) {
  const parts = [];
  parts.push(`Имя проекта: ${projectName}`);
  if (manifests && manifests.length > 0) {
    parts.push('Манифесты:');
    manifests.forEach(m => {
      parts.push(`--- ${m.relPath || m.name} ---\n${m.content}`);
    });
  }
  if (mainFile) parts.push(`Главный файл: ${mainFile.name}\nПервые строки:\n${mainFile.content}`);
  if (tree) parts.push(`Структура проекта:\n${tree}`);
  if (stack) {
    parts.push(`Определённый стек: язык=${stack.language || 'неизвестен'}, фреймворк=${stack.framework || 'не указан'}`);
  }
  if (businessContext) {
    if (businessContext.docs) {
      parts.push('Документация:');
      for (const [file, content] of Object.entries(businessContext.docs)) {
        parts.push(`--- ${file} ---\n${content}`);
      }
    }
    if (businessContext.commits && businessContext.commits.length) {
      parts.push(`Последние коммиты:\n${businessContext.commits.join('\n')}`);
    }
    if (businessContext.features && businessContext.features.length) {
      parts.push(`Выделенные фичи из коммитов:\n${businessContext.features.join('\n')}`);
    }
    if (businessContext.fixes && businessContext.fixes.length) {
      parts.push(`Исправления:\n${businessContext.fixes.join('\n')}`);
    }
  }
  if (interactiveAnswers) {
    if (interactiveAnswers.projectType) parts.push(`Тип проекта: ${interactiveAnswers.projectType}`);
    if (interactiveAnswers.value) parts.push(`Бизнес-ценность: ${interactiveAnswers.value}`);
    if (interactiveAnswers.keyFeatures) parts.push(`Ключевые функции (от пользователя): ${interactiveAnswers.keyFeatures}`);
    if (interactiveAnswers.tone) parts.push(`Желаемый тон описания: ${interactiveAnswers.tone}`);
  }
  if (codeContext) {
    parts.push(`Фрагменты кода и комментарии из проекта:\n${codeContext}`);
  }
  return parts.join('\n\n');
}

module.exports = { generateReadme };
