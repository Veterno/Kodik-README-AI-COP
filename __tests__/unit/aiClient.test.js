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
});
