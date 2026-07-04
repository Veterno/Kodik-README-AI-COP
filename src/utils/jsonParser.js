/**
 * Утилита для надежного извлечения JSON из текста ответа LLM.
 */

/**
 * Пытается найти и распарсить JSON (объект или массив) в строке.
 * @param {string} text 
 * @returns {any} Распарсенный объект или массив
 * @throws {Error} Если JSON не найден или невалиден
 */
function parseJsonFromResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Пустой ответ или не строка');
  }

  // 1. Попытка найти блок ```json ... ```
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch (e) {
      // Если в блоке невалидный JSON, попробуем искать дальше
    }
  }

  // 2. Поиск по балансу скобок (для объектов { ... } и массивов [ ... ])
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  
  let startIdx = -1;
  let opener = '';
  let closer = '';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    opener = '{';
    closer = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    opener = '[';
    closer = ']';
  }

  if (startIdx !== -1) {
    let balance = 0;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === opener) balance++;
      if (text[i] === closer) balance--;
      
      if (balance === 0) {
        const potentialJson = text.substring(startIdx, i + 1);
        try {
          return JSON.parse(potentialJson);
        } catch (e) {
          // Игнорируем и ищем дальше, если это была ложная скобка
        }
      }
    }
  }

  // 3. Последняя попытка: просто JSON.parse всего текста (вдруг там чистый JSON)
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    throw new Error(`Не удалось извлечь валидный JSON из ответа. Текст: ${text.substring(0, 100)}...`);
  }
}

module.exports = { parseJsonFromResponse };
