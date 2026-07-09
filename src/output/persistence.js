'use strict';

/**
 * src/saveReadme.js
 * Сохранение сгенерированного Markdown в README.md с резервной копией
 * предыдущей версии и удалением случайных обёрток ```markdown ... ```.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('../core/logger');
const { maskSensitive } = require('../utils/sensitive');
const { resolveSafePath } = require('../utils/pathUtils');
function saveReadme(rootDir, markdown) {
  const target = resolveSafePath(rootDir, 'README.md');

  // 1. Создание бэкапа, если файл уже существует
  if (fs.existsSync(target)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = target.replace(/\.md$/, `.backup.${timestamp}.md`);
    try {
      fs.copyFileSync(target, backupPath);
      log.debug(`Создана резервная копия: ${backupPath}`);
    } catch (err) {
      log.warn(`Не удалось создать резервную копию: ${err.message}`);
    }
  }

  // 2. Убеждаемся, что директория существует
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 3. Финальная маскировка и очистка
  let clean = maskSensitive(markdown.trim());  if (clean.startsWith('```')) {
    clean = clean
      .replace(/^```(?:markdown|md)?\s*\n?/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  fs.writeFileSync(target, clean + '\n', 'utf8');
  return target;
}

module.exports = { saveReadme };