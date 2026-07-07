'use strict';

/**
 * Собирает финальный Markdown из структурированных данных.
 * @param {object} data - Данные для README
 * @param {string} data.title - Название проекта
 * @param {string} [data.description] - Описание
 * @param {Array} [data.features] - Список фич (объекты {name, description} или строки)
 * @param {object} [data.stack] - Стек технологий
 * @param {object} [data.quickStart] - Инструкции по запуску
 * @param {string} [data.projectStructure] - Дерево проекта
 * @param {string} [data.license] - Лицензия
 * @returns {string} Markdown строка
 */
function buildMarkdown(data) {
  const parts = [];

  // Заголовок
  parts.push(`# 🚀 ${data.title || 'Project'}`);
  parts.push('');

  // Описание
  if (data.description) {
    parts.push('## 📝 Описание');
    parts.push('');
    parts.push(data.description);
    parts.push('');
  }

  // Возможности
  if (data.features && Array.isArray(data.features) && data.features.length) {
    parts.push('## ✨ Ключевые возможности');
    parts.push('');
    data.features.forEach(f => {
      if (f && typeof f === 'object') {
        const name = f.name || '';
        const desc = f.description ? ` — ${f.description}` : '';
        if (name) parts.push(`- **${name}**${desc}`);
      } else if (f) {
        parts.push(`- ${f}`);
      }
    });
    parts.push('');
  }

  // Стек технологий
  if (data.stack && typeof data.stack === 'object') {
    parts.push('## 🛠️ Стек технологий');
    parts.push('');
    const s = data.stack;
    if (s.language) parts.push(`- **Язык:** ${s.language}`);
    if (s.framework) parts.push(`- **Фреймворк:** ${s.framework}`);
    if (s.packageManager) parts.push(`- **Пакетный менеджер:** ${s.packageManager}`);
    if (s.extras && Array.isArray(s.extras) && s.extras.length) {
      parts.push(`- **Дополнительно:** ${s.extras.join(', ')}`);
    }
    parts.push('');
  }

  // Быстрый старт
  if (data.quickStart && typeof data.quickStart === 'object') {
    const qs = data.quickStart;
    parts.push('## 📦 Быстрый старт');
    parts.push('');

    if (qs.requirements && Array.isArray(qs.requirements) && qs.requirements.length) {
      parts.push('### Требования');
      parts.push('');
      qs.requirements.forEach(req => parts.push(`- ${req}`));
      parts.push('');
    }

    if ((qs.installCommands && Array.isArray(qs.installCommands) && qs.installCommands.length) ||
        (qs.runCommands && Array.isArray(qs.runCommands) && qs.runCommands.length)) {
      parts.push('### Установка и запуск');
      parts.push('');
      parts.push('```bash');
      if (qs.installCommands && Array.isArray(qs.installCommands) && qs.installCommands.length) {
        parts.push('# Установка зависимостей');
        qs.installCommands.forEach(cmd => parts.push(cmd));
        parts.push('');
      }
      if (qs.runCommands && Array.isArray(qs.runCommands) && qs.runCommands.length) {
        parts.push('# Запуск');
        qs.runCommands.forEach(cmd => parts.push(cmd));
      }
      parts.push('```');
      parts.push('');
    }
    
    // Поддержка Docker
    if (qs.dockerCommands && Array.isArray(qs.dockerCommands) && qs.dockerCommands.length) {
      parts.push('### Запуск через Docker');
      parts.push('');
      parts.push('```bash');
      qs.dockerCommands.forEach(cmd => parts.push(cmd));
      parts.push('```');
      parts.push('');
    }
  }

  // Структура проекта
  if (data.projectStructure) {
    parts.push('## 📂 Структура проекта');
    parts.push('');
    const structure = String(data.projectStructure);
    if (structure.startsWith('```')) {
      parts.push(structure);
    } else {
      parts.push('```');
      parts.push(structure);
      parts.push('```');
    }
    parts.push('');
  }

  // Лицензия
  if (data.license) {
    parts.push('## 📄 Лицензия');
    parts.push('');
    parts.push(data.license);
    parts.push('');
  }

  return parts.join('\n');
}

module.exports = { buildMarkdown };
