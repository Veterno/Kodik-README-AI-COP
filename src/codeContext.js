'use strict';

/**
 * src/codeContext.js
 * Сбор контекста из исходных файлов проекта: комментарии, функции, классы, экспорты.
 */

const fs = require('fs');
const path = require('path');
const { log } = require('./logger');

// Папки, которые стоит обойти для поиска кода
const CODE_PATHS = ['src', 'lib', 'app', 'models', 'controllers', 'services', 'utils', 'core', 'internal', 'components', 'pages', 'hooks', 'helpers', 'modules'];

// Расширения файлов с кодом
const CODE_EXTS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.cs', '.swift', '.kt', '.scala', '.c', '.cpp', '.h', '.hpp'];

// Лимиты – 100 файлов и 400 строк
const MAX_FILES = parseInt(process.env.CODE_CONTEXT_MAX_FILES || '100', 10);
const MAX_LINES_PER_FILE = parseInt(process.env.CODE_CONTEXT_MAX_LINES || '400', 10);

/**
 * Собирает текстовый контекст из исходных файлов.
 * @param {string} rootDir - корень проекта
 * @param {Set<string>} flatFiles - список всех файлов (относительные пути)
 * @param {object|null} mainFile - объект с информацией о главном файле
 * @returns {string} - собранный текстовый контекст
 */
function collectCodeContext(rootDir, flatFiles, mainFile) {
  const candidates = [];

  // 1) Сам главный файл (если есть)
  if (mainFile && mainFile.name) {
    const absPath = path.join(rootDir, mainFile.name);
    if (fs.existsSync(absPath)) {
      candidates.push({ rel: mainFile.name, priority: 0 });
    }
  }

  // 2) Другие файлы: проходим по плоскому списку и выбираем те, что лежат в CODE_PATHS
  const fileList = Array.from(flatFiles);
  for (const rel of fileList) {
    // Проверяем расширение
    const ext = path.extname(rel).toLowerCase();
    if (!CODE_EXTS.includes(ext)) continue;

    // Проверяем, лежит ли файл в одной из разрешённых папок
    const parts = rel.split(/[/\\]/);
    // Если файл находится на глубине >=1 и первая папка в списке разрешённых
    if (parts.length >= 2 && CODE_PATHS.includes(parts[0])) {
      if (mainFile && mainFile.name === rel) continue;
      candidates.push({ rel, priority: 1 });
    }
  }

  // Сортируем: сначала главный файл, потом остальные (по алфавиту)
  candidates.sort((a, b) => a.priority - b.priority || a.rel.localeCompare(b.rel));

  // Ограничиваем количество
  const selected = candidates.slice(0, MAX_FILES);

  let result = '';
  for (const { rel } of selected) {
    const absPath = path.join(rootDir, rel);
    try {
      const content = fs.readFileSync(absPath, 'utf8');
      const lines = content.split(/\r?\n/);
      const limited = lines.slice(0, MAX_LINES_PER_FILE);

      // Пытаемся вычленить полезные элементы:
      // - комментарии (однострочные и многострочные)
      // - объявления функций/классов (зависит от языка, но общий подход)
      // Для простоты соберём всё, но можно отфильтровать пустые строки и строки без кода
      let filtered = [];
      let inMultilineComment = false;
      for (const line of limited) {
        const trimmed = line.trim();
        // Пропускаем слишком длинные строки (технические)
        if (trimmed.length > 300) continue;

        // Если строка содержит комментарий или сигнатуру функции/класса
        const isComment = /^\s*\/\//.test(line) || /^\s*#/.test(line) || /^\s*\/\*/.test(line) || /^\s*\*/.test(line);
        const isDeclaration = /^\s*(export\s+)?(function|class|interface|type|enum|const|let|var|def|pub\s+fn|public\s+class|public\s+function|public\s+static|async\s+function|private\s+|protected\s+)/i.test(line);

        if (isComment || isDeclaration) {
          filtered.push(trimmed);
        }
      }

      if (filtered.length > 0) {
        result += `\n--- Файл: ${rel} ---\n`;
        result += filtered.join('\n');
        result += '\n';
      }
    } catch (err) {
      log.warn(`Не удалось прочитать файл ${rel}: ${err.message}`);
    }
  }

  return result;
}

module.exports = { collectCodeContext };