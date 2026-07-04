#!/usr/bin/env node
'use strict';

/**
 * scripts/benchmark.js
 * Бенчмаркинг — запуск генерации на наборе репозиториев и оценка качества
 * с помощью LLM-as-a-Judge.
 *
 * Требуется: список репозиториев для клонирования (или локальные пути).
 * Для каждого:
 *   - клонируем/обновляем
 *   - запускаем генератор с --non-interactive
 *   - сохраняем сгенерированный README и оригинальный (если есть)
 *   - отправляем пару (контекст + сгенерированный README) в LLM-валидатор
 *   - собираем оценки
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { AiClient } = require('../src/aiClient');
const { validateReadme } = require('../src/validator');
const { scanProject } = require('../src/scanner');
const { findMainFile } = require('../src/mainFile');
const { collectBusinessContext } = require('../src/contextCollector');
const { collectCodeContext } = require('../src/codeContext');
const { detectStack } = require('../src/stackDetector');

require('dotenv').config();

// Список репозиториев для тестирования
const REPOS = [
  'https://github.com/expressjs/express.git',
  'https://github.com/lucia-auth/lucia.git',
  'https://github.com/pnpm/pnpm.git',
  'https://github.com/fastify/fastify.git',
  'https://github.com/honojs/hono.git'
];

const TEMP_DIR = path.join(__dirname, '../.benchmark-temp');
const RESULTS_DIR = path.join(__dirname, '../.benchmark-results');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cloneRepo(repoUrl, dest) {
  if (!fs.existsSync(dest)) {
    console.log(`Клонирую ${repoUrl}...`);
    execSync(`git clone --depth 1 ${repoUrl} ${dest}`, { stdio: 'ignore' });
  } else {
    console.log(`Обновляю ${dest}...`);
    try {
      execSync(`git -C ${dest} pull`, { stdio: 'ignore' });
    } catch (e) {
      console.warn(`Не удалось обновить ${dest}, использую текущую версию.`);
    }
  }
}

function runGenerator(projectDir) {
  const cwd = process.cwd();
  try {
    // Запускаем через node напрямую
    const indexScript = path.join(__dirname, '../src/index.js');
    execSync(`node ${indexScript} ${projectDir} --non-interactive`, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error(`Ошибка при генерации для ${projectDir}: ${err.message}`);
    return false;
  }
}

/**
 * Собирает контекст аналогично основному процессу для передачи в валидатор
 */
function getProjectContext(targetDir) {
  const scanResult = scanProject(targetDir);
  const { tree, flatFiles, manifests, docs } = scanResult;
  const manifest = manifests.length > 0 ? manifests[0] : null;
  const mainFile = findMainFile(targetDir, manifest, flatFiles);
  const businessContext = collectBusinessContext(targetDir, docs);
  const codeContext = collectCodeContext(targetDir, flatFiles, mainFile);
  const stack = detectStack(manifest, flatFiles);

  return `Project: ${path.basename(targetDir)}
Stack: ${JSON.stringify(stack)}
Structure:
${tree}
Code Context:
${codeContext}`;
}

async function main() {
  if (!process.env.OPENAI_API_KEY && !process.env.USE_AI === 'false') {
    console.warn('\x1b[33mПредупреждение: OPENAI_API_KEY не найден. Бенчмарк будет запущен в ограниченном режиме (без AI-валидации).\x1b[0m');
  }

  ensureDir(TEMP_DIR);  ensureDir(RESULTS_DIR);

  const summary = [];

  for (const repo of REPOS) {
    const name = path.basename(repo, '.git');
    const dest = path.join(TEMP_DIR, name);
    
    console.log(`\n=== Тестирование: ${name} ===`);
    cloneRepo(repo, dest);

    console.log(`Генерация README...`);
    const success = runGenerator(dest);
    
    if (success) {
      const generatedReadmePath = path.join(dest, 'README.md');
      if (fs.existsSync(generatedReadmePath)) {
        const markdown = fs.readFileSync(generatedReadmePath, 'utf8');
        
        // Сохраняем результат
        fs.writeFileSync(path.join(RESULTS_DIR, `${name}.generated.md`), markdown);

        console.log(`Валидация через LLM...`);
        const context = getProjectContext(dest);
        const validation = await validateReadme(markdown, context);
        
        fs.writeFileSync(
          path.join(RESULTS_DIR, `${name}.scores.json`),
          JSON.stringify(validation, null, 2)
        );

        console.log(`Результаты для ${name}:`, validation.scores);
        summary.push({ name, ...validation.scores });
      }
    }
  }

  // Итоговый отчет
  if (summary.length > 0) {
    const avg = (key) => (summary.reduce((a, b) => a + b[key], 0) / summary.length).toFixed(2);
    const report = {
      date: new Date().toISOString(),
      average: {
        accuracy: avg('accuracy'),
        clarity: avg('clarity'),
        completeness: avg('completeness'),
        hallucinations: avg('hallucinations')
      },
      details: summary
    };
    
    fs.writeFileSync(path.join(RESULTS_DIR, 'summary.json'), JSON.stringify(report, null, 2));
    console.log('\n=== ИТОГОВЫЙ ОТЧЕТ ===');
    console.table(report.average);
  }

  console.log('\nБенчмаркинг завершён. Результаты в .benchmark-results/');
}

if (require.main === module) {
  main().catch(console.error);
}
