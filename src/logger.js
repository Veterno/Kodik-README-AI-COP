'use strict';

const fs = require('fs');
const path = require('path');

/**
 * src/logger.js
 * Продвинутый логгер с поддержкой записи в файл, уровней логирования и очистки ANSI.
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

let logStream = null;
let currentLogLevel = LOG_LEVELS.info;
let config = {
  file: process.env.LOG_FILE,
  level: process.env.LOG_LEVEL || 'info',
  append: process.env.LOG_APPEND !== 'false',
  timestamp: process.env.LOG_TIMESTAMP !== 'false',
  json: process.env.LOG_JSON === 'true'
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
 * Возвращает текущую временную метку.
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Инициализирует файловое логирование.
 */
function initLogger() {
  if (!config.file || logStream) return;

  try {
    const logPath = path.resolve(process.cwd(), config.file);
    const logDir = path.dirname(logPath);
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    currentLogLevel = LOG_LEVELS[config.level.toLowerCase()] ?? LOG_LEVELS.info;
    
    logStream = fs.createWriteStream(logPath, { 
      flags: config.append ? 'a' : 'w',
      encoding: 'utf8' 
    });

    logStream.on('error', (err) => {
      console.error(`\x1b[33m⚠\x1b[0m Ошибка записи в лог-файл: ${err.message}`);
      logStream = null;
    });
  } catch (err) {
    console.error(`\x1b[33m⚠\x1b[0m Не удалось инициализировать файловое логирование: ${err.message}`);
  }
}

/**
 * Записывает сообщение в файл, если это необходимо.
 */
function writeToFile(level, msg, err) {
  if (!logStream) return;
  
  const numericLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  // Ошибки пишем всегда, остальные согласно уровню
  if (numericLevel < currentLogLevel && level !== 'error') return;

  let cleanMsg = stripAnsi(msg);
  if (err && isDebug) {
    cleanMsg += `\n${err.stack || err}`;
  }
  
  if (config.json) {
    const entry = JSON.stringify({
      timestamp: config.timestamp ? getTimestamp() : undefined,
      level,
      message: cleanMsg
    });
    logStream.write(entry + '\n');
  } else {
    const ts = config.timestamp ? `[${getTimestamp()}] ` : '';
    logStream.write(`${ts}${level.toUpperCase().padEnd(5)}: ${cleanMsg}\n`);
  }
}

const log = {
  info: (msg) => {
    console.log(`\x1b[36mℹ\x1b[0m  ${msg}`);
    writeToFile('info', msg);
  },
  ok: (msg) => {
    console.log(`\x1b[32m✔\x1b[0m  ${msg}`);
    writeToFile('info', msg);
  },
  warn: (msg) => {
    console.warn(`\x1b[33m⚠\x1b[0m  ${msg}`);
    writeToFile('warn', msg);
  },
  error: (msg, err) => {
    console.error(`\x1b[31m✖\x1b[0m  ${msg}`);
    if (err && isDebug) {
      console.error(`\x1b[90m${err.stack || err}\x1b[0m`);
    }
    writeToFile('error', msg, err);
  },
  debug: (msg, data) => {
    if (isDebug) {
      console.log(`\x1b[90m[DEBUG] ${msg}\x1b[0m`, data || '');
    }
    const debugMsg = data ? `${msg} ${JSON.stringify(data)}` : msg;
    writeToFile('debug', debugMsg);
  },
  step: (msg) => {
    console.log(`\n\x1b[35m▸\x1b[0m  \x1b[1m${msg}\x1b[0m`);
    writeToFile('info', msg);
  },
};

/**
 * Корректно закрывает поток логирования.
 */
function closeLogger() {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

module.exports = { 
  log, 
  initLogger, 
  closeLogger 
};
