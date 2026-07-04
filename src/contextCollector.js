'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolveSafePath } = require('./utils/pathUtils');

const { log } = require('./logger');
function getGitLogSummary(rootDir) {
  try {
    const gitDir = path.join(rootDir, '.git');
    if (!fs.existsSync(gitDir)) {
      return { commits: [], features: [], fixes: [], docs: [] };
    }
    const output = execSync('git log --oneline -n 30', { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const commits = output.split('\n').filter(Boolean);
    const features = commits.filter(line => /^[a-f0-9]+\s+feat(\(.*\))?:/i.test(line));
    const fixes = commits.filter(line => /^[a-f0-9]+\s+fix(\(.*\))?:/i.test(line));
    const docs = commits.filter(line => /^[a-f0-9]+\s+docs(\(.*\))?:/i.test(line));    return { commits, features, fixes, docs };
  } catch (err) {
    log.debug(`Git не доступен или ошибка при чтении лога в "${rootDir}": ${err.message}`);
    return { commits: [], features: [], fixes: [], docs: [] };
  }
}
function readDocFiles(rootDir, scannedDocs) {
  if (scannedDocs) {
    const content = {};
    scannedDocs.forEach(doc => {
      // Исключаем readme.md из бизнес-контекста, чтобы не зацикливаться
      if (doc.name.toLowerCase() !== 'readme.md') {
        content[doc.name] = doc.content;
      }
    });
    return content;
  }

  // Fallback для старого поведения (если scannedDocs не передан)
  const files = ['PRODUCT.md', 'ROADMAP.md', 'USER_STORIES.md', 'FEATURES.md', 'CHANGELOG.md'];
  const content = {};
  for (const file of files) {
    try {
      const fullPath = resolveSafePath(rootDir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const lines = raw.split('\n')
            .filter(line => line.match(/^#{1,3}\s|^-\s|^\*\s/))
            .slice(0, 50);
          if (lines.length) content[file] = lines.join('\n');
        } catch (err) {
          log.debug(`Не удалось прочитать документ "${file}" в contextCollector: ${err.message}`);
        }    }
    } catch (err) {
      log.debug(`Пропуск документа из-за ошибки безопасности: ${err.message}`);
    }
  }  return content;
}

function collectBusinessContext(rootDir, scannedDocs) {
  const git = getGitLogSummary(rootDir);
  const docs = readDocFiles(rootDir, scannedDocs);
  return { ...git, docs };
}
module.exports = { collectBusinessContext };