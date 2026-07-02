'use strict';

/**
 * src/generateReadme.js
 * Генерация README.md: локальная (без AI) или через AI-модель.
 * При AI-генерации использует контекст из кода (комментарии, сигнатуры),
 * документации, Git-лога и интерактивных ответов.
 * Учитывает выбранный тон (tone) для настройки стиля описания.
 */

const { detectStack } = require('./stackDetector');
const { callAI } = require('./aiClient');

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
 * @param {string} params.codeContext - текстовый контекст из кода (от collectCodeContext) – пока не используется, но оставлено для AI
 * @returns {Promise<{ markdown: string, stack: object }>}
 */
async function generateReadme({ projectName, tree, flatFiles, manifest, mainFile, interactiveAnswers, businessContext, codeContext }) {
  // По умолчанию USE_AI = true, если не указано false
  const useAI = process.env.USE_AI !== 'false';

  // 1. Определяем стек (всегда)
  const stack = detectStack(manifest, flatFiles);

  // 2. Если включён AI – генерируем через модель
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

    // Получаем тон из ответов (если есть)
    const tone = interactiveAnswers?.tone || 'technical';

    // Системный промпт с учётом тона
    const systemPrompt = `Ты — эксперт по технической документации. Сгенерируй README.md для проекта на основе предоставленного контекста.
Следуй структуре:
# Название проекта
## Описание (опиши, что это за программа, для кого она, какие проблемы решает, основные сценарии использования. Используй живой, понятный язык, ориентируйся на целевую аудиторию. Не перечисляй технологии в описании, они будут в отдельном разделе. Если есть информация о бизнес-ценности или целевой аудитории, обязательно используй её.)
## Ключевые возможности (перечисли основные функции, которые видны из кода и структуры, а также те, что указал пользователь)
## Стек технологий
## Быстрый старт (установка, запуск)
## Структура проекта (кратко, если есть дерево)
## Лицензия

Тон описания: {tone}.
- Если tone = marketing: описание должно быть вдохновляющим, акцентировать выгоды, быть энергичным и продающим. Используй яркие формулировки, подчеркивай ценность для пользователя.
- Если tone = technical: описание должно быть чётким, фактологичным, с акцентом на технические детали, нейтральным и точным.
- Если tone = minimal: описание должно быть кратким, только суть, без лишних слов.

Отвечай только готовым README, без лишних пояснений. Не выдумывай факты, используй только информацию из контекста.`;

    const userPrompt = `Контекст проекта (включая выдержки из кода):\n${context}\n\nСгенерируй README.md.`;

    const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || 0.7);
    const topP = parseFloat(process.env.OPENAI_TOP_P || 0.9);

    try {
      let markdown = await callAI(userPrompt, systemPrompt, { temperature, topP });
      // Убираем возможные обёртки ```markdown ... ```
      markdown = markdown.replace(/^```(?:markdown|md)?\s*/i, '').replace(/```\s*$/i, '').trim();
      return { markdown, stack };
    } catch (err) {
      console.warn('⚠️  AI-генерация недоступна, используется локальный шаблон.');
      // Падаем в локальный режим
    }
  }

  // 3. Локальная генерация (без AI) – улучшенный шаблон
  const parts = [];

  // Заголовок
  parts.push(`# 🚀 ${projectName}`);
  parts.push('');

  // --- ОПИСАНИЕ ---
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

  // --- КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ ---
  const features = buildFeaturesList({ interactiveAnswers, tree, flatFiles });
  parts.push('## ✨ Ключевые возможности');
  parts.push('');
  features.forEach(f => parts.push(`- ${f}`));
  parts.push('');

  // --- СТЕК ТЕХНОЛОГИЙ ---
  parts.push('## 🛠️ Стек технологий');
  parts.push('');
  parts.push(`- **Язык:** ${stack.language || 'не определён'}`);
  if (stack.framework) parts.push(`- **Фреймворк:** ${stack.framework}`);
  parts.push(`- **Пакетный менеджер:** ${stack.packageManager || 'не выявлен'}`);
  if (stack.extras && stack.extras.length) {
    parts.push(`- **Дополнительно:** ${stack.extras.join(', ')}`);
  }
  parts.push('');

  // Зависимости (если есть package.json)
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
    } catch { /* ignore */ }
  }

  // --- БЫСТРЫЙ СТАРТ ---
  const quickStart = buildQuickStart({ stack });
  parts.push('## 📦 Быстрый старт');
  parts.push(quickStart);
  parts.push('');

  // Альтернативный запуск через Docker (если поддерживается)
  if (stack.dockerSupported && stack.dockerCommands.length) {
    parts.push('### Запуск через Docker');
    parts.push('');
    parts.push('```bash');
    stack.dockerCommands.forEach(cmd => parts.push(cmd));
    parts.push('```');
    parts.push('');
  }

  // --- СТРУКТУРА ПРОЕКТА ---
  parts.push('## 📂 Структура проекта');
  parts.push('');
  parts.push('```');
  parts.push(tree);
  parts.push('```');
  parts.push('');

  // --- ЛИЦЕНЗИЯ ---
  parts.push('## 📄 Лицензия');
  parts.push('');
  parts.push('MIT');
  parts.push('');

  const markdown = parts.join('\n');
  return { markdown, stack };
}

