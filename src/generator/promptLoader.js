const fs = require('fs');
const path = require('path');

/**
 * Загружает промпты из JSON файлов в папке prompts.
 * @param {string} version - 'latest' или конкретная версия (напр. '1.0.0')
 * @returns {Object} Объект с промптами
 */
function loadPrompts(version = 'latest') {
  const baseDir = path.join(__dirname, '../prompts');
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Директория промптов не найдена: ${baseDir}`);
  }

  const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('В директории prompts не найдено JSON файлов');
  }

  let targetFile;
  if (version === 'latest') {
    // Сортируем файлы по имени (предполагая формат readme-generation-vX.Y.Z.json)
    // и берем последний
    targetFile = files.sort().pop();
  } else {
    targetFile = files.find(f => f.includes(version));
  }

  if (!targetFile) {
    throw new Error(`Промпты версии ${version} не найдены`);
  }

  const content = fs.readFileSync(path.join(baseDir, targetFile), 'utf8');
  return JSON.parse(content);
}

module.exports = { loadPrompts };
