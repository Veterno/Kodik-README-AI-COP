'use strict';

/**
 * src/logger.js
 * Минималистичный цветной логгер для CLI. Используется во всех модулях.
 */

const log = {
  info:  (msg) => console.log(`\x1b[36mℹ\x1b[0m  ${msg}`),
  ok:    (msg) => console.log(`\x1b[32m✔\x1b[0m  ${msg}`),
  warn:  (msg) => console.warn(`\x1b[33m⚠\x1b[0m  ${msg}`),
  error: (msg) => console.error(`\x1b[31m✖\x1b[0m  ${msg}`),
  step:  (msg) => console.log(`\n\x1b[35m▸\x1b[0m  \x1b[1m${msg}\x1b[0m`),
};

module.exports = { log };