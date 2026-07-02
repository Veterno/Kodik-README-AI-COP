'use strict';

/**
 * src/contextCollector.js
 * Сбор бизнес-контекста из Git-лога, файлов документации и верхнеуровневых описаний.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitLogSummary(rootDir) {
  try {
    const output = execSync('git log --oneline -n 30', { cwd: rootDir, encoding: 'utf8' });
    const commits = output.split('\n').filter(Boolean);
    // Выделяем коммиты с типами (conventional commits)
    const features = commits.filter(line => /^feat(\(.*\))?:/.test(line));
    const fixes = commits.filter(line => /^fix(\(.*\))?:/.test(line));
    const docs = commits.filter(line => /^docs(\(.*\))?:/.test(line));
    return { commits, features, fixes, docs };
  } catch {
    return { commits: [], features: [], fixes: [], docs: [] };
  }
}

function readDocFiles(rootDir) {
  // Расширенный список файлов документации
  const files = [
    'PRODUCT.md', 'ROADMAP.md', 'README.md',
    'USER_STORIES.md', 'FEATURES.md', 'CHANGELOG.md'
  ];
  const content = {};
  for (const file of files) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        // Извлекаем только заголовки и списки (первые 50 строк)
        const lines = raw.split('\n')
          .filter(line => line.match(/^#{1,3}\s|^-\s|^\*\s/))
          .slice(0, 50);
        if (lines.length) {
          content[file] = lines.join('\n');
        }
      } catch {
        // игнорируем ошибки чтения
      }
    }
  }

  // Дополнительно проверяем папку docs/
  const docsDir = path.join(rootDir, 'docs');
  if (fs.existsSync(docsDir)) {
    try {
      const docsFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).slice(0, 5);
      for (const f of docsFiles) {
        const fullPath = path.join(docsDir, f);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const lines = raw.split('\n')
          .filter(line => line.match(/^#{1,3}\s|^-\s|^\*\s/))
          .slice(0, 30);
        if (lines.length) {
          content[`docs/${f}`] = lines.join('\n');
        }
      }
    } catch {
      // ignore
    }
  }

  return content;
}

function collectBusinessContext(rootDir) {
  const git = getGitLogSummary(rootDir);
  const docs = readDocFiles(rootDir);
  return { ...git, docs };
}

module.exports = { collectBusinessContext };