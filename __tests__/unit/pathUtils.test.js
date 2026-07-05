const { resolveSafePath } = require('../../src/utils/pathUtils');
const path = require('path');

describe('pathUtils: resolveSafePath', () => {
  // Используем абсолютный путь, корректный для текущей ОС
  const root = path.resolve('C:/base/project');

  test('должен разрешать корректные относительные пути', () => {
    const relPath = 'src/index.js';
    const result = resolveSafePath(root, relPath);
    expect(result).toBe(path.join(root, relPath));
  });

  test('должен предотвращать выход за пределы корня через ../', () => {
    expect(() => {
      resolveSafePath(root, '../../etc/passwd');
    }).toThrow('Security Alert: Path traversal attempt detected');
  });

  test('должен обрабатывать точки в путях (./)', () => {
    const result = resolveSafePath(root, './config.json');
    expect(result).toBe(path.join(root, 'config.json'));
  });

  test('должен разрешать путь к самому корню', () => {
    const result = resolveSafePath(root, '.');
    expect(result).toBe(root);
  });

  test('должен блокировать абсолютные пути, если они ведут вовне', () => {
    const externalPath = path.resolve('C:/other/path');
    expect(() => resolveSafePath(root, externalPath)).toThrow();
  });
});
