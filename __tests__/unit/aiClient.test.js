const axios = require('axios');
const { AiClient } = require('../../src/aiClient');

jest.mock('axios');

describe('AiClient', () => {
  let client;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new AiClient({ apiKey: 'test', model: 'gpt-4' });
    // Переопределяем таймауты и ретраи для ускорения тестов
    client.timeout = 100;
    client.maxRetries = 1;
  });

  test('успешный ответ chat()', async () => {
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: 'Hello' } }] }
    });

    const response = await client.chat([{ role: 'user', content: 'Hi' }]);
    expect(response).toBe('Hello');
  });

  test('должен делать повторные попытки при ошибке сети', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'Success' } }] } });

    // Мокаем setTimeout, чтобы не ждать реальное время
    jest.useFakeTimers();
    
    const chatPromise = client.chat([{ role: 'user', content: 'Hi' }]);
    
    // Ждем, пока сработает первая ошибка и запустится таймер
    await Promise.resolve(); 
    jest.runAllTimers();
    
    const response = await chatPromise;
    expect(response).toBe('Success');
    expect(axios.post).toHaveBeenCalledTimes(2);
    
    jest.useRealTimers();
  });

  test('fallback при ошибке 400 (неподдерживаемый response_format)', async () => {
    axios.post.mockRejectedValueOnce({
      response: { status: 400 },
      message: 'Bad Request'
    }).mockResolvedValueOnce({
      data: { choices: [{ message: { content: '{"ok": true}' } }] }
    });

    const response = await client.chat([], { json: true });
    expect(response).toBe('{"ok": true}');
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('должен корректно определять провайдера', () => {
    expect(client._detectProvider('http://localhost:11434')).toBe('local');
    expect(client._detectProvider('https://api.groq.com')).toBe('groq');
    expect(client._detectProvider('https://api.deepseek.com')).toBe('deepseek');
    expect(client._detectProvider('https://api.openai.com')).toBe('openai');
    expect(client._detectProvider('http://ollama:11434')).toBe('ollama');
  });

  test('должен маскировать API ключ', () => {
    expect(client._maskKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
    expect(client._maskKey('ollama')).toBe('ollama');
    expect(client._maskKey('')).toBe('');
  });

  test('должен извлекать контент из разных форматов ответа', () => {
    expect(client._extractContent({ data: { choices: [{ message: { content: 'Hello' } }] } })).toBe('Hello');
    expect(client._extractContent({ data: { choices: [{ text: 'Hi' }] } })).toBe('Hi');
    expect(client._extractContent({ data: { response: 'Local response' } })).toBe('Local response');
    expect(client._extractContent({ data: 'String response' })).toBe('String response');
    expect(client._extractContent({ data: { unknown: 123 } })).toBe('{"unknown":123}');
    expect(client._extractContent({})).toBe('');
  });

  test('должен повторять generateReadme при ошибке парсинга JSON', async () => {
    axios.post
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'Invalid JSON' } }] } })
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: '{"valid": true}' } }] } });

    const result = await client.generateReadme({ userPrompt: 'Give me JSON' }, { json: true });
    expect(result).toEqual({ valid: true });
    expect(axios.post).toHaveBeenCalledTimes(2);
  });

  test('должен выбрасывать ошибку, если generateReadme не удался после повтора', async () => {
    axios.post.mockResolvedValue({ data: { choices: [{ message: { content: 'Still Invalid' } }] } });

    await expect(client.generateReadme({ userPrompt: 'Give me JSON' }, { json: true }))
      .rejects.toThrow('JSON Parse Error');
  });
});