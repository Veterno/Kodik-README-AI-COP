'use strict';

/**
 * src/saveReadme.js
 * Сохранение сгенерированного Markdown в README.md с резервной копией
 * предыдущей версии и удалением случайных обёрток ```markdown ... ```.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./logger');
const { maskSensitive } = require('./utils/sensitive');
const { resolveSafePath } = require('./utils/pathUtils');

function saveReadme(rootDir, markdown) {
  const target = resolveSafePath(rootDir, 'README.md');
  // Финальная маскировка перед сохранением
  let clean = maskSensitive(markdown.trim());
  if (clean.startsWith('```')) {
    clean = clean
      .replace(/^```(?:markdown|md)?\s*\n?/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  fs.writeFileSync(target, clean + '\n', 'utf8');
  return target;
}

module.exports = { saveReadme };