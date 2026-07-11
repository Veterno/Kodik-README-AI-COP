'use strict';

/**
 * src/aiClient.js
 * Улучшенный клиент для работы с OpenAI-совместимыми API.
 * Поддерживает Ollama, LM Studio, Groq, DeepSeek и др.
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const { log } = require('../../core/logger');
const { AI_CONFIG } = require('../../core/config');
const { parseJsonFromResponse } = require('../../utils/jsonParser');
const { formatAxiosError } = require('../../utils/errorFormatter');
class AiClient {
  constructor(config = {}) {
    this.baseURL = (config.apiUrl || config.baseURL || process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || 'ollama';
    this.model = config.model || process.env.OPENAI_MODEL || 'llama3.1';
    this.provider = config.provider || this._detectProvider(this.baseURL);    
    this.temperature = config.temperature ?? parseFloat(process.env.OPENAI_TEMPERATURE || AI_CONFIG.DEFAULT_TEMPERATURE);
    this.timeout = config.timeout || AI_CONFIG.TIMEOUT;
    this.maxRetries = config.retryAttempts ?? config.maxRetries ?? AI_CONFIG.RETRY_ATTEMPTS;

    // Настройка axios с ретраями
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      }
    });

    if (this.maxRetries > 0) {
      axiosRetry(this.client, {
        retries: this.maxRetries,
        retryDelay: (retryCount) => {
          // retryCount начинается с 1 для первой попытки переспроса
          const delay = Math.pow(2, retryCount - 1) * 1000;
          log.warn(`Повторная попытка запроса к AI (${retryCount}/${this.maxRetries}) через ${delay}ms...`);
          return delay;
        },
        retryCondition: (error) => {
          // Повторяем только при сетевых ошибках или 5xx
          return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
                 (error.response && error.response.status >= 500);
        }
      });
    }

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
      temperature = this.temperature
    } = options;

    const useResponseFormat = json && AI_CONFIG.USE_RESPONSE_FORMAT && this.provider !== 'ollama' && this.provider !== 'local';

    try {
      // Проверка API-ключа
      const isLocal = this.provider === 'ollama' || this.provider === 'local';
      if (!isLocal && (!this.apiKey || this.apiKey === 'ollama')) {
        throw new Error('❌ OPENAI_API_KEY не задан. Укажите его в .env или через аргумент --api-key.');
      }

      log.debug(`AI Request [${this.provider}]: model=${this.model}, json=${json}`);
      
      const response = await this.client.post(
        '/chat/completions',
        {
          model: this.model,
          messages,
          temperature,
          response_format: useResponseFormat ? { type: 'json_object' } : undefined,
          stream: false,
        }
      );

      return this._extractContent(response).trim();
    } catch (err) {
      const formattedError = formatAxiosError(err);
      
      // Обработка ошибки неподдерживаемого параметра response_format
      if (err.response && err.response.status === 400 && useResponseFormat) {
        log.warn(`Провайдер ${this.provider} не поддерживает response_format. Пробую без него...`);
        return this.chat(messages, { ...options, json: false });
      }

      log.error(`Критическая ошибка AI: ${formattedError}`, err);
      throw new Error(formattedError);
    }
  }  /**
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
      temperature: options.temperature ?? AI_CONFIG.JSON_TEMPERATURE 
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
