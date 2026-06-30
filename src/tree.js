'use strict';
const fs = require('fs');
const path = require('path');
const {
  IGNORED_DIRS,
  IGNORED_FILES,
  MAX_TREE_DEPTH,
  MAX_TREE_ENTRIES,
} = require('./config');
const { log } = require('./logger');

function buildFileTree(rootDir) {
  const lines = [path.basename(rootDir) + '/'];
  const counter = { value: 0 };

  function walk(dir, prefix, depth) {
    if (depth > MAX_TREE_DEPTH) return;
    if (counter.value >= MAX_TREE_ENTRIES) return;

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
        return !IGNORED_FILES.has(e.name);
      })
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    filtered.forEach((entry, idx) => {
      if (counter.value >= MAX_TREE_ENTRIES) return;
      counter.value += 1;

      const isLast = idx === filtered.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const name = entry.isDirectory() ? entry.name + '/' : entry.name;
      lines.push(prefix + connector + name);

      if (entry.isDirectory()) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(path.join(dir, entry.name), nextPrefix, depth + 1);
      }
    });
  }

  walk(rootDir, '', 1);

  if (counter.value >= MAX_TREE_ENTRIES) {
    lines.push(`... (дерево обрезано, показано ${MAX_TREE_ENTRIES} записей)`);
  }

  return lines.join('\n');
}

function collectFlatFileList(rootDir) {
  const result = new Set();
  const counter = { value: 0 };

  function walk(dir, rel, depth) {
    if (depth > MAX_TREE_DEPTH) return;
    if (counter.value >= MAX_TREE_ENTRIES) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (counter.value >= MAX_TREE_ENTRIES) return;
      const name = entry.name;

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(name) || name.startsWith('.git')) continue;
        walk(path.join(dir, name), rel ? rel + '/' + name : name, depth + 1);
      } else {
        if (IGNORED_FILES.has(name)) continue;
        counter.value += 1;
        result.add(rel ? rel + '/' + name : name);
      }
    }
  }

  walk(rootDir, '', 1);
  return result;
}

module.exports = { buildFileTree, collectFlatFileList };