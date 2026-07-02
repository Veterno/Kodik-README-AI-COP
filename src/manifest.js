'use strict';

/**
 * src/manifest.js
 * Поиск и чтение файла-манифеста проекта (package.json, requirements.txt и т.д.).
 */

const fs = require('fs');
const path = require('path');
const { MANIFEST_FILES, MAX_MANIFEST_BYTES } = require('./config');
const { log } = require('./logger');

function findManifest(rootDir) {
  for (const file of MANIFEST_FILES) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const content = raw.length > MAX_MANIFEST_BYTES
        ? raw.slice(0, MAX_MANIFEST_BYTES) + '\n... (файл обрезан)'
        : raw;
      return { name: file, content };
    } catch (err) {
      log.warn(`Не удалось прочитать манифест "${file}": ${err.message}`);
    }
  }
  return null;
}

module.exports = { findManifest };