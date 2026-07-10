'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { log } = require('../core/logger');
const { DOCS_FILES } = require('../core/config');
/**
 * Собирает сводку из Git-лога.
 */
function getGitLogSummary(rootDir) {
  try {
    const output = execSync('git log --oneline -n 30', { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const commits = output.split('\n').filter(Boolean);
    const features = commits.filter(line => /^[a-f0-9]+\s+feat(\(.*\))?:/i.test(line));
    const fixes = commits.filter(line => /^[a-f0-9]+\s+fix(\(.*\))?:/i.test(line));
    const docs = commits.filter(line => /^[a-f0-9]+\s+docs(\(.*\))?:/i.test(line));
    return { commits, features, fixes, docs };
  } catch (err) {
    log.debug(`Git не доступен или ошибка при чтении лога в "${rootDir}": ${err.message}`);
    return { commits: [], features: [], fixes: [], docs: [] };
  }
}

module.exports = { getGitLogSummary, collectBusinessContext };

/**
 * Собирает бизнес-контекст проекта (Git + документация).
 */
function collectBusinessContext(rootDir, scannedDocs = []) {
  const gitContext = getGitLogSummary(rootDir);
  const docs = {};

  if (scannedDocs && scannedDocs.length > 0) {
    scannedDocs.forEach(doc => {
      const lowerName = doc.name.toLowerCase();
      if (DOCS_FILES.has(lowerName) || lowerName.endsWith('.md')) {
        if (lowerName !== 'readme.md') {
          docs[doc.name] = doc.content;
        }
      }
    });
  } else {
    try {
      const files = fs.readdirSync(rootDir);
      files.forEach(file => {
        const lowerName = file.toLowerCase();
        if ((DOCS_FILES.has(lowerName) || lowerName.endsWith('.md')) && lowerName !== 'readme.md') {
          const fullPath = path.join(rootDir, file);
          if (fs.statSync(fullPath).isFile()) {
            docs[file] = fs.readFileSync(fullPath, 'utf8').slice(0, 5000);
          }
        }
      });
    } catch (err) {      log.debug(`Ошибка при ручном сборе документации: ${err.message}`);
    }
  }

  return {
    ...gitContext,
    docs
  };
}