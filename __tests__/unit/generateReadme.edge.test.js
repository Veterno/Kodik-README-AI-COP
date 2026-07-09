'use strict';

const { generateReadme } = require('../../src/generator/readmeGenerator');
const { AiClient } = require('../../src/generator/ai/client');

jest.mock('../../src/generator/ai/client');
jest.mock('../../src/core/logger');

describe('generateReadme.js Edge Cases', () => {
  const mockOptions = {
    ai: { enabled: true },
    content: { tone: 'technical', generationLanguage: 'ru' },
    answers: { license: 'MIT' }
  };

  const mockParams = {
    projectName: 'Test',
    tree: 'src/',
    flatFiles: new Set(['package.json']),
    manifest: { name: 'package.json', content: '{}' },
    options: mockOptions
  };

  it('should fallback to local generation if AI returns invalid JSON', async () => {
    // Mock AI client to return something that is not a valid README JSON
    AiClient.prototype.generateReadme.mockResolvedValue({ some: 'other data' });

    const result = await generateReadme(mockParams);

    // Should contain local template markers
    expect(result.markdown).toContain('# 🚀 Test');
    expect(result.markdown).toContain('## 🛠️ Стек технологий');
  });

  it('should fallback to local generation if AI client throws', async () => {
    AiClient.prototype.generateReadme.mockRejectedValue(new Error('AI Error'));

    const result = await generateReadme(mockParams);

    expect(result.markdown).toContain('# 🚀 Test');
  });
});
