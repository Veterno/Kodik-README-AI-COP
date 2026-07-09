'use strict';

const prompts = require('prompts');
const { runInteractive } = require('../../src/interfaces/cli/interactive');

jest.mock('prompts');

describe('Interactive Module', () => {
  const mockOptions = {
    nonInteractive: false,
    answers: {
      audience: 'developers',
      tone: 'technical',
      value: '',
      projectType: 'web',
      keyFeatures: '',
      license: 'MIT'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return initial answers if non-interactive', async () => {
    const options = { ...mockOptions, nonInteractive: true };
    const result = await runInteractive(options);
    expect(result).toEqual(options.answers);
    expect(prompts).not.toHaveBeenCalled();
  });

  test('should call prompts and return combined answers', async () => {
    const mockResponse = {
      audience: 'end-users',
      tone: 'marketing',
      value: 'Value',
      projectType: 'cli',
      keyFeatures: 'feat1, feat2',
      license: 'Apache 2.0'
    };
    prompts.mockResolvedValue(mockResponse);

    const result = await runInteractive(mockOptions);

    expect(prompts).toHaveBeenCalled();
    expect(result).toEqual({ ...mockOptions.answers, ...mockResponse });
  });

  test('should handle user interruption (onCancel)', async () => {
    prompts.mockImplementation((questions, options) => {
      if (options && options.onCancel) {
        options.onCancel();
      }
      return Promise.resolve({});
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const result = await runInteractive(mockOptions);

    expect(result).toEqual(mockOptions.answers);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Опрос прерван'));
    consoleSpy.mockRestore();
  });

  test('should use detected license if provided', async () => {
    const detectedLicense = 'GPL-3.0';
    prompts.mockResolvedValue({
      audience: 'developers',
      tone: 'technical',
      value: '',
      projectType: 'web',
      keyFeatures: ''
      // license omitted to test fallback
    });

    const result = await runInteractive(mockOptions, detectedLicense);
    expect(result.license).toBe(detectedLicense);
  });
});
