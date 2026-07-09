'use strict';

const fs = require('fs');
const path = require('path');
const { findMainFile } = require('../../src/scanner/entryDetector');
const { resolveSafePath } = require('../../src/utils/pathUtils');
const { MAIN_FILE_CANDIDATES, MAX_MAIN_FILE_LINES } = require('../../src/core/config');

jest.mock('fs');
jest.mock('../../src/utils/pathUtils');
jest.mock('../../src/core/logger');

describe('mainFile.js', () => {
  const rootDir = '/root';

  beforeEach(() => {
    jest.clearAllMocks();
    resolveSafePath.mockImplementation((root, rel) => path.join(root, rel));
  });

  it('should find main file from package.json "main" field', () => {
    const manifest = {
      name: 'package.json',
      content: JSON.stringify({ main: 'src/index.js' })
    };
    const flatFiles = new Set(['src/index.js']);
    const fileContent = 'console.log("hello");';

    fs.readFileSync.mockReturnValue(fileContent);

    const result = findMainFile(rootDir, manifest, flatFiles);

    expect(result).toEqual({
      name: 'src/index.js',
      content: fileContent
    });
    expect(fs.readFileSync).toHaveBeenCalledWith(path.join(rootDir, 'src/index.js'), 'utf8');
  });

  it('should find main file from package.json "bin" field', () => {
    const manifest = {
      name: 'package.json',
      content: JSON.stringify({ bin: { cli: 'bin/cli.js' } })
    };
    const flatFiles = new Set(['bin/cli.js']);
    fs.readFileSync.mockReturnValue('cli content');

    const result = findMainFile(rootDir, manifest, flatFiles);

    expect(result.name).toBe('bin/cli.js');
  });

  it('should find main file from default candidates if manifest is missing', () => {
    const flatFiles = new Set([MAIN_FILE_CANDIDATES[0]]);
    fs.readFileSync.mockReturnValue('index content');

    const result = findMainFile(rootDir, null, flatFiles);

    expect(result.name).toBe(MAIN_FILE_CANDIDATES[0]);
  });

  it('should respect MAX_MAIN_FILE_LINES', () => {
    const flatFiles = new Set(['index.js']);
    const manyLines = Array(MAX_MAIN_FILE_LINES + 10).fill('line').join('\n');
    fs.readFileSync.mockReturnValue(manyLines);

    const result = findMainFile(rootDir, null, flatFiles);

    const resultLines = result.content.split('\n');
    expect(resultLines.length).toBe(MAX_MAIN_FILE_LINES);
  });

  it('should return null if no candidates found', () => {
    const flatFiles = new Set(['other.js']);
    const result = findMainFile(rootDir, null, flatFiles);

    expect(result).toBeNull();
  });

  it('should handle malformed package.json gracefully', () => {
    const manifest = {
      name: 'package.json',
      content: '{ invalid json }'
    };
    const flatFiles = new Set(['index.js']);
    fs.readFileSync.mockReturnValue('content');

    const result = findMainFile(rootDir, manifest, flatFiles);
    // Should still work with default candidates
    expect(result).not.toBeNull();
  });
});
