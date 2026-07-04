const path = require('path');

/**
 * Безопасно разрешает путь, предотвращая выход за пределы корневой директории (Path Traversal).
 * 
 * @param {string} rootDir - Корневая директория проекта (абсолютный путь).
 * @param {string} relativePath - Относительный путь к файлу или директории.
 * @returns {string} - Полный абсолютный путь, гарантированно находящийся внутри rootDir.
 * @throws {Error} - Если результирующий путь выходит за пределы rootDir.
 */
function resolveSafePath(rootDir, relativePath) {
  // 1. Нормализуем и делаем абсолютным корневой путь
  const absoluteRoot = path.resolve(rootDir);
  
  // 2. Нормализуем относительный путь, удаляя лишние разделители
  // Мы не удаляем '..' принудительно здесь, так как path.resolve обработает их,
  // а последующая проверка startsWith выявит попытку выхода за пределы.
  const normalizedRel = path.normalize(relativePath);
  
  // 3. Строим полный путь
  const fullPath = path.resolve(absoluteRoot, normalizedRel);
  
  // 4. Проверяем, что итоговый путь начинается с absoluteRoot
  // Используем path.sep, чтобы избежать ложных срабатываний (например, /project и /project-fake)
  const rootWithTrailingSep = absoluteRoot.endsWith(path.sep) ? absoluteRoot : absoluteRoot + path.sep;
  
  if (fullPath !== absoluteRoot && !fullPath.startsWith(rootWithTrailingSep)) {
    throw new Error(`Security Alert: Path traversal attempt detected. Path "${relativePath}" is outside of root "${rootDir}"`);
  }
  
  return fullPath;
}

module.exports = {
  resolveSafePath
};
