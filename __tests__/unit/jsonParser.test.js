const { parseJsonFromResponse } = require('../../src/utils/jsonParser');

describe('jsonParser: parseJsonFromResponse', () => {
  test('должен парсить чистый JSON объект', () => {
    const input = '{"title": "Test"}';
    expect(parseJsonFromResponse(input)).toEqual({ title: 'Test' });
  });

  test('должен извлекать JSON из markdown блока ```json', () => {
    const input = 'Вот ваш ответ:\n```json\n{"status": "ok"}\n```\nНадеюсь, это поможет.';
    expect(parseJsonFromResponse(input)).toEqual({ status: 'ok' });
  });

  test('должен находить JSON по балансу скобок, если нет markdown блоков', () => {
    const input = 'Текст до {"key": "value"} текст после';
    expect(parseJsonFromResponse(input)).toEqual({ key: 'value' });
  });

  test('должен парсить массивы JSON', () => {
    const input = 'Список: [{"id": 1}, {"id": 2}]';
    expect(parseJsonFromResponse(input)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test('должен выбрасывать ошибку на пустую строку или не строку', () => {
    expect(() => parseJsonFromResponse('')).toThrow('Пустой ответ');
    expect(() => parseJsonFromResponse(null)).toThrow();
  });

  test('должен выбрасывать ошибку на некорректный JSON', () => {
    const input = '{"bad": json}';
    expect(() => parseJsonFromResponse(input)).toThrow('Не удалось извлечь валидный JSON');
  });
});
