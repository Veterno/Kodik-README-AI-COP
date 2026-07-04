'use strict';

/**
 * src/generateReadme.js
 * Генерация README.md: локальная (без AI) или через AI-модель.
 * При AI-генерации использует контекст из кода (комментарии, сигнатуры),
 * документации, Git-лога и интерактивных ответов.
 * Учитывает выбранный тон (tone) для настройки стиля описания.
 */

const { detectStack } = require('./stackDetector');
const { AiClient } = require('./aiClient');

/**
 * Генерирует README.
 * @param {object} params
 * @param {string} params.projectName
 * @param {string} params.tree
 * @param {Set<string>} params.flatFiles
 * @param {object|null} params.manifest
 * @param {object|null} params.mainFile
 * @param {object} params.interactiveAnswers - ответы из опроса (audience, tone, value, projectType, keyFeatures)
 * @param {object} params.businessContext - бизнес-контекст (commits, features, docs и т.д.)
 * @param {string} params.codeContext - текстовый контекст из кода (от collectCodeContext)
 * @returns {Promise<{ markdown: string, stack: object }>}
 */
async function generateReadme({ projectName, tree, flatFiles, manifests, manifest, mainFile, interactiveAnswers, businessContext, codeContext, detectedLicense, options }) {
  let markdown;
  const useAI = options.ai.enabled;
  const stack = detectStack(manifests && manifests.length > 0 ? manifests[0] : manifest, flatFiles);
  if (useAI) {
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
      'ru': 'русский',
      'en': 'английский',
      'es': 'испанский',
      'fr': 'французский',
      'de': 'немецкий',
      'zh': 'китайский'
    };
    const langFull = langMap[genLang] || genLang;

    // УЖЕСТОЧЁННЫЙ СИСТЕМНЫЙ ПРОМПТ (строго JSON, без пояснений)
    const systemPrompt = `Ты — эксперт по технической документации.  
Твоя задача — сгенерировать README в виде строгого JSON-объекта на языке: ${langFull}.  
Используй ТОЛЬКО информацию из предоставленного контекста, не выдумывай факты.  В ответе должен быть только JSON, без дополнительных пояснений, без маркеров кода.  

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
Лицензия проекта: ${licenseName}.
Желаемый тон означает стиль изложения (technical — сухо и фактологично, marketing — энергично и продающе, minimal — кратко).`;
    const userPrompt = `Контекст проекта:\n${context}\n\nСгенерируй README в виде JSON по указанной структуре.`;

    try {
      const client = new AiClient(options.ai);
      const jsonResult = await client.generateReadme({ systemPrompt, userPrompt }, { json: true });
      if (!jsonResult || typeof jsonResult !== 'object' || !jsonResult.title) {
        throw new Error('Не удалось получить валидный JSON от AI.');
      }

      // ---- СБОРКА README ИЗ JSON (без изменений) ----
      const parts = [];
      parts.push(`# 🚀 ${jsonResult.title}`);
      parts.push('');

      if (jsonResult.description) {
        parts.push('## 📝 Описание');
        parts.push('');
        parts.push(jsonResult.description);
        parts.push('');
      }

      if (jsonResult.features && Array.isArray(jsonResult.features) && jsonResult.features.length) {
        parts.push('## ✨ Ключевые возможности');
        parts.push('');
        jsonResult.features.forEach(f => {
          if (f && typeof f === 'object') {
            const name = f.name || '';
            const desc = f.description ? ` — ${f.description}` : '';
            if (name) parts.push(`- **${name}**${desc}`);
          } else if (f) {
            parts.push(`- ${f}`);
          }
        });
        parts.push('');
      }

      if (jsonResult.stack && typeof jsonResult.stack === 'object') {
        parts.push('## 🛠️ Стек технологий');
        parts.push('');
        const s = jsonResult.stack;
        if (s.language) parts.push(`- **Язык:** ${s.language}`);
        if (s.framework) parts.push(`- **Фреймворк:** ${s.framework}`);
        if (s.packageManager) parts.push(`- **Пакетный менеджер:** ${s.packageManager}`);
        if (s.extras && Array.isArray(s.extras) && s.extras.length) {
          parts.push(`- **Дополнительно:** ${s.extras.join(', ')}`);
        }
        parts.push('');
      }

      if (jsonResult.quickStart && typeof jsonResult.quickStart === 'object') {
        parts.push('## 📦 Быстрый старт');
        parts.push('');
        const qs = jsonResult.quickStart;
        if (qs.requirements && Array.isArray(qs.requirements) && qs.requirements.length) {
          parts.push('### Требования');
          parts.push('');
          qs.requirements.forEach(req => parts.push(`- ${req}`));
          parts.push('');
        }
        if ((qs.installCommands && Array.isArray(qs.installCommands) && qs.installCommands.length) ||
            (qs.runCommands && Array.isArray(qs.runCommands) && qs.runCommands.length)) {
          parts.push('### Установка и запуск');
          parts.push('');
          parts.push('```bash');
          if (qs.installCommands && Array.isArray(qs.installCommands) && qs.installCommands.length) {
            parts.push('# Установка зависимостей');
            qs.installCommands.forEach(cmd => parts.push(cmd));
            parts.push('');
          }
          if (qs.runCommands && Array.isArray(qs.runCommands) && qs.runCommands.length) {
            parts.push('# Запуск');
            qs.runCommands.forEach(cmd => parts.push(cmd));
          }
          parts.push('```');
          parts.push('');
        }
      }

      if (jsonResult.projectStructure) {
        parts.push('## 📂 Структура проекта');
        parts.push('');
        if (String(jsonResult.projectStructure).startsWith('```')) {
          parts.push(jsonResult.projectStructure);
        } else {
          parts.push('```');
          parts.push(jsonResult.projectStructure);
          parts.push('```');
        }
        parts.push('');
      }

      if (jsonResult.license) {
        parts.push('## 📄 Лицензия');
        parts.push('');
        parts.push(jsonResult.license);
        parts.push('');
      }

      markdown = parts.join('\n');
      return { markdown, stack };
    } catch (err) {
      log.warn(`AI-генерация недоступна или возвращён некорректный JSON: ${err.message}. Используется локальный шаблон.`);
      log.debug('AI Generation Error Details:', err);
      // Падаем в локальный режим
    }  }

  // ---------- ЛОКАЛЬНАЯ ГЕНЕРАЦИЯ (БЕЗ AI) ----------
  const parts = [];

  parts.push(`# 🚀 ${projectName}`);
  parts.push('');

  const description = buildDescription({
    projectName,
    stack,
    interactiveAnswers,
    businessContext,
    tone: interactiveAnswers?.tone || 'technical'
  });
  parts.push('## 📝 Описание');
  parts.push('');
  parts.push(description);
  parts.push('');

  const features = buildFeaturesList({ interactiveAnswers, tree, flatFiles });
  parts.push('## ✨ Ключевые возможности');
  parts.push('');
  features.forEach(f => parts.push(`- ${f}`));
  parts.push('');

  parts.push('## 🛠️ Стек технологий');
  parts.push('');
  parts.push(`- **Язык:** ${stack.language || 'не определён'}`);
  if (stack.framework) parts.push(`- **Фреймворк:** ${stack.framework}`);
  parts.push(`- **Пакетный менеджер:** ${stack.packageManager || 'не выявлен'}`);
  if (stack.extras && stack.extras.length) {
    parts.push(`- **Дополнительно:** ${stack.extras.join(', ')}`);
  }
  parts.push('');

  if (manifest && manifest.name === 'package.json') {
    try {
      const pkg = JSON.parse(manifest.content.replace(/\n\.\.\. \(файл обрезан\)$/, ''));
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      if (deps.length) {
        parts.push('### Зависимости');
        parts.push('```');
        parts.push(deps.join(', '));
        parts.push('```');
        parts.push('');
      }
      if (devDeps.length) {
        parts.push('### Dev-зависимости');
        parts.push('```');
        parts.push(devDeps.join(', '));
        parts.push('```');
        parts.push('');
      }
    } catch (err) {
      log.debug(`Ошибка парсинга package.json в локальном шаблоне: ${err.message}`);
    }
  }

  const quickStart = buildQuickStart({ stack });
  parts.push('## 📦 Быстрый старт');
  parts.push(quickStart);
  parts.push('');

  if (stack.dockerSupported && stack.dockerCommands.length) {
    parts.push('### Запуск через Docker');
    parts.push('');
    parts.push('```bash');
    stack.dockerCommands.forEach(cmd => parts.push(cmd));
    parts.push('```');
    parts.push('');
  }

  parts.push('## 📂 Структура проекта');
  parts.push('');
  parts.push('```');
  parts.push(tree);
  parts.push('```');
  parts.push('');

  parts.push('## 📄 Лицензия');
  parts.push('');
  parts.push(detectedLicense || interactiveAnswers?.license || 'MIT');
  parts.push('');
  markdown = parts.join('\n');
  return { markdown, stack };}

