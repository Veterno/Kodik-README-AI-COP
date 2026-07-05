const { maskSensitive } = require('../../src/utils/sensitive');

describe('sensitive: maskSensitive', () => {
  test('должен маскировать api_key в строках', () => {
    const text = 'api_key = "sk-12345abcde"';
    // Проверяем, что значение замаскировано. 
    // В реализации sensitive.js для ключей типа key/token используется замена на [REDACTED]
    expect(maskSensitive(text)).toContain('[REDACTED]');
    expect(maskSensitive(text)).not.toContain('sk-12345abcde');
  });

  test('должен рекурсивно маскировать объекты', () => {
    const data = {
      config: {
        password: '123',
        user: 'admin'
      },
      tags: ['public', 'api_key: xyz']
    };
    const masked = maskSensitive(data);
    expect(masked.config.password).toBe('[REDACTED]');
    expect(masked.tags[1]).toContain('[REDACTED]');
    expect(masked.config.user).toBe('admin');
  });

  test('должен маскировать JWT токены', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(maskSensitive(`Token: ${jwt}`)).toContain('[REDACTED]');
  });
});
