'use strict';

const { validateReadme } = require('../../src/validator');
const { AiClient } = require('../../src/aiClient');
const { log } = require('../../src/logger');

jest.mock('../../src/aiClient');
jest.mock('../../src/logger');

describe('validator.js', () => {
  const mockOptions = {
    ai: {
      enabled: true,
      apiKey: 'test-key',
      model: 'test-model',
      apiUrl: 'https://api.test.com'
    },
    content: {}
  };
  const mockContext = 'Project context';
  const mockMarkdown = '# Test Project\n\nThis is a test project.';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return validation scores from AI', async () => {
    const mockResponse = {
      scores: {
        accuracy: 9,
        clarity: 10,
        completeness: 8,
        hallucinations: 10
      },
      feedback: 'Excellent documentation.'
    };

    AiClient.prototype.generateReadme.mockResolvedValue(mockResponse);

    const result = await validateReadme(mockMarkdown, mockContext, mockOptions);

    expect(result.scores).toEqual(mockResponse.scores);
    expect(result.feedback).toBe(mockResponse.feedback);    expect(AiClient).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'test-key',
      temperature: 0.2
    }));
  });

  it('should return zero scores and feedback on AI error', async () => {
    const errorMessage = 'AI Service Unavailable';
    AiClient.prototype.generateReadme.mockRejectedValue(new Error(errorMessage));

    const result = await validateReadme(mockMarkdown, mockContext, mockOptions);

    expect(result.scores).toEqual({
      accuracy: 0,
      clarity: 0,
      completeness: 0,
      hallucinations: 0
    });
    expect(result.feedback).toContain(errorMessage);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
  });
});
