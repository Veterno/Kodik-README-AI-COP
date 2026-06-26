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

// ─────────────────────────────────────────────────────────────────────────────
//  Шаг 3. Чтение главного файла исходного кода
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ищет главный файл проекта по списку кандидатов.
 * Если ни один не найден, пытается определить точку входа из package.json.
 * @param {string} rootDir
 * @param {{ name: string, content: string } | null} manifest
 * @returns {{ name: string, content: string } | null}
 */
function findMainFile(rootDir, manifest) {
  const candidates = [...MAIN_FILE_CANDIDATES];

  // Дополнительный кандидат — поле "main" из package.json.
  if (manifest && manifest.name === 'package.json') {
    try {
      const pkg = JSON.parse(manifest.content.replace(/\n\.\\. \. \(файл обрезан\)$/, ''));
      if (pkg && typeof pkg.main === 'string') candidates.unshift(pkg.main);
      if (pkg && pkg.bin && typeof pkg.bin === 'object') {
        Object.values(pkg.bin).forEach((v) => {
          if (typeof v === 'string') candidates.unshift(v);
        });
      }
    } catch {
      // некорректный JSON — игнорируем
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

// ─────────────────────────────────────────────────────────────────────────────
//  Шаг 4. Генерация README.md без AI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Генерирует README.md на основе шаблонов.
 * @param {{ projectName: string, tree: string, manifest: { name: string, content: string } | null, mainFile: { name: string, content: string } | null }} data
 * @returns {string}
 */
function generateReadme({ projectName, tree, manifest, mainFile }) {
  const parts = [];
  
  // Заголовок
  parts.push(`# 🚀 ${projectName}`);
  parts.push('');
  
  // Описание
  parts.push('## 📝 Описание');
  parts.push('');
  parts.push('Автоматически сгенерированный README.md на основе анализа структуры проекта.');
  parts.push('');
  
  // Ключевые возможности
  parts.push('## ✨ Ключевые возможности');
  parts.push('');
  parts.push('- 🔍 Сканирование дерева файлов');
  parts.push('- 📦 Автоопределение манифеста');
  parts.push('- 🧠 Поиск главного файла кода');
  parts.push('- 📊 Структура проекта');
  parts.push('');
  
  // Стек технологий
  parts.push('## 🛠️ Стек технологий');
  parts.push('');
  
  if (manifest && manifest.name === 'package.json') {
    try {
      const pkg = JSON.parse(manifest.content.replace(/\n\.\\. \. \(файл обрезан\)$/, ''));
      const dependencies = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
      const devDependencies = pkg.devDependencies ? Object.keys(pkg.devDependencies) : [];
      
      if (dependencies.length > 0) {
        parts.push('### Зависимости');
        parts.push('```');
        parts.push(dependencies.join(', '));
        parts.push('```');
        parts.push('');
      }
      
      if (devDependencies.length > 0) {
        parts.push('### Dev-зависимости');
        parts.push('```');
        parts.push(devDependencies.join(', '));
        parts.push('```');
        parts.push('');
      }
    } catch {
      parts.push('Пакет: не определен');
    }
  } else {
    parts.push('Пакет: не найден');
  }
  
  parts.push('');
  
  // Быстрый старт
  parts.push('## 📦 Быстрый старт');
  parts.push('');
  
  if (manifest && manifest.name === 'package.json') {
    try {
      const pkg = JSON.parse(manifest.content.replace(/\n\.\\. \. \(файл обрезан\)$/, ''));
      
      parts.push('### Требования');
      parts.push('');
      parts.push('- Node.js **v18** или новее');
      parts.push('- npm');
      parts.push('');
      
      parts.push('### Установка и запуск');
      parts.push('');
      parts.push('```bash');
      parts.push('# 1. Установка зависимостей');
      parts.push('npm install');
      parts.push('');
      
      if (pkg.scripts && pkg.scripts.start) {
        parts.push('# 2. Запуск');
        parts.push(`npm start`);
      } else {
        parts.push('# 2. Запуск (укажите ваш скрипт)');
        parts.push('npm run <script>');
      }
      parts.push('```');
    } catch {
      parts.push('Команды не определены');
    }
  } else {
    parts.push('Требования: не определены');
    parts.push('');
    parts.push('Установка: не определена');
  }
  
  parts.push('');
  
  // Структура проекта
  parts.push('## 📂 Структура проекта');
  parts.push('');
  parts.push('```');
  parts.push(tree);
  parts.push('```');
  parts.push('');
  
  // Главный файл
  if (mainFile) {
    parts.push('## 📄 Главный файл');
    parts.push('');
    parts.push(`**${mainFile.name}** (первые ${MAX_MAIN_FILE_LINES} строк):`);
    parts.push('');
    parts.push('```javascript');
    parts.push(mainFile.content);
    parts.push('```');
    parts.push('');
  }
  
  // Лицензия
  parts.push('## 📄 Лицензия');
  parts.push('');
  parts.push('MIT');
  parts.push('');
  
  return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
//  Шаг 5. Сохранение результата
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Сохраняет Markdown в README.md, делая бэкап существующего файла.
 * @param {string} rootDir
 * @param {string} markdown
 * @returns {string} абсолютный путь к созданному README.md
 */
function saveReadme(rootDir, markdown) {
  const target = path.join(rootDir, 'README.md');

  if (fs.existsSync(target)) {
    const backup = path.join(rootDir, `README.backup.${Date.now()}.md`);
    try {
      fs.copyFileSync(target, backup);
      log.info(`Существующий README.md сохранён как ${path.basename(backup)}`);
    } catch (err) {
      log.warn(`Не удалось создать резервную копию README.md: ${err.message}`);
    }
  }

  fs.writeFileSync(target, markdown + '\n', 'utf8');
  return target;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Главная функция
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n\x1b[1m\x1b[35m📝 README Generator\x1b[0m — автоматический генератор README.md\n');

  // Определяем целевую директорию: аргумент CLI > переменная окружения > cwd.
  const cliArg = process.argv[2];
  const targetDir = path.resolve(cliArg || process.env.TARGET_DIR || process.cwd());

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    log.error(`Указанная папка не существует или не является директорией: ${targetDir}`);
    process.exit(1);
  }

  log.info(`Целевая папка: ${targetDir}`);

  // 1. Дерево файлов
  log.step('Шаг 1/4. Сканирую структуру проекта…');
  const tree = buildFileTree(targetDir);
  log.ok('Структура файлов получена.');

  // 2. Манифест
  log.step('Шаг 2/4. Ищу файл манифеста…');
  const manifest = findManifest(targetDir);
  if (manifest) log.ok(`Найден манифест: ${manifest.name}`);
  else log.warn('Манифест не найден — продолжаю без него.');

  // 3. Главный файл
  log.step('Шаг 3/4. Ищу главный файл исходного кода…');
  const mainFile = findMainFile(targetDir, manifest);
  if (mainFile) log.ok(`Найден главный файл: ${mainFile.name}`);
  else log.warn('Главный файл не найден — продолжаю без него.');

  // 4. Генерация README.md
  log.step('Шаг 4/4. Генерирую README.md…');
  
  const markdown = generateReadme({
    projectName: path.basename(targetDir),
    tree,
    manifest,
    mainFile,
  });
  
  log.ok('README.md сгенерирован.');

  // 5. Сохранение
  log.step('Сохраняю README.md…');
  try {
    const outPath = saveReadme(targetDir, markdown);
    log.ok(`README.md успешно сохранён: ${outPath}`);
  } catch (err) {
    log.error(`Не удалось сохранить README.md: ${err.message}`);
    process.exit(1);
  }

  console.log('\n\x1b[32m\x1b[1m✓ Готово!\x1b[0m Файл README.md сгенерирован.\n');
}

// Глобальные обработчики, чтобы скрипт не «падал» молча.
process.on('unhandledRejection', (reason) => {
  log.error(`Необработанное отклонение Promise: ${reason instanceof Error ? reason.message : reason}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  log.error(`Непредвиденная ошибка: ${err.message}`);
  process.exit(1);
});

main();
