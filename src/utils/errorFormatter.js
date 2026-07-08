'use strict';

/**
 * src/utils/errorFormatter.js
 * Утилита для форматирования ошибок, особенно сетевых и API.
 */

/**
 * Преобразует ошибки Axios в человеко-читаемые сообщения.
 * @param {Error} err - Объект ошибки (обычно AxiosError)
 * @returns {string} - Отформатированное сообщение
 */
function formatAxiosError(err) {
  if (!err.isAxiosError) {
    return err.message;
  }

  const { response, code } = err;
  
  // Сетевые ошибки (нет ответа от сервера)
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
    return `Ошибка сети: Не удалось связаться с AI-провайдером. Проверьте интернет-соединение и корректность OPENAI_BASE_URL.`;
  }

  if (code === 'ECONNABORTED') {
    return `Превышено время ожидания (timeout). Возможно, сервер перегружен или недоступен.`;
  }

  // Ошибки с ответом от сервера
  if (response) {
    const status = response.status;
    const errorData = response.data?.error?.message || response.data?.error || JSON.stringify(response.data);

    switch (status) {
      case 401:
        return `Ошибка авторизации: Неверный API-ключ. Проверьте переменную OPENAI_API_KEY.`;
      case 404:
        return `Модель не найдена. Проверьте название модели в аргументе --model или переменной OPENAI_MODEL.`;
      case 429:
        return `Превышен лимит запросов (Rate limit). Пожалуйста, подождите немного или уменьшите количество запросов.`;
      case 500:
        return `Внутренняя ошибка сервера AI-провайдера. Попробуйте позже.`;
      case 503:
        return `Сервис AI временно недоступен. Проверьте статус провайдера.`;
      default:
        return `AI запрос завершился ошибкой (Статус ${status}): ${errorData}`;
    }
  }

  return `Ошибка при запросе к AI: ${err.message}`;
}

module.exports = {
  formatAxiosError
};
