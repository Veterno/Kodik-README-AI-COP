'use strict';

/**
 * src/generateReadme.js
 * Фасад для генерации README.md.
 * Выбирает стратегию (AI или локальная) и использует markdownBuilder для сборки.
 */

const { detectStack } = require('./stackDetector');
const { AiClient } = require('./aiClient');
const { log } = require('./logger');
const { buildMarkdown } = require('./markdownBuilder');
const { generateLocal } = require('./localGenerator');

/**
 * Генерирует README.
 */
async function generateReadme(params) {
  const { projectName, tree, flatFiles, manifests, manifest, options } = params;
  const useAI = options.ai.enabled;
  const stack = detectStack(manifests && manifests.length > 0 ? manifests[0] : manifest, flatFiles);

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

  const markdown = buildMarkdown(readmeData);
  
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
  const { projectName, tree, manifest, mainFile, businessContext, interactiveAnswers, codeContext, detectedLicense, options } = params;

  const context = buildContextString({
    projectName,
    tree,
    manifest,
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
  const langFull = langMap[genLang] || langFull;

  const systemPrompt = `Ты — эксперт по технической документации.  
Твоя задача — сгенерировать README в виде строгого JSON-объекта. 
ВСЕ ТЕКСТОВЫЕ ПОЛЯ (title, description, features, stack, quickStart) ДОЛЖНЫ БЫТЬ НА ЯЗЫКЕ: ${langFull.toUpperCase()}.
Используй ТОЛЬКО информацию из предоставленного контекста, не выдумывай факты. В ответе должен быть только JSON, без дополнительных пояснений, без маркеров кода.  

Название проекта (title) ОБЯЗАТЕЛЬНО должно быть: "${projectName}".

Структура JSON должна быть следующей:{
  "title": "Название проекта",
  "description": "Краткое описание (назначение, аудитория, бизнес-ценность) — всё в одной строке, без markdown-разметки.",
  "features": [
    { "name": "Название функции", "description": "Краткое описание" }
  ],
  "stack": {
    "language": "Язык программирования",
    "framework": "Фреймворк (если есть)",
    "packageManager": "Менеджер пакетов",
    "extras": ["Дополнительные технологии"]
  },
  "quickStart": {
    "requirements": ["Требование 1", "Требование 2"],
    "installCommands": ["команда установки", "..."],
    "runCommands": ["команда запуска", "..."]
  },
  "projectStructure": "Краткое описание структуры или само дерево (можно взять из контекста)",
  "license": "Тип лицензии (если есть, иначе MIT)"
}

Убедись, что все поля присутствуют. Если информация отсутствует, оставь пустую строку или пустой массив, но не пропускай поля.  
Тон описания: ${tone}.  
Лицензия проекта: ${licenseName}.`;

  const userPrompt = `Контекст проекта:\n${context}\n\nСгенерируй README в виде JSON по указанной структуре.`;

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
function buildContextString({ projectName, tree, manifest, mainFile, businessContext, interactiveAnswers, stack, codeContext }) {
  const parts = [];
  parts.push(`Имя проекта: ${projectName}`);
  if (manifest) parts.push(`Манифест: ${manifest.name}\nСодержимое:\n${manifest.content}`);
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
