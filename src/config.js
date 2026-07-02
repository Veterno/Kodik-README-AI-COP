'use strict';

/**
 * src/config.js
 * Все статические константы утилиты: списки игнорируемых папок, имена
 * манифестов, кандидаты на «главный файл», лимиты дерева.
 */

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.cache',
  'coverage', '.nyc_output', '.idea', '.vscode', '__pycache__',
  '.venv', 'venv', 'env', 'target', 'vendor', 'bin', 'obj',
]);

const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db']);

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
  'mix.exs',
];

const MAIN_FILE_CANDIDATES = [
  'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
  'src/app.ts', 'src/app.js',
  'index.ts', 'index.js', 'main.ts', 'main.js', 'app.ts', 'app.js', 'server.js',
  'src/main.py', 'main.py', 'app.py', '__main__.py', 'manage.py',
  'src/main.go', 'main.go', 'cmd/main.go',
  'src/main.rs', 'main.rs',
  'Program.cs',
  'src/main/java/Main.java',
  'index.php', 'public/index.php',
];

const MAX_MAIN_FILE_LINES = 200;
const MAX_TREE_DEPTH = 2;           // уменьшено с 4
const MAX_TREE_ENTRIES = 50;        // уменьшено с 400
const MAX_MANIFEST_BYTES = 8000;

// Новая константа: если в папке больше этого числа элементов (файлов + подпапок),
// то не перечисляем их по отдельности, а показываем обобщённую строку с количеством.
const MAX_FILES_PER_DIR = 5;

module.exports = {
  IGNORED_DIRS,
  IGNORED_FILES,
  MANIFEST_FILES,
  MAIN_FILE_CANDIDATES,
  MAX_MAIN_FILE_LINES,
  MAX_TREE_DEPTH,
  MAX_TREE_ENTRIES,
  MAX_MANIFEST_BYTES,
  MAX_FILES_PER_DIR,
};