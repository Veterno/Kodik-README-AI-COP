'use strict';

const { detectStack, mergeStacks } = require('../context/stack/detector');
const { log } = require('../core/logger');

/**
 * Локальная генерация данных для README (без AI).
 * @param {object} params - параметры генерации
 * @param {object} [precomputedStack] - предварительно вычисленный стек (чтобы избежать двойной детекции)
 */
function generateLocal(params, precomputedStack) {
  const { projectName, tree, flatFiles, manifests, mainFile, interactiveAnswers, businessContext, detectedLicense, codeContext, options } = params;
  
  const stack = precomputedStack || (() => {
    const stacks = manifests && manifests.length > 0 
      ? manifests.map(m => detectStack(m, flatFiles))
      : [detectStack(null, flatFiles)];
    return mergeStacks(stacks);
  })();
  const tone = interactiveAnswers?.tone || options?.content?.tone || 'technical';

  const codeFunctions = extractFunctionsFromCode(codeContext);

  const description = buildDescription({
    projectName,
    stack,
    interactiveAnswers,
    businessContext,
    tone,
    codeFunctions
  });

  const features = buildFeaturesList({ interactiveAnswers, tree, flatFiles, codeFunctions });

  const quickStartData = buildQuickStartData({ stack });

  return {
    title: projectName,
    description,
    features,
    stack: {
      language: stack.language || 'не определён',
      framework: stack.framework,
      packageManager: stack.packageManager || 'не выявлен',
      extras: stack.extras
    },
    quickStart: quickStartData,
    projectStructure: tree,
    license: detectedLicense || interactiveAnswers?.license || options?.answers?.license || 'MIT'
  };
}

/**
 * Извлекает имена функций и классов из codeContext.
 */
function extractFunctionsFromCode(codeContext) {
  if (!codeContext) return [];
  
  // codeContext обычно разделен блоками "--- Файл: ... ---"
  const blocks = codeContext.split(/\n--- Файл: /);
  const functions = new Set();

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Регулярка для поиска функций, классов, интерфейсов (JS/TS/Python/Go)
      // Ищем: function Name, class Name, const Name = (..., def Name(
      const match = trimmed.match(/^(?:export\s+)?(?:function|class|interface|type|const|def)\s+([a-zA-Z0-9_]+)/);
      if (match && match[1]) {
        // Игнорируем слишком общие или служебные слова
        const name = match[1];
        if (name.length > 2 && !['const', 'let', 'var', 'return', 'if', 'else'].includes(name)) {
          functions.add(name);
        }
      }

      // Поиск стрелочных функций: const name = (...) =>
      const arrowMatch = trimmed.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*\(/);
      if (arrowMatch && arrowMatch[1]) {
        functions.add(arrowMatch[1]);
      }
    }
  }
  
  return Array.from(functions);
}

function buildDescription({ projectName, stack, interactiveAnswers, businessContext, tone, codeFunctions }) {
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

  let valueText = interactiveAnswers?.value || '';

  let contextInfo = '';
  if (businessContext && businessContext.docs) {
    const phrases = [];
    for (const [file, content] of Object.entries(businessContext.docs)) {
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

  if (!contextInfo && businessContext && businessContext.features && businessContext.features.length) {
    const featureTitles = businessContext.features.slice(0, 2).map(f => f.replace(/^feat(\(.*\))?:\s*/, ''));
    if (featureTitles.length) {
      contextInfo = `Недавно добавлены: ${featureTitles.join('; ')}.`;
    }
  }

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

      if (codeFunctions && codeFunctions.length > 0) {
        const keyExports = codeFunctions.slice(0, 3).join(', ');
        description += ` Ключевые компоненты: ${keyExports}.`;
      }
      break;
  }

  return description;
}

function buildFeaturesList({ interactiveAnswers, tree, flatFiles, codeFunctions }) {
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

  if (codeFunctions && codeFunctions.length > 0) {
    const top5 = codeFunctions.slice(0, 5);
    top5.forEach(fn => {
      autoFeatures.push(`🔧 Функция/Компонент: ${fn}`);
    });
  }

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

function buildQuickStartData({ stack }) {
  const data = {
    requirements: stack.requirements || [],
    installCommands: stack.installCommands || [],
    runCommands: stack.runCommands || [],
    dockerCommands: (stack.dockerSupported && stack.dockerCommands) ? stack.dockerCommands : []
  };

  if (data.requirements.length === 0) {
    data.requirements.push('Убедитесь, что необходимые инструменты установлены (см. документацию).');
  }

  return data;
}

module.exports = { generateLocal };
