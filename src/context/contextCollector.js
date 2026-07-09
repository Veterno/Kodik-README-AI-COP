'use strict';

const { execSync } = require('child_process');
const { log } = require('../core/logger');

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

module.exports = { getGitLogSummary };