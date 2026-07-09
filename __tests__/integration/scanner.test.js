const fs = require('fs');
const path = require('path');
const os = require('os');
const { scanProject } = require('../../src/scanner/projectScanner');

describe('scanner: scanProject', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-test-'));
    // Создаем структуру проекта
    fs.mkdirSync(path.join(tempDir, 'src'));
    fs.mkdirSync(path.join(tempDir, 'node_modules'));
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "test"}');
    fs.writeFileSync(path.join(tempDir, 'src/index.js'), 'console.log(1)');
    fs.writeFileSync(path.join(tempDir, 'LICENSE'), 'MIT License');
    fs.writeFileSync(path.join(tempDir, '.env'), 'SECRET=123');
  });

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('должен корректно сканировать дерево и игнорировать запрещенные папки/файлы', () => {
    const result = scanProject(tempDir);
    
    expect(result.flatFiles.has('package.json')).toBe(true);
    expect(result.flatFiles.has('src/index.js')).toBe(true);
    
    // Игнорирование (в scanner.js IGNORED_DIRS содержит node_modules)
    expect(result.flatFiles.has('node_modules/some-file.js')).toBe(false);
    expect(result.flatFiles.has('.env')).toBe(false);
    
    // Лицензия
    expect(result.detectedLicense).toBe('MIT');
    
    // Манифесты
    expect(result.manifests.some(m => m.name === 'package.json')).toBe(true);
  });
});
