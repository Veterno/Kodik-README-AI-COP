#!/usr/bin/env node
'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pLimit = require('p-limit');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { validateReadme } = require('../src/validator');
const { scanProject } = require('../src/scanner');
const { findMainFile } = require('../src/mainFile');
const { collectBusinessContext } = require('../src/contextCollector');
const { collectCodeContext } = require('../src/codeContext');
const { detectStack } = require('../src/stackDetector');

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

const REPOS = argv.repos ? argv.repos.split(',') : [
  'https://github.com/expressjs/express.git',
  'https://github.com/lucia-auth/lucia.git',
  'https://github.com/pnpm/pnpm.git',
  'https://github.com/fastify/fastify.git',
  'https://github.com/honojs/hono.git'
];

const MODELS = argv.models.split(',');
const TEMP_DIR = path.join(__dirname, '../.benchmark-temp');
const RESULTS_DIR = path.join(__dirname, '../.benchmark-results');

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
      execSync(`git clone --depth 1 ${repoUrl} ${dest}`, { stdio: 'ignore' });
    } else {
      console.log(`[UPDATE] ${dest}...`);
      execSync(`git -C ${dest} pull`, { stdio: 'ignore' });
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
    const indexScript = path.join(__dirname, '../src/index.js');
    // Передаем модель через переменную окружения для дочернего процесса
    const env = { ...process.env, AI_MODEL: model };
    const result = spawnSync('node', [indexScript, projectDir, '--non-interactive'], { 
      env,
      encoding: 'utf8',
      timeout: 300000 // 5 минут
    });
    
    if (result.status !== 0) {
      throw new Error(result.stderr || 'Unknown error');
    }
    
    return { success: true, duration: Date.now() - start };
  } catch (err) {
    console.error(`[ERROR] Генерация (${model}) для ${projectDir}: ${err.message}`);
    return { success: false, duration: Date.now() - start, error: err.message };
  }
}

function getProjectContext(targetDir) {
  const scanResult = scanProject(targetDir);
  const { tree, flatFiles, manifests } = scanResult;
  const manifest = manifests.length > 0 ? manifests[0] : null;
  const mainFile = findMainFile(targetDir, manifest, flatFiles);
  const codeContext = collectCodeContext(targetDir, flatFiles, mainFile);
  const stack = detectStack(manifest, flatFiles);

  return `Project: ${path.basename(targetDir)}\nStack: ${JSON.stringify(stack)}\nStructure:\n${tree}\nCode Context:\n${codeContext}`;
}

async function runBenchmarkForRepo(repoUrl, model) {
  const name = path.basename(repoUrl, '.git');
  const dest = path.join(TEMP_DIR, name);
  
  if (!await cloneRepo(repoUrl, dest)) return null;

  console.log(`[RUN] ${name} | Model: ${model}`);
  const genResult = runGenerator(dest, model);
  
  if (!genResult.success) return { repoName: name, model, success: false, error: genResult.error };

  const readmePath = path.join(dest, 'README.md');
  if (!fs.existsSync(readmePath)) return { repoName: name, model, success: false, error: 'README.md not generated' };

  const markdown = fs.readFileSync(readmePath, 'utf8');
  const commitHash = getCommitHash(dest);

  // Валидация
  const valStart = Date.now();
  const context = getProjectContext(dest);
  const validation = await validateReadme(markdown, context);
  const valDuration = Date.now() - valStart;

  // Сохраняем индивидуальный результат
  const resultId = `${name}-${model}-${Date.now()}`;
  const resultFile = path.join(RESULTS_DIR, `${resultId}.json`);
  const resultData = {
    repoName: name,
    repoUrl,
    commitHash,
    model,
    generationTimeMs: genResult.duration,
    validationTimeMs: valDuration,
    scores: validation.scores,
    feedback: validation.feedback,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(resultFile, JSON.stringify(resultData, null, 2));
  // Также сохраняем сам README для истории
  fs.writeFileSync(path.join(RESULTS_DIR, `${resultId}.md`), markdown);

  return { ...resultData, success: true };
}

async function main() {
  ensureDir(TEMP_DIR);
  ensureDir(RESULTS_DIR);

  const limit = pLimit(argv.concurrency);
  const tasks = [];

  for (const model of MODELS) {
    for (const repo of REPOS) {
      tasks.push(limit(() => runBenchmarkForRepo(repo, model)));
    }
  }

  console.log(`Запуск бенчмарка: ${REPOS.length} репозиториев, ${MODELS.length} моделей, параллелизм: ${argv.concurrency}`);
  
  const results = (await Promise.all(tasks)).filter(r => r !== null);
  
  const summaryPath = path.join(RESULTS_DIR, `run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const summary = {
    timestamp: new Date().toISOString(),
    config: { models: MODELS, repos: REPOS },
    results
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log(`\nБенчмарк завершен. Результаты сохранены в ${summaryPath}`);
  
  // Вызов генератора отчетов
  try {
    const reportGenerator = require('./reportGenerator');
    reportGenerator.generate(summaryPath);
  } catch (err) {
    console.error('Ошибка при генерации HTML-отчета:', err.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
