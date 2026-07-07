'use strict';

/**
 * src/finalScanner.js
 * Финальный сканер README.md. Проверяет заданные разделы на предмет языка.
 * Если текст не соответствует целевому языку — переводит через AI.
 */

const { AiClient } = require('./aiClient');
const { log } = require('./logger');
const { TRANSLATION_CONFIG } = require('./config');

/**
 * Основная функция финального сканирования.
 */
async function finalScan(markdown, options) {
  const { targetLanguage: TARGET_LANGUAGE, translateSections: SECTIONS, noTranslate } = options.content;
  const SKIP_IF_SHORT = TRANSLATION_CONFIG.SKIP_IF_SHORT;
  
  if (noTranslate) return markdown;

  const useAI = options.ai.enabled;
  if (!useAI) {
    log.warn('Финальный сканер: перевод включен, но AI отключен. Пропускаю.');
    return markdown;
  }

  log.step(`Запуск финального сканера (целевой язык: ${TARGET_LANGUAGE})...`);

  const client = new AiClient(options.ai);
  let updatedMarkdown = markdown;

  for (const sectionName of SECTIONS) {
    // Динамическое создание регулярного выражения для поиска раздела
    // Ищем заголовок ## Эмодзи? Название раздела
    const sectionRegex = new RegExp(`(## [^\\n]*?${sectionName}\\n\\n?)([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = updatedMarkdown.match(sectionRegex);

    if (match) {
      const header = match[1];
      const content = match[2].trim();

      if (!content) continue;

      // Проверка на длину (в словах)
      const wordCount = content.split(/\s+/).length;
      if (wordCount < SKIP_IF_SHORT) {
        log.debug(`Раздел "${sectionName}" слишком короткий (${wordCount} слов), пропускаю перевод.`);
        continue;
      }

      // Определяем, нужно ли переводить
      // Если forceTranslate не задан, используем эвристику shouldTranslate
      const forceTranslate = options.content?.forceTranslate ?? false;
      if (forceTranslate || shouldTranslate(content, TARGET_LANGUAGE)) {        log.info(`Обнаружен текст на иностранном языке в разделе "${sectionName}", перевод на ${TARGET_LANGUAGE}...`);
        try {
          const translated = await translateToLanguage(client, content, TARGET_LANGUAGE);
          if (translated && translated !== content) {
            updatedMarkdown = updatedMarkdown.replace(match[0], `${header}${translated}\n`);
          }
        } catch (err) {
          log.warn(`Не удалось перевести раздел "${sectionName}": ${err.message}`);
        }
      }
    }
  }

  return updatedMarkdown;
}

/**
 * Улучшенная эвристика определения языка.
 * Проверяет, преобладает ли в тексте алфавит, отличный от целевого.
 */
function shouldTranslate(text, targetLang) {
  const cleanText = text.replace(/`[^`]+`/g, '') // Убираем инлайн-код
                         .replace(/```[\s\S]*?```/g, ''); // Убираем блоки кода

  if (cleanText.length < 10) return false;

  const latinCount = (cleanText.match(/[a-zA-Z]/g) || []).length;
  const cyrillicCount = (cleanText.match(/[а-яА-Я]/g) || []).length;

  if (targetLang === 'ru') {
    // Если цель — русский, переводим, если латиницы значительно больше
    return latinCount > cyrillicCount * 2 && latinCount > 20;
  }

  if (targetLang === 'en') {
    // Если цель — английский, переводим, если кириллицы много
    return cyrillicCount > 10;
  }

  // Для других языков пока полагаемся на то, что если текст преимущественно латинский 
  // и цель не английский — возможно, стоит перевести (упрощенно)
  return true;
}

/**
 * Запрос к AI для перевода.
 */
async function translateToLanguage(client, text, targetLang) {
  const langMap = {
    'ru': 'русский',
    'en': 'английский',
    'es': 'испанский',
    'fr': 'французский',
    'de': 'немецкий',
    'zh': 'китайский'
  };

  const targetLangFull = langMap[targetLang] || targetLang;

  const systemPrompt = `Ты — профессиональный переводчик технической документации. Твоя задача — перевести текст на ${targetLangFull} язык, сохраняя смысл, форматирование Markdown и технические термины (если они общеприняты). Верни ТОЛЬКО переведенный текст без пояснений.`;
  const userPrompt = `Переведи следующий текст на ${targetLangFull} язык:\n\n${text}`;

  const result = await client.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return result.trim();
}

module.exports = { finalScan };
