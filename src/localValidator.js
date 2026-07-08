'use strict';

const { DEFAULT_SECTIONS, DEFAULT_EMOJIS } = require('./config');
const { log } = require('./logger');

/**
 * Локальная валидация README (без AI).
 */
function validateLocal(markdown, options = {}) {
  const sections = options.sections || DEFAULT_SECTIONS;
  const emojis = options.emojis || DEFAULT_EMOJIS;
  const errors = [];
  const warnings = [];
  const fixes = [];

  // 1. Проверка обязательных разделов
  for (const section of sections) {
    if (!section.enabled) continue;
    
    // Проверяем заголовок раздела (с учетом возможных эмодзи)
    const sectionTitle = section.title;
    if (!sectionTitle) continue; // Пропускаем заголовок проекта (id: 'title')

    const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    const emoji = emojis[section.id] || '';
    const escapedEmoji = emoji.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    
    // Регулярка ищет заголовок ## (с эмодзи или без)
    const sectionRegex = new RegExp(`^##\\s+(?:${escapedEmoji}\\s*)?${escapedTitle}`, 'im');
    
    if (!sectionRegex.test(markdown)) {
      errors.push({ 
        type: 'missing_section', 
        section: sectionTitle,
        id: section.id,
        message: `Отсутствует обязательный раздел: ${sectionTitle}`
      });
      
      fixes.push({
        type: 'add_section',
        sectionId: section.id,
        sectionTitle: sectionTitle,
        emoji: emoji
      });
    } else {
      // Если раздел есть, проверяем его содержимое на пустоту
      const contentRegex = new RegExp(`^##\\s+(?:${escapedEmoji}\\s*)?${escapedTitle}.*\\n?([\\s\\S]*?)(?=\\r?\\n##|$)`, 'im');
      const match = markdown.match(contentRegex);
      if (match) {
        const content = match[1].trim();      if (!content) {
        warnings.push({
          type: 'empty_section',
          section: sectionTitle,
          message: `Раздел "${sectionTitle}" пуст`
        });
      } else {
        // Дополнительная проверка для "Быстрый старт" или "Установка"
        if ((section.id === 'quickStart' || sectionTitle.toLowerCase().includes('установка')) && !content.includes('```')) {
          warnings.push({
            type: 'no_commands',
            section: sectionTitle,
            message: `В разделе "${sectionTitle}" не найдены блоки кода с командами`
          });
        }
      }      }
    }
  }

  // 2. Проверка ссылок
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    const url = match[2];
    // Если это не якорь (#anchor) и не относительный путь (./path или ../path)
    if (!url.startsWith('#') && !url.startsWith('.') && !url.includes('/')) {
      // Проверяем, похоже ли это на URL
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        warnings.push({
          type: 'invalid_link',
          link: url,
          message: `Возможно, невалидная ссылка: ${url}`
        });
      }
    }
    
    if (url.startsWith('http')) {
      try {
        new URL(url);
      } catch (e) {
        warnings.push({
          type: 'invalid_link',
          link: url,
          message: `Некорректный формат URL: ${url}`
        });
      }
    }
  }

  // 3. Проверка формата Markdown
  // Заголовки без пробела после #
  const badHeaderRegex = /^#{1,6}[^#\s]/gm;
  if (badHeaderRegex.test(markdown)) {
    warnings.push({
      type: 'bad_header_format',
      message: 'Найдены заголовки без пробела после символов #'
    });
    fixes.push({ type: 'fix_headers' });
  }

  // Неоткрытые/незакрытые блоки кода
  const codeBlocks = (markdown.match(/^```/gm) || []).length;
  if (codeBlocks % 2 !== 0) {
    errors.push({
      type: 'broken_code_blocks',
      message: 'Обнаружен незакрытый блок кода (```)'
    });
  }

  return { errors, warnings, fixes };
}

/**
 * Применяет исправления к тексту README.
 */
function applyFixes(markdown, fixes) {
  let result = markdown;

  for (const fix of fixes) {
    if (fix.type === 'add_section') {
      const emojiPart = fix.emoji ? `${fix.emoji} ` : '';
      const defaultContent = generateDefaultContent(fix.sectionId);
      result = result.trim() + `\n\n## ${emojiPart}${fix.sectionTitle}\n\n${defaultContent}\n`;
      log.info(`[Fix] Добавлен раздел: ${fix.sectionTitle}`);
    }

    if (fix.type === 'fix_headers') {
      result = result.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');
      log.info('[Fix] Исправлен формат заголовков (добавлены пробелы)');
    }
  }

  return result;
}

/**
 * Генерирует дефолтное содержимое для разделов.
 */
function generateDefaultContent(sectionId) {
  const contents = {
    description: 'Подробное описание проекта появится здесь.',
    features: '- Функция 1\n- Функция 2',
    stack: '- Node.js\n- JavaScript',
    quickStart: '```bash\nnpm install\nnpm start\n```',
    projectStructure: '```\n.\n├── src\n└── package.json\n```',
    license: 'Этот проект распространяется под лицензией MIT.'
  };
  return contents[sectionId] || 'Содержимое раздела.';
}

module.exports = {
  validateLocal,
  applyFixes
};
