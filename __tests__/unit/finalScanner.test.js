'use strict';

const { finalScan } = require('../../src/output/processors/finalScanner');
const { AiClient } = require('../../src/generator/ai/client');
const { log } = require('../../src/core/logger');

jest.mock('../../src/generator/ai/client');
jest.mock('../../src/core/logger');

describe('FinalScanner Module', () => {
  const mockOptions = {
    content: {
      language: 'ru',
      translateSections: ['Описание', 'Ключевые возможности'],
      noTranslate: false
    },
    ai: {
      enabled: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AiClient.prototype.chat = jest.fn();
  });

  test('should return original markdown if noTranslate is true', async () => {
    const options = { ...mockOptions, content: { ...mockOptions.content, noTranslate: true } };
    const markdown = '## Описание\n\nHello world';
    const result = await finalScan(markdown, options);
    expect(result).toBe(markdown);
  });

  test('should return original markdown if AI is disabled', async () => {
    const options = { ...mockOptions, ai: { enabled: false } };
    const markdown = '## Описание\n\nHello world';
    const result = await finalScan(markdown, options);
    expect(result).toBe(markdown);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('AI отключен'));
  });

  test('should translate section if language mismatch detected', async () => {
    const longDescription = 'This is a very long project description that should definitely be translated because it exceeds the minimum word count threshold established in the configuration settings for the translation module.';
    const markdown = `## Описание\n\n${longDescription}\n\n## Ключевые возможности\n\nFeature 1, Feature 2.`;
    const mockTranslated = 'Это очень длинное описание проекта, которое определенно должно быть переведено.';
    
    AiClient.prototype.chat.mockResolvedValue(mockTranslated);

    const result = await finalScan(markdown, mockOptions);

    expect(result).toContain(mockTranslated);
    expect(result).toContain('## Описание');
    expect(AiClient.prototype.chat).toHaveBeenCalled();
  });

  test('should handle AI errors gracefully', async () => {
    const longDescription = 'This is another very long project description that should trigger the translation process but will fail due to a mocked AI error for testing purposes.';
    const markdown = `## Описание\n\n${longDescription}`;
    AiClient.prototype.chat.mockRejectedValue(new Error('AI Error'));

    const result = await finalScan(markdown, mockOptions);

    expect(result).toBe(markdown);
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Не удалось перевести'));
  });

  test('should skip translation for short sections', async () => {
    const markdown = '## Описание\n\nShort text.';
    const result = await finalScan(markdown, mockOptions);
    
    expect(result).toBe(markdown);
    expect(AiClient.prototype.chat).not.toHaveBeenCalled();
  });

  test('should translate when target is en and content is cyrillic', async () => {
    const options = {
      ...mockOptions,
      content: { ...mockOptions.content, targetLanguage: 'en', translateSections: ['Description'] }
    };
    // Сделаем текст длиннее 20 слов
    const longCyrillic = 'Это длинный русский текст, который содержит более двадцати слов для того, чтобы пройти проверку на минимальную длину раздела в финальном сканере документации проекта.';
    const markdown = `## Description\n\n${longCyrillic}`;
    AiClient.prototype.chat.mockResolvedValue('This is Russian text translated to English.');

    const result = await finalScan(markdown, options);
    expect(result).toContain('This is Russian text translated to English.');
  });

  test('should translate for unknown target languages', async () => {
    const options = {
      ...mockOptions,
      content: { ...mockOptions.content, targetLanguage: 'fr', translateSections: ['Description'] }
    };
    // Сделаем текст длиннее 20 слов
    const longText = 'This is a long English text that contains more than twenty words to pass the minimum section length check in the final scanner of the project documentation.';
    const markdown = `## Description\n\n${longText}`;
    AiClient.prototype.chat.mockResolvedValue('Texte traduit en français.');

    const result = await finalScan(markdown, options);
    expect(result).toContain('Texte traduit en français.');
  });
  test('should skip translation if text is too short for language detection', async () => {
    const markdown = '## Описание\n\nShort';
    const result = await finalScan(markdown, mockOptions);
    expect(result).toBe(markdown);
  });
});
