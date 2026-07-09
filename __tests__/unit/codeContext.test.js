'use strict';

const fs = require('fs');
const path = require('path');
const { scanProject } = require('../../src/scanner/projectScanner');
const { resolveSafePath } = require('../../src/utils/pathUtils');
const { maskSensitive } = require('../../src/utils/sensitive');

jest.mock('fs');
jest.mock('../../src/utils/pathUtils');
jest.mock('../../src/utils/sensitive');
jest.mock('../../src/core/logger');

describe('codeContext.js', () => {
  const rootDir = '/root';

  beforeEach(() => {
    jest.clearAllMocks();
    resolveSafePath.mockImplementation((root, rel) => path.join(root, rel));
    maskSensitive.mockImplementation((content) => content);
  });

  it('should collect context from main file', () => {
    const mainFile = { name: 'src/index.js' };
    const flatFiles = new Set(['src/index.js']);
    const fileContent = '// This is a comment\nfunction test() {}\nconst x = 1;';

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(fileContent);

    const result = collectCodeContext(rootDir, flatFiles, mainFile);

    expect(result).toContain('--- Файл: src/index.js ---');
    expect(result).toContain('// This is a comment');
    expect(result).toContain('function test() {}');
    expect(result).toContain('const x = 1;');
  });

  it('should collect context from other code files in CODE_PATHS', () => {
    const flatFiles = new Set(['src/app.js', 'lib/helper.ts', 'other/file.txt']);
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('class MyClass {}');

    const result = collectCodeContext(rootDir, flatFiles, null);

    expect(result).toContain('--- Файл: src/app.js ---');
    expect(result).toContain('--- Файл: lib/helper.ts ---');
    expect(result).not.toContain('other/file.txt');
    expect(result).toContain('class MyClass {}');
  });

  it('should filter out non-declaration and non-comment lines', () => {
    const flatFiles = new Set(['src/index.js']);
    const fileContent = '  console.log("hello");\n  // keep this\n  class KeepThis {}';
    
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(fileContent);

    const result = collectCodeContext(rootDir, flatFiles, null);

    expect(result).toContain('// keep this');
    expect(result).toContain('class KeepThis {}');
    expect(result).not.toContain('console.log("hello");');
  });

  it('should respect MAX_LINES_PER_FILE', () => {
    const flatFiles = new Set(['src/index.js']);
    const manyLines = Array(1000).fill('// comment').join('\n');
    
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(manyLines);

    const result = collectCodeContext(rootDir, flatFiles, null);
    const lines = result.split('\n').filter(l => l === '// comment');
    
    // The limit is 400 lines by default
    expect(lines.length).toBeLessThanOrEqual(400);
  });

  it('should mask sensitive data', () => {
    const flatFiles = new Set(['src/index.js']);
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('const apiKey = "secret";');
    maskSensitive.mockReturnValue('const apiKey = "***";');

    const result = collectCodeContext(rootDir, flatFiles, null);

    expect(result).toContain('const apiKey = "***";');
    expect(maskSensitive).toHaveBeenCalled();
  });

  it('should handle read errors gracefully', () => {
    const flatFiles = new Set(['src/index.js']);
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => {
      throw new Error('read error');
    });

    const result = collectCodeContext(rootDir, flatFiles, null);

    expect(result).toBe('');
  });
});
