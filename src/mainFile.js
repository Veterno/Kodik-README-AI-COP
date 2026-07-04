'use strict';

/**
 * src/mainFile.js
 * Поиск главного файла исходного кода и чтение его первых строк.
 */

const fs = require('fs');
const path = require('path');
const { resolveSafePath } = require('./utils/pathUtils');
const {
  MAIN_FILE_CANDIDATES,
  MAX_MAIN_FILE_LINES,
} = require('./config');
const { log } = require('./logger');

function findMainFile(rootDir, manifest, flatFiles) {
  const candidates = [...MAIN_FILE_CANDIDATES];

  if (manifest && manifest.name === 'package.json') {
    try {
      const pkg = JSON.parse(
        manifest.content.replace(/\n\.\.\. \(файл обрезан\)$/, '')
      );
      if (pkg && typeof pkg.main === 'string') candidates.unshift(pkg.main);
      if (pkg && pkg.bin && typeof pkg.bin === 'object') {
        Object.values(pkg.bin).forEach((v) => {
          if (typeof v === 'string') candidates.unshift(v);
        });
      }
    } catch (err) {
      log.debug(`Ошибка при парсинге package.json в findMainFile: ${err.message}`);
    }  }

  for (const rel of candidates) {
    const normalizedRel = rel.replace(/\\/g, '/');
    // Используем flatFiles для проверки существования
    if (flatFiles && !flatFiles.has(normalizedRel)) continue;
    
    let fullPath;
    try {
      fullPath = resolveSafePath(rootDir, rel);
    } catch (err) {
      log.debug(`Пропуск кандидата из-за ошибки безопасности: ${err.message}`);
      continue;
    }

    // Если flatFiles нет (старый режим), используем fs.existsSync
    if (!flatFiles && !fs.existsSync(fullPath)) continue;

    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const lines = raw.split(/\r?\n/).slice(0, MAX_MAIN_FILE_LINES);
      return { name: normalizedRel, content: lines.join('\n') };
    } catch (err) {
      log.warn(`Не удалось прочитать "${rel}": ${err.message}`);
    }
  }

  return null;
}module.exports = { findMainFile };