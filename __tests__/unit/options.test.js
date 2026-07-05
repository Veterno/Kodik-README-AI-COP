'use strict';

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { resolveOptions } = require('../../src/options');
const { DEFAULT_ANSWERS } = require('../../src/config');

jest.mock('fs');
jest.mock('js-yaml');

describe('options.js', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('resolveOptions', () => {
    it('should return default options when no arguments are provided', () => {
      const argv = { _: [], target: undefined };
      const options = resolveOptions(argv);

      expect(options.target).toBe(process.cwd());
      expect(options.ai.enabled).toBe(true);
      expect(options.content.tone).toBe(DEFAULT_ANSWERS.tone);
    });

    it('should prioritize CLI arguments over defaults', () => {
      const argv = {
        _: ['/custom/path'],
        tone: 'professional',
        ai: false
      };
      const options = resolveOptions(argv);

      expect(options.target).toBe(path.resolve('/custom/path'));
      expect(options.content.tone).toBe('professional');
      expect(options.ai.enabled).toBe(false);
    });

    it('should prioritize environment variables over defaults', () => {
      process.env.TARGET_DIR = '/env/path';
      process.env.USE_AI = 'false';
      process.env.GENERATION_LANGUAGE = 'en';

      const argv = { _: [] };
      const options = resolveOptions(argv);

      expect(options.target).toBe(path.resolve('/env/path'));
      expect(options.ai.enabled).toBe(false);
      expect(options.content.generationLanguage).toBe('en');
    });

    it('should load and merge settings from a JSON config file', () => {
      const configPath = 'config.json';
      const configContent = JSON.stringify({
        projectName: 'Test Project',
        ai: { model: 'gpt-4' },
        content: { tone: 'funny' }
      });

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(configContent);
      
      const realPathResolve = path.resolve;
      path.resolve = jest.fn((...args) => args[args.length - 1]);

      const argv = { _: [], config: configPath };
      const options = resolveOptions(argv);

      expect(options.projectName).toBe('Test Project');
      expect(options.ai.model).toBe('gpt-4');
      expect(options.content.tone).toBe('funny');

      path.resolve = realPathResolve;
    });

    it('should load and merge settings from a YAML config file', () => {
      const configPath = 'config.yaml';
      const configData = {
        projectName: 'YAML Project',
        ai: { enabled: false }
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('content');
      yaml.load.mockReturnValue(configData);
      
      // We need to restore path.resolve for this test or mock it carefully
      const realPathResolve = path.resolve;
      path.resolve = jest.fn((...args) => args[args.length - 1]);

      const argv = { _: [], config: configPath };
      const options = resolveOptions(argv);

      expect(options.projectName).toBe('YAML Project');
      expect(options.ai.enabled).toBe(false);
      
      path.resolve = realPathResolve;
    });

    it('should handle missing config file gracefully', () => {
      fs.existsSync.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const argv = { _: [], config: 'missing.json' };
      const options = resolveOptions(argv);

      expect(consoleSpy).toHaveBeenCalled();
      expect(options.projectName).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });
});
