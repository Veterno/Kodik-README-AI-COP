#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pLimit = require('p-limit');
// В новых версиях p-limit может потребоваться .default или динамический импорт
// Но так как мы установили p-limit через npm, проверим как он экспортируется
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Импортируем валидатор (предполагается, что он экспортирует validateReadme)
let validateReadme;
try {
  validateReadme = require('../src/validator').validateReadme;
} catch (e) {
  // Fallback если валидатор еще не реализован или имеет другой путь
  validateReadme = async () => ({ scores: { overall: 0 }, feedback: 'Validator not found' });
}

require('dotenv').config();

const argv = yargs(hideBin(process.argv))
  .option('models', {
    alias: 'm',
    type: 'string',
    description: 'Список моделей через запятую',
    default: process.env.AI_MODEL || 'gpt-4o-mini'
  })
  .option('concurrency', {
    alias: 'c',
    type: 'number',
    description: 'Количество параллельных задач',
    default: 3
  })
  .option('repos', {
    alias: 'r',
    type: 'string',
    description: 'Список репозиториев через запятую (URL)'
  })
  .argv;

const REPOS = argv.repos ? argv.repos.split(',').map(r => r.trim()) : [
  'https://github.com/expressjs/express.git',
  'https://github.com/lucia-auth/lucia.git',
  'https://github.com/pnpm/pnpm.git',
  'https://github.com/fastify/fastify.git',
  'https://github.com/honojs/hono.git'
];

const MODELS = argv.models.split(',').map(m => m.trim());
const TEMP_DIR = path.join(process.cwd(), '.benchmark-temp');
const RESULTS_DIR = path.join(process.cwd(), 'benchmark-results');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getCommitHash(repoPath) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: repoPath, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function cloneRepo(repoUrl, dest) {
  try {
    if (!fs.existsSync(dest)) {
      console.log(`[CLONE] ${repoUrl}...`);
      execSync(`git clone --depth 1 "${repoUrl}" "${dest}"`, { stdio: 'ignore' });
    } else {
      console.log(`[UPDATE] ${dest}...`);
      execSync(`git -C "${dest}" pull`, { stdio: 'ignore' });
    }
    return true;
  } catch (err) {
    console.error(`[ERROR] Не удалось клонировать ${repoUrl}: ${err.message}`);
    return false;
  }
}

function runGenerator(projectDir, model) {
  const start = Date.now();
  try {
    const indexScript = path.join(process.cwd(), 'src/index.js');
    const env = { ...process.env, AI_MODEL: model };
    
    // Запускаем генератор как дочерний процесс
    // Оборачиваем пути в кавычки для корректной работы с пробелами в Windows
    const result = spawnSync('node', [`"${indexScript}"`, `"${projectDir}"`, '--non-interactive'], { 
      env,
      encoding: 'utf8',
      timeout: 300000, // 5 минут
      shell: true
    });
    
    if (result.status !== 0) {
      return { success: false, duration: Date.now() - start, error: result.stderr || 'Unknown error' };
    }
    
    return { success: true, duration: Date.now() - start };
  } catch (err) {
    return { success: false, duration: Date.now() - start, error: err.message };
  }
}

async function runBenchmarkForRepo(repoUrl, model) {
  const name = path.basename(repoUrl, '.git');
  const dest = path.join(TEMP_DIR, name);
  
  if (!await cloneRepo(repoUrl, dest)) {
    return { repoName: name, model, success: false, error: 'Clone failed' };
  }

  console.log(`[RUN] ${name} | Model: ${model}`);
  const genResult = runGenerator(dest, model);
  
  const resultData = {
    repoName: name,
    repoUrl,
    commitHash: getCommitHash(dest),
    model,
    generationTimeMs: genResult.duration,
    timestamp: new Date().toISOString(),
    success: genResult.success
  };

  if (!genResult.success) {
    resultData.error = genResult.error;
    return resultData;
  }

  const readmePath = path.join(dest, 'README.md');
  if (!fs.existsSync(readmePath)) {
    resultData.success = false;
    resultData.error = 'README.md not generated';
    return resultData;
  }

  const markdown = fs.readFileSync(readmePath, 'utf8');

  // Валидация (имитация контекста для упрощения)
  const valStart = Date.now();
  try {
    const validation = await validateReadme(markdown, `Context for ${name}`);
    resultData.validationTimeMs = Date.now() - valStart;
    resultData.scores = validation.scores;
    resultData.feedback = validation.feedback;
  } catch (err) {
    resultData.validationError = err.message;
    resultData.scores = { overall: 0 };
  }

  // Сохраняем артефакт README
  const artifactDir = path.join(RESULTS_DIR, 'artifacts', name);
  ensureDir(artifactDir);
  fs.writeFileSync(path.join(artifactDir, `README-${model}.md`), markdown);

  return resultData;
}

async function main() {
  console.time('Benchmark Total Time');
  ensureDir(TEMP_DIR);
  ensureDir(RESULTS_DIR);

  // p-limit v3+ возвращает функцию напрямую, но в некоторых окружениях может потребоваться .default
  const limitFunc = typeof pLimit === 'function' ? pLimit : pLimit.default;
  const limit = limitFunc(argv.concurrency);
  const tasks = [];

  for (const model of MODELS) {
    for (const repo of REPOS) {
      tasks.push(limit(() => runBenchmarkForRepo(repo, model)));
    }
  }

  console.log(`🚀 Запуск бенчмарка: ${REPOS.length} репозиториев, ${MODELS.length} моделей, параллелизм: ${argv.concurrency}`);
  
  const results = await Promise.all(tasks);
  
  const summary = {
    timestamp: new Date().toISOString(),
    config: { 
      models: MODELS, 
      repos: REPOS,
      concurrency: argv.concurrency,
      version: require('../package.json').version
    },
    results
  };

  const summaryPath = path.join(RESULTS_DIR, 'latest-results.json');
  const historyPath = path.join(RESULTS_DIR, `run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  fs.writeFileSync(historyPath, JSON.stringify(summary, null, 2));
  
  console.log(`\n✅ Бенчмарк завершен. Результаты сохранены в ${RESULTS_DIR}`);
  console.timeEnd('Benchmark Total Time');
  
  // Генерация отчета
  try {
    const { generateReport } = require('./reportGenerator');
    await generateReport(summaryPath);
  } catch (err) {
    console.error('❌ Ошибка при генерации HTML-отчета:', err.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
