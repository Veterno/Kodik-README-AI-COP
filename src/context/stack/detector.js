'use strict';

/**
 * src/context/stack/detector.js
 * Единый сервис для анализа стека проекта и объединения результатов.
 */

const { log } = require('../../core/logger');

function safeJsonParse(text, context = 'unknown') {
  try {
    return JSON.parse(text.replace(/\n\.\.\. \(файл обрезан\)$/, ''));
  } catch (err) {
    log.debug(`Ошибка парсинга JSON (${context}): ${err.message}`);
    return null;
  }
}

function includesAny(haystack, needles) {
  const lower = (haystack || '').toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

function hasFileWithExt(files, exts) {
  for (const f of files) {
    const lower = f.toLowerCase();
    if (exts.some((ext) => lower.endsWith(ext))) return true;
  }
  return false;
}

// ─── Детекторы по манифестам ────────────────────────────────────────────────

function detectFromPackageJson(content) {
  const pkg = safeJsonParse(content, 'package.json') || {};
  const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
  const depNames = Object.keys(deps);
  const isTs = depNames.includes('typescript') || depNames.includes('ts-node');

  let framework = null;
  const fwMap = [
    ['next',           'Next.js'],
    ['nuxt',           'Nuxt'],
    ['react',          'React'],
    ['vue',            'Vue'],
    ['@angular/core',  'Angular'],
    ['svelte',         'Svelte'],
    ['express',        'Express'],
    ['koa',            'Koa'],
    ['fastify',        'Fastify'],
    ['@nestjs/core',   'NestJS'],
    ['hapi',           'Hapi'],
  ];
  for (const [key, name] of fwMap) {
    if (depNames.includes(key)) { framework = name; break; }
  }

  const packageManager = 'npm'; // По умолчанию

  const installCommands = ['npm install'];
  const runCommands = [];
  if (pkg.scripts && typeof pkg.scripts === 'object') {
    if (pkg.scripts.start) runCommands.push('npm start');
    else if (pkg.scripts.dev) runCommands.push('npm run dev');
    else if (pkg.scripts.serve) runCommands.push('npm run serve');
  }
  if (runCommands.length === 0) {
    const entry = (typeof pkg.main === 'string' && pkg.main) || 'index.js';
    runCommands.push(`node ${entry}`);
  }

  const extras = [];
  if (isTs) extras.push('TypeScript');
  if (depNames.includes('eslint')) extras.push('ESLint');
  if (depNames.includes('jest') || depNames.includes('vitest') || depNames.includes('mocha')) {
    extras.push('Testing');
  }

  return {
    language: isTs ? 'Node.js (TypeScript)' : 'Node.js (JavaScript)',
    framework,
    packageManager,
    requirements: ['Node.js v18 или новее'],
    installCommands,
    runCommands,
    extras,
  };
}

function detectFromRequirementsTxt(content) {
  const lower = content.toLowerCase();
  let framework = null;
  if (lower.includes('django')) framework = 'Django';
  else if (lower.includes('flask')) framework = 'Flask';
  else if (lower.includes('fastapi')) framework = 'FastAPI';
  else if (lower.includes('aiohttp')) framework = 'aiohttp';
  else if (lower.includes('tornado')) framework = 'Tornado';

  return {
    language: 'Python',
    framework,
    packageManager: 'pip',
    requirements: ['Python 3.10+', 'pip'],
    installCommands: [
      'python -m venv .venv',
      'source .venv/bin/activate',
      'pip install -r requirements.txt',
    ],
    runCommands: framework === 'Django'
      ? ['python manage.py runserver']
      : ['python main.py'],
    extras: [],
  };
}

function detectFromPyprojectToml(content) {
  const lower = content.toLowerCase();
  const isPoetry = lower.includes('[tool.poetry]');
  let framework = null;
  if (lower.includes('django')) framework = 'Django';
  else if (lower.includes('flask')) framework = 'Flask';
  else if (lower.includes('fastapi')) framework = 'FastAPI';

  return {
    language: 'Python',
    framework,
    packageManager: isPoetry ? 'poetry' : 'pip',
    requirements: ['Python 3.10+', isPoetry ? 'Poetry' : 'pip'],
    installCommands: isPoetry ? ['poetry install'] : ['pip install .'],
    runCommands: isPoetry
      ? ['poetry run python main.py']
      : (framework === 'Django' ? ['python manage.py runserver'] : ['python main.py']),
    extras: [],
  };
}

function detectFromCargoToml(content) {
  const hasBin = /\[\[bin\]\]/.test(content);
  return {
    language: 'Rust',
    framework: includesAny(content, ['actix-web', 'rocket', 'axum', 'warp'])
      ? (content.match(/actix-web|rocket|axum|warp/i) || [null])[0]
      : null,
    packageManager: 'cargo',
    requirements: ['Rust toolchain (rustup, cargo)'],
    installCommands: ['cargo build'],
    runCommands: hasBin ? ['cargo run'] : ['cargo run'],
    extras: [],
  };
}

function detectFromGoMod(content) {
  return {
    language: 'Go',
    framework: includesAny(content, ['gin-gonic/gin', 'labstack/echo', 'gofiber/fiber'])
      ? (content.match(/gin|echo|fiber/i) || [null])[0]
      : null,
    packageManager: 'go mod',
    requirements: ['Go 1.21+'],
    installCommands: ['go mod download'],
    runCommands: ['go run .'],
    extras: [],
  };
}

function detectFromComposerJson(content) {
  const pkg = safeJsonParse(content, 'composer.json') || {};
  const deps = Object.assign({}, pkg.require, pkg['require-dev']);
  const depNames = Object.keys(deps);
  let framework = null;
  if (depNames.some((d) => d.startsWith('laravel/'))) framework = 'Laravel';
  else if (depNames.some((d) => d.startsWith('symfony/'))) framework = 'Symfony';

  return {
    language: 'PHP',
    framework,
    packageManager: 'composer',
    requirements: ['PHP 8.1+', 'Composer'],
    installCommands: ['composer install'],
    runCommands: framework === 'Laravel'
      ? ['php artisan serve']
      : ['php -S localhost:8000'],
    extras: [],
  };
}

function detectFromPomXml(content) {
  const framework = includesAny(content, ['spring-boot']) ? 'Spring Boot' : null;
  return {
    language: 'Java',
    framework,
    packageManager: 'maven',
    requirements: ['JDK 17+', 'Maven'],
    installCommands: ['mvn clean install'],
    runCommands: framework === 'Spring Boot' ? ['mvn spring-boot:run'] : ['mvn exec:java'],
    extras: [],
  };
}

function detectFromGradle(content) {
  const isKmp = content.includes('kotlin("multiplatform")') || content.includes('multiplatform {');
  const framework = includesAny(content, ['spring-boot']) ? 'Spring Boot' : (isKmp ? 'Kotlin Multiplatform' : null);
  
  const extras = [];
  if (content.includes('android')) extras.push('Android');
  if (content.includes('ios')) extras.push('iOS');
  if (content.includes('jvm')) extras.push('JVM');
  if (content.includes('js')) extras.push('JS');

  return {
    language: isKmp ? 'Kotlin Multiplatform' : 'Java/Kotlin',
    framework,
    packageManager: 'gradle',
    requirements: ['JDK 17+', 'Gradle (или используйте gradlew)'],
    installCommands: ['./gradlew build'],
    runCommands: framework === 'Spring Boot' ? ['./gradlew bootRun'] : ['./gradlew run'],
    extras,
  };
}

function detectFromMixExs(content) {
  const framework = content.includes(':phoenix') ? 'Phoenix' : null;
  return {
    language: 'Elixir',
    framework,
    packageManager: 'mix',
    requirements: ['Elixir 1.14+', 'Erlang/OTP 25+'],
    installCommands: ['mix deps.get'],
    runCommands: framework === 'Phoenix' ? ['mix phx.server'] : ['iex -S mix'],
    extras: [],
  };
}

function detectFromPackageSwift(content) {
  const framework = content.includes('vapor') ? 'Vapor' : null;
  return {
    language: 'Swift',
    framework,
    packageManager: 'swift',
    requirements: ['Swift 5.9+'],
    installCommands: ['swift build'],
    runCommands: ['swift run'],
    extras: [],
  };
}

function detectFromSettingsPy(content) {
  const projectNameMatch = content.match(/ROOT_URLCONF\s*=\s*['"](.+)\.urls['"]/);
  const projectName = projectNameMatch ? projectNameMatch[1] : 'Django Project';

  const installedApps = [];
  const appsMatch = content.match(/INSTALLED_APPS\s*=\s*\[([\s\S]+?)\]/);
  if (appsMatch) {
    const appsStr = appsMatch[1];
    const appLines = appsStr.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
    installedApps.push(...appLines);
  }

  const databases = [];
  if (content.includes('django.db.backends.postgresql')) databases.push('PostgreSQL');
  if (content.includes('django.db.backends.mysql')) databases.push('MySQL');
  if (content.includes('django.db.backends.sqlite3')) databases.push('SQLite');

  return {
    language: 'Python',
    framework: 'Django',
    packageManager: 'pip',
    requirements: ['Python 3.10+', 'pip', 'Django'],
    installCommands: ['pip install -r requirements.txt'],
    runCommands: ['python manage.py runserver'],
    extras: [
      `Project: ${projectName}`,
      databases.length ? `DB: ${databases.join(', ')}` : null,
    ].filter(Boolean),
  };
}

function detectFromGemfile() {
  return {
    language: 'Ruby',
    framework: null,
    packageManager: 'bundler',
    requirements: ['Ruby 3.0+', 'Bundler'],
    installCommands: ['bundle install'],
    runCommands: ['ruby main.rb'],
    extras: [],
  };
}

function detectFromPubspec() {
  return {
    language: 'Dart/Flutter',
    framework: 'Flutter',
    packageManager: 'pub',
    requirements: ['Flutter SDK'],
    installCommands: ['flutter pub get'],
    runCommands: ['flutter run'],
    extras: [],
  };
}

// ─── Эвристика по расширениям файлов ──────────────────────────────────────

function detectFromExtensions(files) {
  if (hasFileWithExt(files, ['.ts', '.tsx'])) {
    return { language: 'TypeScript', framework: null, packageManager: null,
             requirements: ['Node.js v18+ или другой совместимый рантайм'],
             installCommands: [], runCommands: [], extras: [] };
  }
  if (hasFileWithExt(files, ['.js', '.jsx', '.mjs', '.cjs'])) {
    return { language: 'JavaScript', framework: null, packageManager: null,
             requirements: ['Node.js v18+'],
             installCommands: [], runCommands: [], extras: [] };
  }
  if (hasFileWithExt(files, ['.py'])) {
    return { language: 'Python', framework: null, packageManager: 'pip',
             requirements: ['Python 3.10+'],
             installCommands: [], runCommands: ['python main.py'], extras: [] };
  }
  if (hasFileWithExt(files, ['.go'])) {
    return { language: 'Go', framework: null, packageManager: 'go mod',
             requirements: ['Go 1.21+'],
             installCommands: [], runCommands: ['go run .'], extras: [] };
  }
  if (hasFileWithExt(files, ['.rs'])) {
    return { language: 'Rust', framework: null, packageManager: 'cargo',
             requirements: ['Rust toolchain'],
             installCommands: [], runCommands: ['cargo run'], extras: [] };
  }
  if (hasFileWithExt(files, ['.java'])) {
    return { language: 'Java', framework: null, packageManager: null,
             requirements: ['JDK 17+'],
             installCommands: [], runCommands: [], extras: [] };
  }
  if (hasFileWithExt(files, ['.cs'])) {
    return { language: 'C#', framework: '.NET', packageManager: 'dotnet',
             requirements: ['.NET SDK 8+'],
             installCommands: ['dotnet restore'], runCommands: ['dotnet run'], extras: [] };
  }
  if (hasFileWithExt(files, ['.php'])) {
    return { language: 'PHP', framework: null, packageManager: 'composer',
             requirements: ['PHP 8.1+'],
             installCommands: [], runCommands: ['php -S localhost:8000'], extras: [] };
  }
  if (hasFileWithExt(files, ['.rb'])) {
    return { language: 'Ruby', framework: null, packageManager: 'bundler',
             requirements: ['Ruby 3.0+'],
             installCommands: [], runCommands: ['ruby main.rb'], extras: [] };
  }
  if (hasFileWithExt(files, ['.swift'])) {
    return { language: 'Swift', framework: null, packageManager: 'swift',
             requirements: ['Swift toolchain'],
             installCommands: ['swift build'], runCommands: ['swift run'], extras: [] };
  }
  return null;
}

// ─── Главный диспетчер ─────────────────────────────────────────────────────

/**
 * Анализирует стек проекта на основе одного манифеста и списка файлов.
 */
function detectStack(manifest, flatFiles) {
  let stack = null;

  if (manifest) {
    switch (manifest.name) {
      case 'package.json':      stack = detectFromPackageJson(manifest.content); break;
      case 'requirements.txt':  stack = detectFromRequirementsTxt(manifest.content); break;
      case 'pyproject.toml':    stack = detectFromPyprojectToml(manifest.content); break;
      case 'Pipfile':           stack = detectFromRequirementsTxt(manifest.content); break;
      case 'Cargo.toml':        stack = detectFromCargoToml(manifest.content); break;
      case 'go.mod':            stack = detectFromGoMod(manifest.content); break;
      case 'composer.json':     stack = detectFromComposerJson(manifest.content); break;
      case 'pom.xml':           stack = detectFromPomXml(manifest.content); break;
      case 'build.gradle':
      case 'build.gradle.kts':  stack = detectFromGradle(manifest.content); break;
      case 'Gemfile':           stack = detectFromGemfile(); break;
      case 'pubspec.yaml':      stack = detectFromPubspec(); break;
      case 'mix.exs':          stack = detectFromMixExs(manifest.content); break;
      case 'Package.swift':     stack = detectFromPackageSwift(manifest.content); break;
      case 'settings.py':       stack = detectFromSettingsPy(manifest.content); break;
      default: stack = null;
    }
  }

  if (!stack) {
    stack = detectFromExtensions(flatFiles) || {
      language: null,
      framework: null,
      packageManager: null,
      requirements: [],
      installCommands: [],
      runCommands: [],
      extras: [],
    };
  }

  // Уточнение менеджера пакетов Node по lock-файлам
  if (stack.language && stack.language.startsWith('Node.js')) {
    if (flatFiles.has('pnpm-lock.yaml')) {
      stack.packageManager = 'pnpm';
      stack.installCommands = ['pnpm install'];
      stack.requirements.push('pnpm');
      stack.runCommands = stack.runCommands.map((c) =>
        c.startsWith('npm ') ? c.replace(/^npm/, 'pnpm') : c
      );
    } else if (flatFiles.has('yarn.lock')) {
      stack.packageManager = 'yarn';
      stack.installCommands = ['yarn install'];
      stack.requirements.push('yarn');
      stack.runCommands = stack.runCommands.map((c) =>
        c.startsWith('npm ') ? c.replace(/^npm/, 'yarn') : c
      );
    } else if (flatFiles.has('bun.lockb')) {
      stack.packageManager = 'bun';
      stack.installCommands = ['bun install'];
      stack.requirements.push('bun');
      stack.runCommands = stack.runCommands.map((c) =>
        c.startsWith('npm ') ? c.replace(/^npm/, 'bun') : c
      );
    } else {
      // Если lock-файлов нет, используем npm по умолчанию
      stack.packageManager = 'npm';
      stack.requirements.push('npm (входит в состав Node.js)');
    }
  }
  // Docker-поддержка
  const dockerSupported = flatFiles.has('Dockerfile') || flatFiles.has('docker-compose.yml') || flatFiles.has('docker-compose.yaml');
  const dockerCommands = [];
  if (dockerSupported) {
    if (flatFiles.has('Dockerfile')) {
      dockerCommands.push('docker build -t my-app .');
      dockerCommands.push('docker run --rm -it my-app');
    }
    if (flatFiles.has('docker-compose.yml') || flatFiles.has('docker-compose.yaml')) {
      dockerCommands.push('docker compose up --build');
    }
  }

  return Object.assign({ dockerSupported, dockerCommands }, stack);
}

/**
 * Объединяет данные о стеке из нескольких манифестов.
 */
function mergeStacks(stacks) {
  if (!stacks || stacks.length === 0) return null;

  const result = {
    language: [],
    framework: [],
    packageManager: [],
    requirements: [],
    installCommands: [],
    runCommands: [],
    extras: [],
    dockerSupported: false,
    dockerCommands: [],
  };

  stacks.forEach(s => {
    if (s.language && !result.language.includes(s.language)) result.language.push(s.language);
    if (s.framework && !result.framework.includes(s.framework)) result.framework.push(s.framework);
    if (s.packageManager && !result.packageManager.includes(s.packageManager)) result.packageManager.push(s.packageManager);
    
    (s.requirements || []).forEach(r => {
      if (!result.requirements.includes(r)) result.requirements.push(r);
    });
    (s.installCommands || []).forEach(c => {
      if (!result.installCommands.includes(c)) result.installCommands.push(c);
    });
    (s.runCommands || []).forEach(c => {
      if (!result.runCommands.includes(c)) result.runCommands.push(c);
    });
    (s.extras || []).forEach(e => {
      if (!result.extras.includes(e)) result.extras.push(e);
    });

    if (s.dockerSupported) result.dockerSupported = true;
    (s.dockerCommands || []).forEach(c => {
      if (!result.dockerCommands.includes(c)) result.dockerCommands.push(c);
    });
  });

  return {
    language: result.language.join(', ') || null,
    framework: result.framework.join(', ') || null,
    packageManager: result.packageManager.join(', ') || null,
    requirements: result.requirements,
    installCommands: result.installCommands,
    runCommands: result.runCommands,
    extras: result.extras,
    dockerSupported: result.dockerSupported,
    dockerCommands: result.dockerCommands,
  };
}

function formatStackHints(stack) {
  const lines = [];
  lines.push('### Определённый стек проекта');
  lines.push(`- Язык: ${stack.language || 'не определён'}`);
  lines.push(`- Фреймворк: ${stack.framework || 'не выявлен'}`);
  lines.push(`- Пакетный менеджер: ${stack.packageManager || 'не выявлен'}`);
  if (stack.extras && stack.extras.length) {
    lines.push(`- Дополнительно: ${stack.extras.join(', ')}`);
  }
  if (stack.requirements && stack.requirements.length) {
    lines.push('');
    lines.push('### Требования (для раздела «Требования»)');
    stack.requirements.forEach((r) => lines.push(`- ${r}`));
  }
  if (stack.installCommands && stack.installCommands.length) {
    lines.push('');
    lines.push('### Команды установки');
    stack.installCommands.forEach((c) => lines.push(`    ${c}`));
  }
  if (stack.runCommands && stack.runCommands.length) {
    lines.push('');
    lines.push('### Команды запуска');
    stack.runCommands.forEach((c) => lines.push(`    ${c}`));
  }
  if (stack.dockerSupported) {
    lines.push('');
    lines.push('### Альтернативный запуск через Docker');
    stack.dockerCommands.forEach((c) => lines.push(`    ${c}`));
  }
  if (!stack.language) {
    lines.push('');
    lines.push('Стек не удалось определить автоматически. В разделе «Быстрый старт» напиши: «Для запуска обратитесь к документации проекта».');
  }
  return lines.join('\n');
}

module.exports = { detectStack, mergeStacks, formatStackHints };
