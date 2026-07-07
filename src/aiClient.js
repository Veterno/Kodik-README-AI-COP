'use strict';

/**
 * src/aiClient.js
 * Улучшенный клиент для работы с OpenAI-совместимыми API.
 * Поддерживает Ollama, LM Studio, Groq, DeepSeek и др.
 */

const axios = require('axios');
const { log } = require('./logger');
const { AI_CONFIG } = require('./config');
const { parseJsonFromResponse } = require('./utils/jsonParser');

class AiClient {
  constructor(config = {}) {
    this.baseURL = (config.apiUrl || config.baseURL || process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || 'ollama';
    this.model = config.model || process.env.OPENAI_MODEL || 'llama3.1';
    this.provider = config.provider || this._detectProvider(this.baseURL);    
    this.temperature = config.temperature ?? parseFloat(process.env.OPENAI_TEMPERATURE || AI_CONFIG.DEFAULT_TEMPERATURE);
    this.timeout = config.timeout || AI_CONFIG.TIMEOUT;
    this.maxRetries = config.retryAttempts ?? config.maxRetries ?? AI_CONFIG.RETRY_ATTEMPTS;
  }

  /**
   * Определяет провайдера по URL для применения специфичных адаптаций.
   */
  _detectProvider(url) {
    if (url.includes('ollama')) return 'ollama';
    if (url.includes('groq')) return 'groq';
    if (url.includes('deepseek')) return 'deepseek';
    if (url.includes('localhost') || url.includes('127.0.0.1')) return 'local';
    return 'openai';
  }

  /**
   * Маскирует API ключ для безопасного логирования.
   */
  _maskKey(key) {
    if (!key || key === 'ollama') return key;
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  /**
   * Извлекает текстовое содержимое из ответа провайдера.
   */
  _extractContent(response) {
    const data = response.data;
    if (!data) return '';

    // Стандарт OpenAI
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.message && typeof choice.message.content === 'string') {
        return choice.message.content;
      }
      if (typeof choice.text === 'string') {
        return choice.text;
      }
    }

    // Прямой ответ (некоторые локальные прокси)
    if (typeof data.response === 'string') return data.response;
    if (typeof data === 'string') return data;

    return JSON.stringify(data);
  }

  async chat(messages, options = {}) {
    const { 
      json = false, 
      temperature = this.temperature, 
      retryCount = 0 
    } = options;

    const useResponseFormat = json && AI_CONFIG.USE_RESPONSE_FORMAT && this.provider !== 'ollama';

    try {
      log.debug(`AI Request [${this.provider}]: model=${this.model}, json=${json}, retry=${retryCount}`);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature,
          response_format: useResponseFormat ? { type: 'json_object' } : undefined,
          stream: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: this.timeout,
        }
      );

      return this._extractContent(response).trim();
    } catch (err) {
      const errorData = err.response?.data;
      const errorMessage = errorData ? (typeof errorData === 'object' ? JSON.stringify(errorData) : errorData) : err.message;

      // Обработка ошибки неподдерживаемого параметра response_format
      if (err.response && err.response.status === 400 && useResponseFormat) {
        log.warn(`Провайдер ${this.provider} не поддерживает response_format. Пробую без него...`);
        return this.chat(messages, { ...options, json: false, retryCount: retryCount + 1 });
      }

      if (retryCount < this.maxRetries) {
        const nextRetry = retryCount + 1;
        const waitTime = Math.pow(2, nextRetry) * 1000;
        log.warn(`Ошибка AI (${errorMessage}). Попытка ${nextRetry}/${this.maxRetries} через ${waitTime}ms...`);
        await new Promise(r => setTimeout(r, waitTime));
        return this.chat(messages, { ...options, retryCount: nextRetry });
      }

      log.error(`Критическая ошибка AI после ${retryCount} попыток: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
  /**
   * Генерация README с гарантированным получением JSON.
   */
  async generateReadme(context, options = {}) {
    const systemPrompt = context.systemPrompt || 'You are a technical writer.';
    const userPrompt = context.userPrompt || (typeof context === 'string' ? context : '');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // Если нам нужен JSON, добавим инструкцию в промпт для надежности
    if (options.json) {
      messages.push({
        role: 'user',
        content: 'IMPORTANT: Respond ONLY with a valid JSON object. Do not include any explanations or markdown blocks outside the JSON.'
      });
    }

    const responseText = await this.chat(messages, { 
      ...options, 
      temperature: AI_CONFIG.JSON_TEMPERATURE 
    });

    try {
      return parseJsonFromResponse(responseText);
    } catch (err) {
      log.error('Не удалось распарсить JSON из ответа AI.');
      log.debug('Raw response for failed parse:', responseText);
      
      if (options.retryOnParseError !== false) {
        log.info('Повторная попытка с более строгим промптом...');
        return this.generateReadme(context, { ...options, retryOnParseError: false });
      }
      
      throw new Error(`JSON Parse Error: ${err.message}`);
    }
  }
}

module.exports = { AiClient };
