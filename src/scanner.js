'use strict';

const fs = require('fs');
const path = require('path');
const {
  IGNORED_DIRS,
  IGNORED_FILES,
  MAX_TREE_DEPTH,
  MAX_TREE_ENTRIES,
  MAX_FILES_PER_DIR,
  MANIFEST_FILES,
  LICENSE_FILES,
  MAX_MANIFEST_BYTES,
  MAX_MANIFEST_DEPTH,
  DOCS_FILES,
} = require('./config');const { log } = require('./logger');
const { isSensitive, maskSensitive } = require('./utils/sensitive');
const { resolveSafePath } = require('./utils/pathUtils');

/**
 * Выполняет единый проход по файловой системе для сбора всей необходимой информации:
 * дерева файлов, плоского списка, манифестов, лицензий и документации.
 */
function scanProject(rootDir, scannerOptions = {}) {
  const { 
    maxFilesPerDir = MAX_FILES_PER_DIR,
    docsFiles = new Set(Array.from(DOCS_FILES).map(f => f.toLowerCase()))
  } = scannerOptions;
  const absoluteRoot = path.resolve(rootDir);
  const treeLines = [path.basename(absoluteRoot) + '/'];
  const flatFiles = new Set();
  const manifests = [];
  const docs = [];
  let detectedLicense = null;
  
  const counter = { tree: 0, flat: 0 };

  function walk(dir, rel, depth, prefix) {
    if (depth > MAX_TREE_DEPTH) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      log.warn(`Не удалось прочитать папку "${dir}": ${err.message}`);
      return;
    }

    const filtered = entries
      .filter((e) => {
        if (e.isDirectory()) {
          return !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.git');
        }
        // Исключаем файлы из списка IGNORED_FILES и любые вариации .env
        if (IGNORED_FILES.has(e.name)) return false;
        if (e.name.startsWith('.env')) return false;
        if (e.name.endsWith('.env')) return false;

        return true;
      })
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    const count = filtered.length;
    const isBigDir = count > maxFilesPerDir;

    filtered.forEach((entry, idx) => {
      const name = entry.name;
      const relPath = rel ? path.join(rel, name).replace(/\\/g, '/') : name;
      
      let fullPath;
      try {
        fullPath = resolveSafePath(absoluteRoot, relPath);
      } catch (err) {
        log.debug(`Пропуск пути из-за ошибки безопасности: ${err.message}`);
        return;
      }

      const isLast = idx === filtered.length - 1;

      if (entry.isDirectory()) {
        if (counter.tree < MAX_TREE_ENTRIES) {
          counter.tree++;
          const connector = isLast ? '└── ' : '├── ';
          let treeName = name + '/';
          treeLines.push(prefix + connector + treeName);
        }

        if (!isBigDir || depth === 1) {
          const nextPrefix = prefix + (isLast ? '    ' : '│   ');
          walk(fullPath, relPath, depth + 1, nextPrefix);
        }
      } else {
        flatFiles.add(relPath);
        counter.flat++;

        if (counter.tree < MAX_TREE_ENTRIES) {
          counter.tree++;
          const connector = isLast ? '└── ' : '├── ';
          treeLines.push(prefix + connector + name);
        }

        if (MANIFEST_FILES.includes(name)) {
          const isRootPackageJson = name === 'package.json' && depth === 1;
          if (isRootPackageJson || depth <= MAX_MANIFEST_DEPTH) {
            try {
              let raw = fs.readFileSync(fullPath, 'utf8');
              raw = maskSensitive(raw);
              const content = raw.length > MAX_MANIFEST_BYTES
                ? raw.slice(0, MAX_MANIFEST_BYTES) + '\n... (файл обрезан)'
                : raw;
              manifests.push({ name, content, relPath });
              log.debug(`Найден манифест: ${relPath}`);
            } catch (err) {
              log.warn(`Не удалось прочитать манифест "${name}": ${err.message}`);
            }
          } else {
            log.debug(`Манифест пропущен из-за глубины (${depth} > ${MAX_MANIFEST_DEPTH}): ${relPath}`);
          }
        }
        if (!detectedLicense && LICENSE_FILES.includes(name.toUpperCase()) && depth === 1) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8').trim();
            if (content.match(/MIT License/i)) detectedLicense = 'MIT';
            else if (content.match(/Apache License/i)) detectedLicense = 'Apache 2.0';
            else if (content.match(/GNU General Public License/i)) detectedLicense = 'GPL';
            else if (content.match(/BSD [23]-Clause/i)) detectedLicense = 'BSD';
            else detectedLicense = 'Custom';
          } catch (err) {
            log.debug(`Не удалось прочитать лицензию "${name}": ${err.message}`);
          }
        }

        const lowerName = name.toLowerCase();
        if (docsFiles.has(lowerName) || (rel.split(path.sep).includes('docs') && lowerName.endsWith('.md'))) {
           try {
             let raw = fs.readFileSync(fullPath, 'utf8');
             raw = maskSensitive(raw);
             const lines = raw.split('\n')
               .filter(line => line.match(/^#{1,3}\s|^-\s|^\*\s/))
               .slice(0, 30);
             if (lines.length) {
               docs.push({ name: relPath, content: lines.join('\n') });
             }
           } catch (err) {
             log.debug(`Не удалось прочитать документ "${relPath}": ${err.message}`);
           }
        }
      }
    });
  }

  walk(rootDir, '', 1, '');

  if (counter.tree >= MAX_TREE_ENTRIES) {
    treeLines.push(`... (дерево обрезано, показано ${MAX_TREE_ENTRIES} записей)`);
  }

  return {
    tree: treeLines.join('\n'),
    flatFiles,
    manifests,
    detectedLicense,
    docs,
  };
}

module.exports = { scanProject };
