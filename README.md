# 🚀 Kodik-README-AI — копия

## 📝 Описание

Автоматически сгенерированный README.md на основе анализа структуры проекта.

## ✨ Ключевые возможности

- 🔍 Сканирование дерева файлов
- 📦 Автоопределение манифеста
- 🧠 Поиск главного файла кода
- 📊 Структура проекта

## 🛠️ Стек технологий

### Зависимости
```
dotenv
```

### Dev-зависимости
```
jest
```


## 📦 Быстрый старт

### Требования

- Node.js **v18** или новее
- npm

### Установка и запуск

```bash
# 1. Установка зависимостей
npm install

# 2. Запуск
npm start
```

## 📂 Структура проекта

```
Kodik-README-AI — копия/
├── src/
│   └── index.js
├── .env.example
├── .gitignore
├── package-lock.json
└── package.json
```

## 📄 Главный файл

**src/index.js** (первые 200 строк):

```javascript
#!/usr/bin/env node
/**
 * README Generator — консольная утилита для автоматической генерации README.md.
 *
 * Алгоритм работы:
 *   1. Сканирует указанную папку (по умолчанию — текущую) и строит дерево файлов.
 *   2. Ищет манифест проекта (package.json, requirements.txt, pyproject.toml,
 *      Cargo.toml, go.mod, composer.json, pom.xml, build.gradle) и читает его.
 *   3. Находит главный файл исходного кода (index.js, app.js, main.py и т.д.)
 *      и считывает первые ~200 строк для понимания логики.
 *   4. Генерирует README.md на основе шаблонов без использования AI.
 *   5. Сохраняет полученный Markdown в README.md в корне целевой папки.
 *
 * Запуск: `node src/index.js` или `npm start`.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');

// ─────────────────────────────────────────────────────────────────────────────
//  Конфигурация
// ─────────────────────────────────────────────────────────────────────────────

/** Папки, которые всегда исключаются из сканирования. */
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  'coverage',
  '.nyc_output',
  '.idea',
  '.vscode',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  'target',
  'vendor',
]);

/** Файлы, которые игнорируются при построении дерева. */
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

/** Возможные имена манифестов в порядке приоритета. */
const MANIFEST_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Pipfile',
  'Cargo.toml',
  'go.mod',
  'composer.json',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'pubspec.yaml',
];

/** Возможные имена главных файлов исходного кода в порядке приоритета. */
const MAIN_FILE_CANDIDATES = [
  'src/index.ts',
  'src/index.js',
  'src/main.ts',
  'src/main.js',
  'src/app.ts',
  'src/app.js',
  'index.ts',
  'index.js',
  'main.ts',
  'main.js',
  'app.ts',
  'app.js',
  'server.js',
  'src/main.py',
  'main.py',
  'app.py',
  '__main__.py',
  'src/main.go',
  'main.go',
  'src/main.rs',
  'main.rs',
  'cmd/main.go',
];

/** Максимальное число строк, читаемых из главного файла. */
const MAX_MAIN_FILE_LINES = 200;

/** Максимальная глубина дерева, которую отображаем (чтобы не раздувать промт). */
const MAX_TREE_DEPTH = 4;

/** Максимальное число записей в дереве (страховка от огромных репозиториев). */
const MAX_TREE_ENTRIES = 400;

// ─────────────────────────────────────────────────────────────────────────────
//  Утилиты логирования
// ─────────────────────────────────────────────────────────────────────────────

const log = {
  info: (msg) => console.log(`\x1b[36mℹ\x1b[0m  ${msg}`),
  ok: (msg) => console.log(`\x1b[32m✔\x1b[0m  ${msg}`),
  warn: (msg) => console.warn(`\x1b[33m⚠\x1b[0m  ${msg}`),
  error: (msg) => console.error(`\x1b[31m✖\x1b[0m  ${msg}`),
  step: (msg) => console.log(`\n\x1b[35m▸\x1b[0m  \x1b[1m${msg}\x1b[0m`),
};

// ─────────────────────────────────────────────────────────────────────────────
//  Шаг 1. Построение дерева файлов
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Рекурсивно обходит директорию и возвращает текстовое дерево.
 * @param {string} rootDir - Абсолютный путь к корню проекта.
 * @returns {string} - Дерево в текстовом виде.
 */
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
        if (e.isDirectory()) return !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.git');
        return !IGNORED_FILES.has(e.name);
      })
      .sort((a, b) => {
        // Сначала папки, потом файлы; в каждой группе — по алфавиту.
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

// ─────────────────────────────────────────────────────────────────────────────
//  Шаг 2. Чтение манифеста проекта
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ищет файл манифеста и возвращает его содержимое.
 * @param {string} rootDir
 * @returns {{ name: string, content: string } | null}
 */
function findManifest(rootDir) {
  for (const file of MANIFEST_FILES) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      // Обрезаем слишком большие манифесты до 8 КБ, чтобы не раздувать промт.
      const content = raw.length > 8000 ? raw.slice(0, 8000) + '\n... (файл обрезан)' : raw;
      return { name: file, content };
    } catch (err) {
      log.warn(`Не удалось прочитать манифест "${file}": ${err.message}`);
    }
  }
  return null;
}

```

## 📄 Лицензия

MIT

