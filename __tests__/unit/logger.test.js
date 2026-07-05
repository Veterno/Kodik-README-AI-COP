'use strict';

const fs = require('fs');

jest.mock('fs');

describe('Logger Module', () => {
  let consoleLogSpy, consoleWarnSpy, consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('log.info should call console.log', () => {
    const { log } = require('../../src/logger');
    log.info('test info');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test info'));
  });

  test('initLogger should create directory if it does not exist', () => {
    jest.isolateModules(() => {
      process.env.LOG_FILE = 'logs/test.log';
      const { initLogger } = require('../../src/logger');
      fs.existsSync.mockReturnValue(false);
      fs.createWriteStream.mockReturnValue({ on: jest.fn(), write: jest.fn(), end: jest.fn() });

      initLogger();

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });
  });

  test('writeToFile should write to stream if initialized', () => {
    jest.isolateModules(() => {
      process.env.LOG_FILE = 'logs/test.log';
      const { log, initLogger, closeLogger } = require('../../src/logger');
      const mockStream = { on: jest.fn(), write: jest.fn(), end: jest.fn() };
      fs.createWriteStream.mockReturnValue(mockStream);
      fs.existsSync.mockReturnValue(true);

      initLogger();
      log.info('test file write');

      expect(mockStream.write).toHaveBeenCalledWith(expect.stringContaining('test file write'));
      
      closeLogger();
      expect(mockStream.end).toHaveBeenCalled();
    });
  });

  test('log.debug should call console.log if DEBUG is true', () => {
    jest.isolateModules(() => {
      process.env.DEBUG = 'true';
      const { log } = require('../../src/logger');
      log.debug('debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] debug message'), '');
    });
  });

  test('log.error should handle error object', () => {
    const { log } = require('../../src/logger');
    const error = new Error('test error');
    log.error('failed', error);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('failed'));
  });
});

