'use strict';

/**
 * src/tree.js
 * Построение текстового дерева файлов проекта.
 * Уважает IGNORED_DIRS / IGNORED_FILES, ограничено глубиной и числом записей.
 * Если в папке > MAX_FILES_PER_DIR элементов, выводится обобщённая строка.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { log } = require('./logger');

function buildFileTree(rootDir) {
  const lines = [path.basename(rootDir) + '/'];
  const counter = { value: 0 };

  function walk(dir, prefix, depth) {
    if (depth > config.MAX_TREE_DEPTH) return;
    if (counter.value >= config.MAX_TREE_ENTRIES) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      log.warn(`Не удалось прочитать папку "${dir}": ${err.message}`);
      return;
    }

    // Фильтруем игнорируемые
    const filtered = entries
      .filter((e) => {
        if (e.isDirectory()) {
          return !config.IGNORED_DIRS.has(e.name) && !e.name.startsWith('.git');
        }
        return !config.IGNORED_FILES.has(e.name);
      })
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    // Для каждой папки подсчитаем количество её непосредственных дочерних элементов (после фильтрации)
    const processed = filtered.map(entry => {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        let subEntries = [];
        try {
          subEntries = fs.readdirSync(fullPath, { withFileTypes: true })
            .filter(e => {
              if (e.isDirectory()) return !config.IGNORED_DIRS.has(e.name) && !e.name.startsWith('.git');
              return !config.IGNORED_FILES.has(e.name);
            });
        } catch { /* ignore */ }
        const count = subEntries.length;
        return { entry, count, isBig: count > config.MAX_FILES_PER_DIR };
      } else {
        return { entry, count: 0, isBig: false };
      }
    });

    // Выводим каждый элемент
    processed.forEach((item, idx) => {
      if (counter.value >= config.MAX_TREE_ENTRIES) return;
      counter.value += 1;

      const isLast = idx === processed.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      let name = item.entry.isDirectory() ? item.entry.name + '/' : item.entry.name;
      if (item.isBig) {
        name += ` (${item.count} элементов)`;
      }
      lines.push(prefix + connector + name);

      // Если это папка и она не "большая", заходим внутрь
      if (item.entry.isDirectory() && !item.isBig) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(path.join(dir, item.entry.name), nextPrefix, depth + 1);
      }
    });
  }

  walk(rootDir, '', 1);

  if (counter.value >= config.MAX_TREE_ENTRIES) {
    lines.push(`... (дерево обрезано, показано ${config.MAX_TREE_ENTRIES} записей)`);
  }

  return lines.join('\n');
}

function collectFlatFileList(rootDir) {
  const result = new Set();
  const counter = { value: 0 };

  function walk(dir, rel, depth) {
    if (depth > config.MAX_TREE_DEPTH) return;
    if (counter.value >= config.MAX_TREE_ENTRIES) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (counter.value >= config.MAX_TREE_ENTRIES) return;
      const name = entry.name;

      if (entry.isDirectory()) {
        if (config.IGNORED_DIRS.has(name) || name.startsWith('.git')) continue;
        walk(path.join(dir, name), rel ? rel + '/' + name : name, depth + 1);
      } else {
        if (config.IGNORED_FILES.has(name)) continue;
        counter.value += 1;
        result.add(rel ? rel + '/' + name : name);
      }
    }
  }

  walk(rootDir, '', 1);
  return result;
}
module.exports = { buildFileTree, collectFlatFileList };