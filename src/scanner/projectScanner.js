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
  CODE_PATHS,
} = require('../core/config');const { log } = require('../core/logger');const { isSensitive, maskSensitive } = require('../utils/sensitive');
const { resolveSafePath } = require('../utils/pathUtils');

/**
 * Выполняет единый проход по файловой системе для сбора всей необходимой информации:
 * дерева файлов, плоского списка, манифестов, лицензий и документации.
 */
function scanProject(rootDir, scannerOptions = {}) {
  const { 
    maxFilesPerDir = MAX_FILES_PER_DIR,
    docsFiles = new Set(Array.from(DOCS_FILES).map(f => f.toLowerCase())),
    codePaths = Array.from(CODE_PATHS || []),
    collectCode = true
  } = scannerOptions;

  // Расширения файлов с кодом
  const CODE_EXTS = new Set(['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.cs', '.swift', '.kt', '.scala', '.c', '.cpp', '.h', '.hpp']);
  const MAX_CODE_FILES = parseInt(process.env.CODE_CONTEXT_MAX_FILES || '100', 10);
  const MAX_LINES_PER_FILE = parseInt(process.env.CODE_CONTEXT_MAX_LINES || '400', 10);

  const absoluteRoot = path.resolve(rootDir);
  const treeLines = [path.basename(absoluteRoot) + '/'];
  const flatFiles = new Set();
  const manifests = [];
  const docs = [];
  let codeContext = '';
  let codeFilesCount = 0;
  let detectedLicense = null;
  
  const counter = { tree: 0, flat: 0 };
  const dirCache = new Map();

  function readDirCached(dirPath) {
    if (dirCache.has(dirPath)) return dirCache.get(dirPath);
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    dirCache.set(dirPath, entries);
    return entries;
  }

  function walk(dir, rel, depth, prefix) {
    if (depth > MAX_TREE_DEPTH) return;

    let entries;
    try {
      entries = readDirCached(dir);
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
          
          // Подсчет элементов в папке для информативного отображения
          let subCount = 0;
          try {
            const subEntries = readDirCached(fullPath);
            subCount = subEntries.filter(e => {
              return !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.git') && !IGNORED_FILES.has(e.name);
            }).length;
          } catch (e) { /* ignore */ }

          let treeName = name + '/';
          if (subCount > maxFilesPerDir) {
            treeName += ` (${subCount} элементов)`;
          }
          treeLines.push(prefix + connector + treeName);
        }

        if (!isBigDir || depth === 1) {
          const nextPrefix = prefix + (isLast ? '    ' : '│   ');
          walk(fullPath, relPath, depth + 1, nextPrefix);
        }
      } else {        flatFiles.add(relPath);
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
            log.warn(`Не удалось прочитать файл лицензии "${name}": ${err.message}`);
          }
        }
        const lowerName = name.toLowerCase();
        const ext = path.extname(name).toLowerCase();

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
             log.warn(`Не удалось прочитать файл документации "${relPath}": ${err.message}`);
           }
        }

        // Сбор контекста кода (только для файлов в разрешенных папках)
        if (collectCode && codeFilesCount < MAX_CODE_FILES && CODE_EXTS.has(ext)) {
          const parts = relPath.split('/');
          if (parts.length >= 2 && codePaths.includes(parts[0])) {
            try {
              const raw = fs.readFileSync(fullPath, 'utf8');
              const masked = maskSensitive(raw);
              const lines = masked.split(/\r?\n/).slice(0, MAX_LINES_PER_FILE);
              
              let filtered = [];
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.length > 300) continue;
                const isComment = /^\s*\/\//.test(line) || /^\s*#/.test(line) || /^\s*\/\*/.test(line) || /^\s*\*/.test(line);
                const isDeclaration = /^\s*(export\s+)?(function|class|interface|type|enum|const|let|var|def|pub\s+fn|public\s+class|public\s+function|public\s+static|async\s+function|private\s+|protected\s+)/i.test(line);
                if (isComment || isDeclaration) filtered.push(trimmed);
              }

              if (filtered.length > 0) {
                codeContext += `\n--- Файл: ${relPath} ---\n${filtered.join('\n')}\n`;
                codeFilesCount++;
              }
            } catch (err) {
              log.debug(`Не удалось прочитать код из "${relPath}": ${err.message}`);
            }
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
    codeContext,
  };
}
module.exports = { scanProject };
