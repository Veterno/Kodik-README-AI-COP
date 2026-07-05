'use strict';

const { AiClient } = require('./aiClient');
const { log } = require('./logger');

/**
 * Валидация сгенерированного README с помощью LLM-as-a-Judge.
 */
async function validateReadme(markdown, context, options) {
  const client = new AiClient({ ...options.ai, temperature: 0.2 }); // Низкая температура для стабильности оценок

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
    const result = await client.generateReadme({ systemPrompt, userPrompt });
    return result;
  } catch (err) {
    log.error(`Ошибка при валидации: ${err.message}`);
    return {
      scores: { accuracy: 0, clarity: 0, completeness: 0, hallucinations: 0 },
      feedback: "Ошибка валидации: " + err.message
    };
  }
}

module.exports = { validateReadme };
