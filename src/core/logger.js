'use strict';

const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

/**
 * src/logger.js
 * Продвинутый логгер на базе winston с ротацией файлов и сохранением обратной совместимости.
 */

let winstonLogger = null;

const config = {
  file: process.env.LOG_FILE || 'logs/app.log',
  level: process.env.LOG_LEVEL || 'info',
  json: process.env.LOG_JSON === 'true',
  maxFiles: '7d',
  maxSize: '10m'
};

const isDebug = process.env.DEBUG === 'true' || config.level === 'debug';

/**
 * Удаляет ANSI-коды (цвета) из строки.
 */
function stripAnsi(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Инициализирует логгер winston.
 */
function initLogger() {
  if (winstonLogger) return;

  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        // Убираем winston.format.colorize() – управляем цветами вручную через иконки
        winston.format.printf(({ level, message }) => {
          const icons = {
            info: '\x1b[36mℹ\x1b[0m',
            ok: '\x1b[32m✔\x1b[0m',
            warn: '\x1b[33m⚠\x1b[0m',
            error: '\x1b[31m✖\x1b[0m',
            debug: '\x1b[90m[DEBUG]\x1b[0m',
            step: '\x1b[35m▸\x1b[0m'
          };
          const icon = icons[level] || icons.info;
          return `${icon}  ${message}`;
        })
      )
    })
  ];

  if (config.file) {
    const fileTransport = new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), config.file.replace('.log', '-%DATE%.log')),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: config.maxSize,
      maxFiles: config.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          const cleanMsg = stripAnsi(message);
          const logMessage = stack ? `${cleanMsg}\n${stack}` : cleanMsg;
          if (config.json) {
            return JSON.stringify({ timestamp, level, message: cleanMsg, stack });
          }
          return `[${timestamp}] ${level.toUpperCase().padEnd(5)}: ${logMessage}`;
        })
      )
    });
    transports.push(fileTransport);
  }

  winstonLogger = winston.createLogger({
    level: config.level,
    levels: {
      error: 0,
      warn: 1,
      ok: 2,
      info: 3,
      step: 4,
      debug: 5
    },
    transports
  });
}

const log = {
  info: (msg) => {
    if (!winstonLogger) initLogger();
    winstonLogger.info(msg);
  },
  ok: (msg) => {
    if (!winstonLogger) initLogger();
    winstonLogger.log('ok', msg);
  },
  warn: (msg) => {
    if (!winstonLogger) initLogger();
    winstonLogger.warn(msg);
  },
  error: (msg, err) => {
    if (!winstonLogger) initLogger();
    winstonLogger.error(msg, { stack: err?.stack });
    if (err && isDebug && !err.stack) {
       console.error(`\x1b[90m${err}\x1b[0m`);
    }
  },
  debug: (msg, data) => {
    if (!winstonLogger) initLogger();
    const debugMsg = data ? `${msg} ${JSON.stringify(data)}` : msg;
    winstonLogger.debug(debugMsg);
  },
  step: (msg) => {
    if (!winstonLogger) initLogger();
    winstonLogger.log('step', `\x1b[1m${msg}\x1b[0m`);
  },
};

function closeLogger() {
  // Winston автоматически закрывает транспорты, но мы можем явно обнулить ссылку
  winstonLogger = null;
}

module.exports = { 
  log, 
  initLogger, 
  closeLogger 
};