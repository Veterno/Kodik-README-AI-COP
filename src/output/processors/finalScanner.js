'use strict';

/**
 * src/finalScanner.js
 * Финальный сканер README.md. Проверяет заданные разделы на предмет языка.
 * Если текст не соответствует целевому языку — переводит через AI.
 */

const { AiClient } = require('../../generator/ai/client');
const { log } = require('../../core/logger');
const { TRANSLATION_CONFIG } = require('../../core/config');
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
          log.warn(`⚠️ Перевод раздела "${sectionName}" не удался. Оставляем оригинальный текст.`);
        }
      }
    }
  }

  return updatedMarkdown;
}

/**
 * Определяет доминирующую письменность текста по Unicode-диапазонам.
 * @param {string} text
 * @returns {string|null} 'latin', 'cyrillic', 'cjk' или null
 */
function getDominantScript(text) {
  let latin = 0, cyrillic = 0, cjk = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0);
    if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) {
      latin++;
    } else if (code >= 0x0400 && code <= 0x04FF) {
      cyrillic++;
    } else if (
      (code >= 0x4E00 && code <= 0x9FFF) || // CJK Unified
      (code >= 0x3040 && code <= 0x309F) || // Hiragana
      (code >= 0x30A0 && code <= 0x30FF)    // Katakana
    ) {
      cjk++;
    }
  }

  const max = Math.max(latin, cyrillic, cjk);
  if (max === 0) return null;
  if (max === latin) return 'latin';
  if (max === cyrillic) return 'cyrillic';
  return 'cjk';
}

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

  // Для других языков: определяем доминирующую письменность и сверяем с целевым языком
  const scriptMap = {
    latin: ['en', 'es', 'fr', 'de', 'it', 'pt'],
    cyrillic: ['ru', 'uk', 'be', 'bg', 'sr'],
    cjk: ['zh', 'ja', 'ko']
  };

  const dominantScript = getDominantScript(cleanText);
  const targetScript = Object.keys(scriptMap).find(script =>
    scriptMap[script].includes(targetLang)
  );

  // Если доминирующая письменность текста совпадает с целевым языком — не переводим
  if (dominantScript && targetScript && dominantScript === targetScript) {
    return false;
  }

  // Несовпадение письменности или не удалось определить — переводим
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
