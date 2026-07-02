'use strict';

/**
 * src/aiClient.js
 * Клиент для работы с OpenAI-совместимыми API (Ollama, LM Studio, OpenAI, Groq и др.)
 */

const axios = require('axios');
const { log } = require('./logger');

/**
 * Отправляет запрос к модели.
 * @param {string} prompt - пользовательский промпт
 * @param {string} systemPrompt - системный промпт (опционально)
 * @param {object} params - параметры: temperature, topP, model (если не заданы, берутся из .env)
 * @returns {Promise<string>} - ответ модели
 */
async function callAI(prompt, systemPrompt = '', params = {}) {
  const baseURL = process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1';
  const apiKey = process.env.OPENAI_API_KEY || 'ollama';
  const model = params.model || process.env.OPENAI_MODEL || 'llama3.1';
  const temperature = params.temperature ?? parseFloat(process.env.OPENAI_TEMPERATURE || 0.7);
  const topP = params.topP ?? parseFloat(process.env.OPENAI_TOP_P || 0.9);

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  try {
    const response = await axios.post(
      `${baseURL}/chat/completions`,
      {
        model,
        messages,
        temperature,
        top_p: topP,
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000,
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (err) {
    log.error(`Ошибка при вызове AI: ${err.message}`);
    if (err.response) {
      log.error(`Статус: ${err.response.status}, данные: ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

module.exports = { callAI };