'use strict';

const { AiClient } = require('../generator/ai/client');
const { log } = require('../core/logger');
const { validateLocal } = require('./localRules');
/**
 * Валидация сгенерированного README.
 * Сначала выполняется локальная проверка, затем (опционально) AI-валидация.
 */
async function validateReadme(markdown, context, options) {
  log.info('Выполняю локальную валидацию...');
  const localResult = validateLocal(markdown, options.content);
  
  // Вывод локальных результатов
  if (localResult.errors.length > 0) {
    log.error('Найдены критические ошибки в структуре README:');
    localResult.errors.forEach(err => log.error(`  - ${err.message}`));
  }

  if (localResult.warnings.length > 0) {
    log.warn('Найдены замечания к README:');
    localResult.warnings.forEach(warn => log.warn(`  - ${warn.message}`));
  }

  if (localResult.errors.length === 0 && localResult.warnings.length === 0) {
    log.ok('Локальная валидация пройдена успешно.');
  }

  // Если AI отключен или есть критические ошибки, которые не позволяют AI корректно оценить,
  // мы можем вернуть только локальный результат.
  if (!options.ai.enabled) {
    return {
      local: localResult,
      scores: null,
      feedback: 'AI-валидация пропущена (AI отключен).'
    };
  }

  log.info('Запускаю AI-валидацию (LLM-as-a-Judge)...');
  const client = new AiClient({ ...options.ai, temperature: 0.2 });

  const systemPrompt = `Ты — эксперт по качеству технической документации. 
Твоя задача — оценить сгенерированный README.md на основе предоставленного контекста проекта.
Оценивай по шкале от 1 до 10 по следующим критериям:
1. accuracy: Насколько точно описание соответствует стеку и файлам проекта.
2. clarity: Насколько текст понятен и хорошо структурирован.
3. completeness: Все ли важные разделы (установка, запуск, фичи) присутствуют.
4. hallucinations: Отсутствие выдуманных функций или зависимостей (10 — галлюцинаций нет, 1 — много выдумок).

Верни ответ СТРОГО в формате JSON:
{
  "scores": {
    "accuracy": 0,
    "clarity": 0,
    "completeness": 0,
    "hallucinations": 0
  },
  "feedback": "Краткий комментарий почему такие оценки"
}`;

  const userPrompt = `КОНТЕКСТ ПРОЕКТА:
${context}

СГЕНЕРИРОВАННЫЙ README:
---
${markdown}
---

Проведи аудит и выстави оценки.`;

  try {
    const aiResult = await client.generateReadme({ systemPrompt, userPrompt });
    return {
      local: localResult,
      ...aiResult
    };
  } catch (err) {
    log.error(`Ошибка при AI-валидации: ${err.message}`);
    return {
      local: localResult,
      scores: { accuracy: 0, clarity: 0, completeness: 0, hallucinations: 0 },
      feedback: "Ошибка AI-валидации: " + err.message
    };
  }
}

module.exports = { validateReadme };
