'use strict';
const fs = require('fs');
const path = require('path');
const { MAIN_FILE_CANDIDATES, MAX_MAIN_FILE_LINES } = require('./config');
const { log } = require('./logger');

function findMainFile(rootDir, manifest) {
  const candidates = [...MAIN_FILE_CANDIDATES];
  if (manifest && manifest.name === 'package.json') {
    try {
      const pkg = JSON.parse(manifest.content.replace(/\n\.\.\. \(файл обрезан\)$/, ''));
      if (pkg && typeof pkg.main === 'string') candidates.unshift(pkg.main);
      if (pkg && pkg.bin && typeof pkg.bin === 'object') {
        Object.values(pkg.bin).forEach((v) => {
          if (typeof v === 'string') candidates.unshift(v);
        });
      }
    } catch {
      // ignore
    }
  }
  for (const rel of candidates) {
    const fullPath = path.join(rootDir, rel);
    if (!fs.existsSync(fullPath)) continue;
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;
      const raw = fs.readFileSync(fullPath, 'utf8');
      const lines = raw.split(/\r?\n/).slice(0, MAX_MAIN_FILE_LINES);
      return { name: rel.replace(/\\/g, '/'), content: lines.join('\n') };
    } catch (err) {
      log.warn(`Не удалось прочитать "${rel}": ${err.message}`);
    }
  }
  return null;
}

module.exports = { findMainFile };