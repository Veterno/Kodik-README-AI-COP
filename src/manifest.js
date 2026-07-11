'use strict';

/**
 * src/manifest.js
 * Поиск и чтение файла-манифеста проекта (package.json, requirements.txt и т.д.).
 */

const fs = require('fs');
const path = require('path');
const { MANIFEST_FILES, MAX_MANIFEST_BYTES } = require('./core/config');
const { log } = require('./core/logger');
/**
 * Поиск первого подходящего манифеста в корневой директории.
 * @param {string} rootDir 
 * @returns {{name: string, content: string}|null}
 */
function findManifest(rootDir) {
  for (const file of MANIFEST_FILES) {
    if (!fs.existsSync(path.join(rootDir, file))) continue;

    try {
      const fullPath = path.join(rootDir, file);
      let content = fs.readFileSync(fullPath, 'utf8');

      if (content.length > MAX_MANIFEST_BYTES) {
        content = content.slice(0, MAX_MANIFEST_BYTES) + '\n... (файл обрезан)';
      }

      return { name: file, content };
    } catch (err) {
      log.warn(`Не удалось прочитать манифест "${file}": ${err.message}`);
    }
  }

  return null;
}


module.exports = { findManifest };