// ─── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ─────────────────────────────────────────────

/**
 * Формирует описание проекта с учётом тона, бизнес-контекста и ответов пользователя.
 * ИСПРАВЛЕНО: исключаем README.md из контекста, очищаем строки от маркеров.
 */
function buildDescription({ projectName, stack, interactiveAnswers, businessContext, tone }) {
  const typeMap = {
    web: 'веб-приложение',
    library: 'библиотеку',
    cli: 'CLI-инструмент',
    microservice: 'микросервис',
    mobile: 'мобильное приложение',
    other: 'программный продукт',
  };
  const projectType = interactiveAnswers?.projectType || 'other';
  const typeLabel = typeMap[projectType] || 'программный продукт';

  const language = stack.language || 'неизвестном языке';
  const framework = stack.framework ? ` с использованием **${stack.framework}**` : '';

  let intro = '';
  if (projectType !== 'other') {
    intro = `**${projectName}** — это ${typeLabel} на **${language}**${framework}.`;
  } else {
    intro = `**${projectName}** — это проект на **${language}**${framework}.`;
  }

  const audienceMap = {
    'end-users': 'конечных пользователей',
    'developers': 'разработчиков',
    'business': 'бизнес-клиентов',
  };
  const audience = interactiveAnswers?.audience || 'developers';
  const audienceLabel = audienceMap[audience] || 'разработчиков';

  let valueText = '';
  if (interactiveAnswers?.value) {
    valueText = interactiveAnswers.value;
  }

  // --- ИЗВЛЕЧЕНИЕ ИНФОРМАЦИИ ИЗ БИЗНЕС-КОНТЕКСТА (БЕЗ README.md И БЕЗ МАРКЕРОВ) ---
  let contextInfo = '';
  if (businessContext && businessContext.docs) {
    const phrases = [];
    for (const [file, content] of Object.entries(businessContext.docs)) {
      // ИСКЛЮЧАЕМ САМ README.md, ЧТОБЫ НЕ БЫЛО ЗАЦИКЛИВАНИЯ
      if (file === 'README.md') continue;
      const lines = content.split('\n')
        .filter(line => line.match(/^#{1,3}\s|^-\s|^\*\s/))
        .slice(0, 3)
        .map(line => line.replace(/^#{1,3}\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
      if (lines.length) phrases.push(lines.join(' '));
    }
    if (phrases.length) {
      contextInfo = phrases.slice(0, 2).join(' ');
    }
  }

  // Если нет документации, пробуем взять из коммитов
  if (!contextInfo && businessContext && businessContext.features && businessContext.features.length) {
    const featureTitles = businessContext.features.slice(0, 2).map(f => f.replace(/^feat(\(.*\))?:\s*/, ''));
    if (featureTitles.length) {
      contextInfo = `Недавно добавлены: ${featureTitles.join('; ')}.`;
    }
  }

  // Сборка описания в зависимости от тона (без switch, оставлено как есть)
  let description = '';
  switch (tone) {
    case 'marketing':
      description = `${intro} `;
      if (valueText) description += `Главная ценность: ${valueText}. `;
      if (contextInfo) description += `${contextInfo} `;
      description += `Этот инструмент создан для ${audienceLabel}, чтобы решать их задачи эффективно и просто. `;
      description += `Попробуйте прямо сейчас и убедитесь в его преимуществах.`;
      break;

    case 'minimal':
      description = `${intro}`;
      if (valueText) description += ` Ценность: ${valueText}.`;
      if (contextInfo) description += ` ${contextInfo}`;
      break;

    default: // technical
      description = `${intro} `;
      if (valueText) description += `Бизнес-ценность: ${valueText}. `;
      if (audience) description += `Проект ориентирован на ${audienceLabel}. `;
      if (contextInfo) description += `${contextInfo} `;
      if (projectType === 'microservice') description += `Он предоставляет REST API и управление через CLI.`;
      else if (projectType === 'library') description += `Он предоставляет API для интеграции в ваши проекты.`;
      else if (projectType === 'cli') description += `Управление осуществляется через командную строку.`;
      else if (projectType === 'web') description += `Доступ к функциональности осуществляется через веб-интерфейс.`;
      break;
  }

  return description;
}

/**
 * Формирует список ключевых возможностей.
 * (без изменений)
 */
function buildFeaturesList({ interactiveAnswers, tree, flatFiles }) {
  const userFeatures = [];
  if (interactiveAnswers?.keyFeatures) {
    const items = interactiveAnswers.keyFeatures.split(',').map(s => s.trim()).filter(Boolean);
    items.forEach(f => userFeatures.push(`✨ ${f}`));
  }

  const autoFeatures = [];
  if (tree.includes('api/') || tree.includes('/api/')) autoFeatures.push('🔌 REST API');
  if (tree.includes('cmd/') || tree.includes('cli/')) autoFeatures.push('🖥️  Командная строка (CLI)');
  if (tree.includes('web/') || tree.includes('ui/') || tree.includes('frontend/')) autoFeatures.push('🌐 Веб-интерфейс');
  if (tree.includes('test/') || tree.includes('tests/') || tree.includes('_test.')) autoFeatures.push('🧪 Модульные тесты');
  if (flatFiles.has('Dockerfile') || flatFiles.has('docker-compose.yml')) autoFeatures.push('🐳 Контейнеризация (Docker)');
  if (flatFiles.has('.github/workflows') || flatFiles.has('.gitlab-ci.yml')) autoFeatures.push('⚙️ CI/CD');

  const all = [...userFeatures];
  for (const af of autoFeatures) {
    const words = af.split(' ');
    const keyword = words.slice(1).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
    const exists = all.some(f => {
      const fWords = f.split(' ').slice(1).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
      return fWords === keyword;
    });
    if (!exists) all.push(af);
  }

  if (all.length === 0) {
    all.push('📁 Структурированный код');
    all.push('📦 Управление зависимостями');
  }

  return all;
}

/**
 * Формирует раздел «Быстрый старт».
 * (без изменений)
 */
function buildQuickStart({ stack }) {
  const lines = [];
  lines.push('');
  lines.push('### Требования');
  lines.push('');
  if (stack.requirements && stack.requirements.length) {
    stack.requirements.forEach(req => lines.push(`- ${req}`));
  } else {
    lines.push('- Убедитесь, что необходимые инструменты установлены (см. документацию).');
  }
  lines.push('');

  lines.push('### Установка и запуск');
  lines.push('');
  lines.push('```bash');
  if (stack.installCommands && stack.installCommands.length) {
    lines.push('# 1. Установка зависимостей');
    stack.installCommands.forEach(cmd => lines.push(cmd));
    lines.push('');
  }
  if (stack.runCommands && stack.runCommands.length) {
    lines.push('# 2. Запуск');
    stack.runCommands.forEach(cmd => lines.push(cmd));
  } else {
    lines.push('# Команды запуска не определены автоматически.');
    lines.push('# Обратитесь к документации проекта.');
  }
  lines.push('```');
  lines.push('');

  lines.push('> ℹ️  Подробные инструкции могут отличаться в зависимости от вашего окружения.');
  lines.push('> Если у вас возникли проблемы, обратитесь к официальной документации.');

  return lines.join('\n');
}

/**
 * Строит текстовый контекст для AI-генерации.
 * (без изменений)
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