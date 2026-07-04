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

const IGNORED_FILES = new Set([
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.development',
  '.env.test',
  '.env.production',
  '.env.example', // Мы его почистим, но лучше исключить из сканирования кода
]);

const SENSITIVE_PATTERNS = [
  // Базовые ключевые слова
  /api[_-]?key/i,
  /auth[_-]?token/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /session[_-]?id/i,

  // Облачные провайдеры и сервисы
  /AKIA[0-9A-Z]{16}/, // AWS Access Key
  /ghp_[0-9a-zA-Z]{36}/, // GitHub PAT
  /gho_[0-9a-zA-Z]{36}/, // GitHub OAuth
  /eyJ[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+/, // JWT
  /xox[baprs]-([0-9a-zA-Z]{10,12})-([0-9a-zA-Z]{10,12})-([0-9a-zA-Z]{24})/, // Slack
  /sk_live_[0-9a-zA-Z]{24}/, // Stripe
  /sq0csp-[0-9a-zA-Z-_]{43}/, // Square

  // Строки подключения и переменные
  /(mongodb(?:\+srv)?|postgres|mysql|redis):\/\/[^:]+:[^@]+@/, // URL с паролем
  /(?:export\s+)?(?:[A-Z_]+)='?[a-zA-Z0-9!@#$%^&*()_+=-]{20,}'?/, // Env vars с длинными значениями
  /AIza[0-9A-Za-z-_]{35}/, // Google API Key
];

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

const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'COPYING',
  'UNLICENSE',
];

const MAIN_FILE_CANDIDATES = [  'src/index.ts', 'src/index.js', 'src/main.ts', 'src/main.js',
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
const MAX_TREE_DEPTH = 4;           
const MAX_TREE_ENTRIES = 400;        
const MAX_MANIFEST_BYTES = 8000;

// Новая константа: если в папке больше этого числа элементов (файлов + подпапок),
// то не перечисляем их по отдельности, а показываем обобщённую строку с количеством.
const MAX_FILES_PER_DIR = 5;

module.exports = {
  IGNORED_DIRS,
  IGNORED_FILES,
  MANIFEST_FILES,
  LICENSE_FILES,
  MAIN_FILE_CANDIDATES,  MAX_MAIN_FILE_LINES,
  MAX_TREE_DEPTH,
  MAX_TREE_ENTRIES,
  MAX_MANIFEST_BYTES,
  MAX_FILES_PER_DIR,
  DOCS_FILES: new Set(['readme.md', 'contributing.md', 'changelog.md', 'code_of_conduct.md', 'security.md', 'features.md', 'product.md', 'roadmap.md', 'user_stories.md']),
  SENSITIVE_PATTERNS,
  AI_CONFIG: {
    RETRY_ATTEMPTS: parseInt(process.env.AI_RETRY_ATTEMPTS || '3', 10),
    TIMEOUT: parseInt(process.env.AI_TIMEOUT || '60000', 10),
    USE_RESPONSE_FORMAT: process.env.AI_USE_RESPONSE_FORMAT !== 'false',
    DEFAULT_TEMPERATURE: 0.7,
    JSON_TEMPERATURE: 0.2,
  },
  DEFAULT_ANSWERS: {
    audience: 'developers',
    tone: 'technical',
    value: '',
    projectType: 'web',
    keyFeatures: '',
    license: 'MIT',
  },
  TRANSLATION_CONFIG: {
    ENABLED: process.env.FINAL_SCAN_ENABLED !== 'false' && process.env.ENABLE_TRANSLATION !== 'false',
    TARGET_LANGUAGE: process.env.TARGET_LANGUAGE || 'ru',
    SECTIONS: (process.env.TRANSLATE_SECTIONS || 'Описание,Ключевые возможности').split(',').map(s => s.trim()),
    SKIP_IF_SHORT: parseInt(process.env.SKIP_TRANSLATION_IF_SHORT || '20', 10), // в словах
  }
};
