'use strict';

const fs = require('fs');
const path = require('path');
const { findManifest } = require('../../src/manifest');
const { MANIFEST_FILES, MAX_MANIFEST_BYTES } = require('../../src/config');
const { log } = require('../../src/logger');

jest.mock('fs');
jest.mock('../../src/logger');

describe('manifest.js', () => {
  const rootDir = '/test-project';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null if no manifest files exist', () => {
    fs.existsSync.mockReturnValue(false);

    const result = findManifest(rootDir);

    expect(result).toBeNull();
    expect(fs.existsSync).toHaveBeenCalled();
  });

  it('should find and read the first available manifest', () => {
    const mockFile = MANIFEST_FILES[0];
    const mockContent = '{"name": "test-pkg"}';

    fs.existsSync.mockImplementation((p) => p.endsWith(mockFile));
    fs.readFileSync.mockReturnValue(mockContent);

    const result = findManifest(rootDir);

    expect(result).toEqual({
      name: mockFile,
      content: mockContent
    });
    expect(fs.readFileSync).toHaveBeenCalledWith(path.join(rootDir, mockFile), 'utf8');
  });

  it('should truncate content if it exceeds MAX_MANIFEST_BYTES', () => {
    const mockFile = MANIFEST_FILES[0];
    const longContent = 'a'.repeat(MAX_MANIFEST_BYTES + 100);

    fs.existsSync.mockImplementation((p) => p.endsWith(mockFile));
    fs.readFileSync.mockReturnValue(longContent);

    const result = findManifest(rootDir);

    expect(result.content).toHaveLength(MAX_MANIFEST_BYTES + '\n... (файл обрезан)'.length);
    expect(result.content).toContain('... (файл обрезан)');
  });

  it('should log warning and continue if reading fails', () => {
    const mockFile1 = MANIFEST_FILES[0];
    const mockFile2 = MANIFEST_FILES[1];
    const mockContent2 = 'mock content 2';

    fs.existsSync.mockImplementation((p) => p.endsWith(mockFile1) || p.endsWith(mockFile2));
    
    // Первый файл выбрасывает ошибку
    fs.readFileSync.mockImplementation((p) => {
      if (p.endsWith(mockFile1)) throw new Error('Permission denied');
      return mockContent2;
    });

    const result = findManifest(rootDir);

    expect(result).toEqual({
      name: mockFile2,
      content: mockContent2
    });
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining(`Не удалось прочитать манифест "${mockFile1}"`));
  });
});
