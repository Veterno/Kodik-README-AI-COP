'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');

// Мокаем yargs ДО загрузки чего-либо еще
jest.mock('yargs', () => {
  const mYargs = {
    usage: jest.fn().mockReturnThis(),
    positional: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    example: jest.fn().mockReturnThis(),
    help: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    wrap: jest.fn().mockReturnThis(),
    argv: {}
  };
  return () => mYargs;
});

jest.mock('yargs/helpers', () => ({
  hideBin: (args) => args
}));

const { log, initLogger, closeLogger } = require('../../src/logger');
const scanner = require('../../src/scanner');
const interactive = require('../../src/interactive');
const contextCollector = require('../../src/contextCollector');
const codeContext = require('../../src/codeContext');
const generateReadme = require('../../src/generateReadme');
const saveReadme = require('../../src/saveReadme');
const finalScanner = require('../../src/finalScanner');
const validator = require('../../src/validator');
const options = require('../../src/options');

// Мокаем остальные зависимости
jest.mock('fs');
jest.mock('../../src/logger');
jest.mock('../../src/scanner');
jest.mock('../../src/interactive');
jest.mock('../../src/contextCollector');
jest.mock('../../src/codeContext');
jest.mock('../../src/generateReadme');
jest.mock('../../src/saveReadme');
jest.mock('../../src/finalScanner');
jest.mock('../../src/validator');
jest.mock('../../src/options');

// Чтобы не выходить из процесса во время тестов
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`Process.exit(${code})`);
});

// Импортируем main после моков
const { main } = require('../../src/index');

describe('index.js (Integration)', () => {
  const mockArgs = {
    target: '.', 
    ai: true,
    content: { noTranslate: false, targetLanguage: 'ru' },
    dryRun: false,
    validate: true,
    output: '.', 
    answers: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
    options.resolveOptions.mockReturnValue(mockArgs);
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ isDirectory: () => true });
    
    scanner.scanProject.mockReturnValue({
      tree: 'tree',
      flatFiles: new Set(),
      manifests: [{ name: 'package.json', content: '{"name": "test"}' }],
      detectedLicense: 'MIT',
      docs: {}
    });

    interactive.runInteractive.mockResolvedValue({ license: 'MIT' });
    contextCollector.collectBusinessContext.mockReturnValue({});
    codeContext.collectCodeContext.mockReturnValue('code');
    generateReadme.generateReadme.mockResolvedValue({
      markdown: '# Test',
      stack: { language: 'js' }
    });
    saveReadme.saveReadme.mockReturnValue('README.md');
    finalScanner.finalScan.mockResolvedValue('# Translated Test');
    validator.validateReadme.mockResolvedValue({
      scores: { accuracy: 10, clarity: 10, completeness: 10, hallucinations: 10 },
      feedback: 'Good'
    });
  });

  it('should run the full flow successfully', async () => {
    await main(mockArgs);
    
    expect(initLogger).toHaveBeenCalled();
    expect(scanner.scanProject).toHaveBeenCalled();
    expect(generateReadme.generateReadme).toHaveBeenCalled();
    expect(saveReadme.saveReadme).toHaveBeenCalled();
    expect(closeLogger).toHaveBeenCalled();
  });

  it('should handle dry-run mode', async () => {
    const dryRunArgs = { ...mockArgs, dryRun: true };
    options.resolveOptions.mockReturnValue(dryRunArgs);
    
    await main(dryRunArgs);
    
    expect(saveReadme.saveReadme).not.toHaveBeenCalled();
  });

  it('should exit with 1 on error in generateReadme', async () => {
    generateReadme.generateReadme.mockRejectedValue(new Error('AI Fail'));
    
    await expect(main(mockArgs)).rejects.toThrow('Process.exit(1)');
  });

  it('should handle SIGINT', () => {
    const listeners = process.listeners('SIGINT');
    expect(listeners.length).toBeGreaterThan(0);
  });
});