// ──────────────────── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ЛОКАЛЬНОЙ ГЕНЕРАЦИИ ────────────────────

/**
 * Формирует описание проекта с учётом тона, бизнес-контекста и ответов пользователя.
 */
function buildDescription({ projectName, stack, interactiveAnswers, businessContext, tone }) {
  const parts = [];

  // 1. Базовое введение: что это за проект
  let intro = '';
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

  if (projectType !== 'other') {
    intro = `**${projectName}** — это ${typeLabel} на **${language}**${framework}.`;
  } else {
    intro = `**${projectName}** — это проект на **${language}**${framework}.`;
  }

  // 2. Целевая аудитория и бизнес-ценность
  let audienceText = '';
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

  // 3. Дополнительная информация из бизнес-контекста (документация, коммиты)
  let contextInfo = '';
  if (businessContext) {
    // Если есть файлы документации, извлекаем из них ключевые фразы
    const docPhrases = [];
    if (businessContext.docs) {
      for (const [file, content] of Object.entries(businessContext.docs)) {
        // Ищем строки, начинающиеся с # или - и берем первые 2-3
        const lines = content.split('\n').filter(line => line.match(/^#{1,3}\s|^-\s|^\*\s/)).slice(0, 3);
        if (lines.length) {
          docPhrases.push(lines.join(' '));
        }
      }
    }
    if (docPhrases.length) {
      contextInfo = docPhrases.slice(0, 2).join(' ');
    } else if (businessContext.features && businessContext.features.length) {
      // Или из последних коммитов feat
      const featureTitles = businessContext.features.slice(0, 2).map(f => f.replace(/^feat(\(.*\))?:\s*/, ''));
      if (featureTitles.length) {
        contextInfo = `Недавно добавлены: ${featureTitles.join('; ')}.`;
      }
    }
  }

  // 4. Сборка описания в зависимости от тона
  let description = '';
  switch (tone) {
    case 'marketing':
      // Энергичный, продающий, акцент на выгодах
      description = `${intro} `;
      if (valueText) {
        description += `Главная ценность: ${valueText}. `;
      }
      if (contextInfo) {
        description += `${contextInfo} `;
      }
      description += `Этот инструмент создан для ${audienceLabel}, чтобы решать их задачи эффективно и просто. `;
      description += `Попробуйте прямо сейчас и убедитесь в его преимуществах.`;
      break;

    case 'minimal':
      // Кратко, только суть
      description = `${intro}`;
      if (valueText) {
        description += ` Ценность: ${valueText}.`;
      }
      if (contextInfo) {
        description += ` ${contextInfo}`;
      }
      break;

    default: // technical
      // Чётко, фактологично, нейтрально
      description = `${intro} `;
      if (valueText) {
        description += `Бизнес-ценность: ${valueText}. `;
      }
      if (audience) {
        description += `Проект ориентирован на ${audienceLabel}. `;
      }
      if (contextInfo) {
        description += `${contextInfo} `;
      }
      // Добавим пару слов о назначении
      if (projectType === 'microservice') {
        description += `Он предоставляет REST API и управление через CLI.`;
      } else if (projectType === 'library') {
        description += `Он предоставляет API для интеграции в ваши проекты.`;
      } else if (projectType === 'cli') {
        description += `Управление осуществляется через командную строку.`;
      } else if (projectType === 'web') {
        description += `Доступ к функциональности осуществляется через веб-интерфейс.`;
      }
      break;
  }

  return description;
}

/**
 * Формирует список ключевых возможностей.
 * Сначала идут пользовательские, потом автоматические (без дублирования).
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

  // Удаляем дубли (по смыслу, не по строке)
  const all = [...userFeatures];
  for (const af of autoFeatures) {
    // Проверяем, есть ли уже похожая функция (упрощённо – по ключевому слову)
    const words = af.split(' ');
    const keyword = words.slice(1).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
    const exists = all.some(f => {
      const fWords = f.split(' ').slice(1).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
      return fWords === keyword;
    });
    if (!exists) all.push(af);
  }

  // Если ничего не добавлено, добавляем стандартные
  if (all.length === 0) {
    all.push('📁 Структурированный код');
    all.push('📦 Управление зависимостями');
  }

  return all;
}

/**
 * Формирует раздел «Быстрый старт» с подробными инструкциями и пояснениями.
 */
function buildQuickStart({ stack }) {
  const lines = [];

  // Требования
  lines.push('');
  lines.push('### Требования');
  lines.push('');
  if (stack.requirements && stack.requirements.length) {
    stack.requirements.forEach(req => lines.push(`- ${req}`));
  } else {
    lines.push('- Убедитесь, что необходимые инструменты установлены (см. документацию).');
  }
  lines.push('');

  // Установка и запуск
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

  // Пояснение
  lines.push('> ℹ️  Подробные инструкции могут отличаться в зависимости от вашего окружения.');
  lines.push('> Если у вас возникли проблемы, обратитесь к официальной документации.');

  return lines.join('\n');
}

/**
 * Строит текстовый контекст для AI-генерации (оставлено без изменений).
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