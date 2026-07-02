'use strict';

/**
 * src/saveReadme.js
 * Сохранение сгенерированного Markdown в README.md с резервной копией
 * предыдущей версии и удалением случайных обёрток ```markdown ... ```.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

function saveReadme(rootDir, markdown) {
  const target = path.join(rootDir, 'README.md');

  if (fs.existsSync(target)) {
    const backup = path.join(rootDir, `README.backup.${Date.now()}.md`);
    try {
      fs.copyFileSync(target, backup);
      log.info(`Существующий README.md сохранён как ${path.basename(backup)}`);
    } catch (err) {
      log.warn(`Не удалось создать резервную копию README.md: ${err.message}`);
    }
  }

  let clean = markdown.trim();
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