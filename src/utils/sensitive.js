'use strict';

const { SENSITIVE_PATTERNS } = require('../core/config');

/**
 * Проверяет строку на наличие чувствительных данных.
 */
function isSensitive(text) {
  if (!text) return false;
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Рекурсивно маскирует чувствительные данные в строках, объектах и массивах.
 */
function maskSensitive(data) {
  if (data === null || data === undefined) return data;

  // Обработка массивов
  if (Array.isArray(data)) {
    return data.map(item => maskSensitive(item));
  }

  // Обработка объектов
  if (typeof data === 'object' && !(data instanceof RegExp) && !(data instanceof Date)) {
    const maskedObj = {};
    for (const [key, value] of Object.entries(data)) {
      // Если сам ключ подозрительный (например, "password"), маскируем значение полностью
      if (isSensitive(key)) {
        maskedObj[key] = '[REDACTED]';
      } else {
        maskedObj[key] = maskSensitive(value);
      }
    }
    return maskedObj;
  }

  // Если не строка, возвращаем как есть
  if (typeof data !== 'string') return data;

  let maskedText = data;

  for (const pattern of SENSITIVE_PATTERNS) {
    // Создаем глобальную версию регулярки, если её нет
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const globalPattern = new RegExp(pattern.source, flags);

    // Если паттерн — это просто ключевое слово (api_key, password),
    // пытаемся замаскировать значение после него (key=value, key: value)
    if (/key|token|secret|password|passwd|auth/i.test(pattern.source) && !pattern.source.includes('[:=]')) {
      const assignmentRegex = new RegExp(`(${pattern.source})\\s*[:=]\\s*['" ]?([^'"\\s\\n,;}]+)['" ]?`, 'gi');
      maskedText = maskedText.replace(assignmentRegex, '$1: [REDACTED]');
    } else {
      // Для специфичных форматов (AWS, JWT) маскируем само совпадение
      maskedText = maskedText.replace(globalPattern, '[REDACTED]');
    }
  }

  return maskedText;
}

module.exports = {
  isSensitive,
  maskSensitive
};
