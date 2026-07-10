'use strict';

const winston = require('winston');

// Мокаем winston
jest.mock('winston', () => {
  const mLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
  };
  return {
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      printf: jest.fn(),
      colorize: jest.fn(),
    },
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
      DailyRotateFile: jest.fn(),
    },
    createLogger: jest.fn(() => mLogger),
  };
});

jest.mock('winston-daily-rotate-file', () => jest.fn());

describe('Logger Module', () => {
  let logModule;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      logModule = require('../../src/core/logger');
    });
  });

  test('log.info should call winston.info', () => {
    logModule.log.info('test info');
    const logger = winston.createLogger();
    expect(logger.info).toHaveBeenCalledWith('test info');
  });

  test('log.warn should call winston.warn', () => {
    logModule.log.warn('test warn');
    const logger = winston.createLogger();
    expect(logger.warn).toHaveBeenCalledWith('test warn');
  });

  test('log.error should call winston.error with stack', () => {
    const error = new Error('test error');
    logModule.log.error('failed', error);
    const logger = winston.createLogger();
    expect(logger.error).toHaveBeenCalledWith('failed', expect.objectContaining({ stack: error.stack }));
  });

  test('log.debug should call winston.debug', () => {
    logModule.log.debug('debug message');
    const logger = winston.createLogger();
    expect(logger.debug).toHaveBeenCalledWith('debug message');
  });

  test('log.ok should call winston.log with ok level', () => {
    logModule.log.ok('all good');
    const logger = winston.createLogger();
    expect(logger.log).toHaveBeenCalledWith('ok', 'all good');
  });

  test('log.step should call winston.log with step level', () => {
    logModule.log.step('next step');
    const logger = winston.createLogger();
    expect(logger.log).toHaveBeenCalledWith('step', expect.stringContaining('next step'));
  });
});
