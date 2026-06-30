'use strict';
/**
 * src/generateReadme.js
 * Генерация README.md на основе анализа стека (без внешнего AI).
 * Использует stackDetector для определения технологий и команд.
 */
const { detectStack, formatStackHints } = require('./stackDetector');

/**
 * Генерирует содержимое README.md и возвращает объект { markdown, stack }.
 * @param {object} params
 * @param {string} params.projectName
 * @param {string} params.tree - текстовое дерево
 * @param {Set<string>} params.flatFiles - плоский список файлов
 * @param {object|null} params.manifest - { name, content }
 * @param {object|null} params.mainFile - { name, content }
 * @returns {Promise<{ markdown: string, stack: object }>}
 */
async function generateReadme({ projectName, tree, flatFiles, manifest, mainFile }) {
  // 1. Определяем стек
  const stack = detectStack(manifest, flatFiles);
  
  // 2. Формируем разделы
  const parts = [];

  // Заголовок
  parts.push(`# 🚀 ${projectName}`);
  parts.push('');

  // Описание (генерируем из стека)
  let description = stack.language ? `Проект на **${stack.language}**` : 'Программный проект';
  if (stack.framework) {
    description += ` с использованием **${stack.framework}**`;
  }
  if (stack.extras && stack.extras.length) {
    description += `. Дополнительно: ${stack.extras.join(', ')}.`;
  }
  parts.push('## 📝 Описание');
  parts.push('');
  parts.push(description);
  parts.push('');

  // Ключевые возможности (на основе дерева)
  const features = [];
  if (tree.includes('api/') || tree.includes('/api/')) features.push('🔌 REST API');
  if (tree.includes('cmd/') || tree.includes('cli/')) features.push('🖥️  Командная строка (CLI)');
  if (tree.includes('web/') || tree.includes('ui/') || tree.includes('frontend/')) features.push('🌐 Веб-интерфейс');
  if (tree.includes('test/') || tree.includes('tests/') || tree.includes('_test.')) features.push('🧪 Модульные тесты');
  if (flatFiles.has('Dockerfile') || flatFiles.has('docker-compose.yml')) features.push('🐳 Контейнеризация (Docker)');
  if (flatFiles.has('.github/workflows') || flatFiles.has('.gitlab-ci.yml')) features.push('⚙️ CI/CD');
  if (features.length === 0) {
    features.push('📁 Структурированный код');
    features.push('📦 Управление зависимостями');
  }
  parts.push('## ✨ Ключевые возможности');
  parts.push('');
  features.forEach(f => parts.push(`- ${f}`));
  parts.push('');

  // Стек технологий
  parts.push('## 🛠️ Стек технологий');
  parts.push('');
  parts.push(`- **Язык:** ${stack.language || 'не определён'}`);
  if (stack.framework) parts.push(`- **Фреймворк:** ${stack.framework}`);
  parts.push(`- **Пакетный менеджер:** ${stack.packageManager || 'не выявлен'}`);
  if (stack.extras && stack.extras.length) {
    parts.push(`- **Дополнительно:** ${stack.extras.join(', ')}`);
  }
  parts.push('');

  // Зависимости (если есть package.json)
  if (manifest && manifest.name === 'package.json') {
    try {
      const pkg = JSON.parse(manifest.content.replace(/\n\.\.\. \(файл обрезан\)$/, ''));
      const deps = Object.keys(pkg.dependencies || {});
      const devDeps = Object.keys(pkg.devDependencies || {});
      if (deps.length) {
        parts.push('### Зависимости');
        parts.push('```');
        parts.push(deps.join(', '));
        parts.push('```');
        parts.push('');
      }
      if (devDeps.length) {
        parts.push('### Dev-зависимости');
        parts.push('```');
        parts.push(devDeps.join(', '));
        parts.push('```');
        parts.push('');
      }
    } catch { /* ignore */ }
  }

  // Быстрый старт
  parts.push('## 📦 Быстрый старт');
  parts.push('');
  parts.push('### Требования');
  parts.push('');
  if (stack.requirements && stack.requirements.length) {
    stack.requirements.forEach(req => parts.push(`- ${req}`));
  } else {
    parts.push('- Убедитесь, что необходимые инструменты установлены (см. документацию).');
  }
  parts.push('');

  parts.push('### Установка и запуск');
  parts.push('');
  parts.push('```bash');
  if (stack.installCommands && stack.installCommands.length) {
    parts.push('# 1. Установка зависимостей');
    stack.installCommands.forEach(cmd => parts.push(cmd));
    parts.push('');
  }
  if (stack.runCommands && stack.runCommands.length) {
    parts.push('# 2. Запуск');
    stack.runCommands.forEach(cmd => parts.push(cmd));
  } else {
    parts.push('# Команды запуска не определены автоматически.');
    parts.push('# Обратитесь к документации проекта.');
  }
  parts.push('```');
  parts.push('');

  // Альтернативный запуск через Docker (если поддерживается)
  if (stack.dockerSupported && stack.dockerCommands.length) {
    parts.push('### Запуск через Docker');
    parts.push('');
    parts.push('```bash');
    stack.dockerCommands.forEach(cmd => parts.push(cmd));
    parts.push('```');
    parts.push('');
  }

  // Структура проекта
  parts.push('## 📂 Структура проекта');
  parts.push('');
  parts.push('```');
  parts.push(tree);
  parts.push('```');
  parts.push('');

  // Лицензия (по умолчанию MIT)
  parts.push('## 📄 Лицензия');
  parts.push('');
  parts.push('MIT');
  parts.push('');

  const markdown = parts.join('\n');
  return { markdown, stack };
}

module.exports = { generateReadme };