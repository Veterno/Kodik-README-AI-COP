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

// Список репозиториев (пример)
const REPOS = [
  'https://github.com/expressjs/express.git',
  'https://github.com/django/django.git',
  'https://github.com/golang/go.git',
  'https://github.com/rust-lang/rust.git',
  'https://github.com/spring-projects/spring-boot.git',
  // ... добавить ещё 25
];

const TEMP_DIR = path.join(__dirname, '../.benchmark-temp');
const RESULTS_DIR = path.join(__dirname, '../.benchmark-results');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function cloneRepo(repoUrl, dest) {
  if (!fs.existsSync(dest)) {
    console.log(`Клонирую ${repoUrl}...`);
    execSync(`git clone ${repoUrl} ${dest}`, { stdio: 'ignore' });
  } else {
    console.log(`Обновляю ${dest}...`);
    execSync(`git -C ${dest} pull`, { stdio: 'ignore' });
  }
}

function runGenerator(projectDir) {
  const cwd = process.cwd();
  process.chdir(projectDir);
  try {
    // Предполагаем, что генератор установлен глобально или доступен по пути
    const output = execSync('node ../src/index.js --non-interactive', { encoding: 'utf8', stdio: 'pipe' });
    return output;
  } catch (err) {
    console.error(`Ошибка при генерации для ${projectDir}: ${err.message}`);
    return null;
  } finally {
    process.chdir(cwd);
  }
}

function validateReadme(projectDir, generatedReadmePath) {
  // TODO: реализовать LLM-as-a-Judge
  // Отправить контекст (дерево, манифест, бизнес-контекст) + сгенерированный README
  // Получить оценки (JSON) и сохранить
  console.log(`Валидация для ${projectDir} пока не реализована.`);
  return { accuracy: 0, clarity: 0, business: 0, hallucinations: 0 };
}

function main() {
  ensureDir(TEMP_DIR);
  ensureDir(RESULTS_DIR);

  for (const repo of REPOS) {
    const name = path.basename(repo, '.git');
    const dest = path.join(TEMP_DIR, name);
    cloneRepo(repo, dest);

    console.log(`Генерация README для ${name}...`);
    const output = runGenerator(dest);
    if (output) {
      const generatedReadmePath = path.join(dest, 'README.md');
      if (fs.existsSync(generatedReadmePath)) {
        // Копируем результат в папку с результатами
        const target = path.join(RESULTS_DIR, `${name}.generated.md`);
        fs.copyFileSync(generatedReadmePath, target);

        // Проверяем, есть ли оригинальный README
        const originalPath = path.join(dest, 'README.original.md');
        if (fs.existsSync(originalPath)) {
          fs.copyFileSync(originalPath, path.join(RESULTS_DIR, `${name}.original.md`));
        }

        // Валидация
        const scores = validateReadme(dest, generatedReadmePath);
        fs.writeFileSync(
          path.join(RESULTS_DIR, `${name}.scores.json`),
          JSON.stringify(scores, null, 2)
        );
      }
    }
  }

  console.log('Бенчмаркинг завершён.');
}

if (require.main === module) {
  main();
}