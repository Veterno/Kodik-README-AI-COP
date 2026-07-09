'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../../src/core/config');
const { log } = require('../../src/core/logger');

jest.mock('fs');
jest.mock('../../src/core/logger');

// Мокаем конфиг так, чтобы мы могли менять значения динамически
jest.mock('../../src/core/config', () => ({
  IGNORED_DIRS: new Set(['node_modules', '.git']),
  IGNORED_FILES: new Set(['.DS_Store']),
  // Используем геттеры для динамических значений
  get MAX_TREE_DEPTH() { return global.__MAX_TREE_DEPTH || 4; },
  get MAX_TREE_ENTRIES() { return global.__MAX_TREE_ENTRIES || 100; },
  get MAX_FILES_PER_DIR() { return global.__MAX_FILES_PER_DIR || 5; }
}));

const { buildFileTree, collectFlatFileList } = require('../../src/scanner/projectScanner');

describe('tree.js', () => {
  const rootDir = '/test-project';

  beforeEach(() => {
    jest.clearAllMocks();
    global.__MAX_TREE_DEPTH = 4;
    global.__MAX_TREE_ENTRIES = 100;
    global.__MAX_FILES_PER_DIR = 5;
    fs.readdirSync.mockReturnValue([]);
  });

  describe('buildFileTree', () => {
    it('should build a simple tree', () => {
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === rootDir) {
          return [
            { name: 'dir1', isDirectory: () => true },
            { name: 'file1.js', isDirectory: () => false }
          ];
        }
        return [];
      });

      const tree = buildFileTree(rootDir);

      expect(tree).toContain('test-project/');
      expect(tree).toContain('├── dir1/');
      expect(tree).toContain('└── file1.js');
    });

    it('should respect IGNORED_DIRS and IGNORED_FILES', () => {
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === rootDir) {
          return [
            { name: 'node_modules', isDirectory: () => true },
            { name: '.git', isDirectory: () => true },
            { name: '.DS_Store', isDirectory: () => false },
            { name: 'src', isDirectory: () => true }
          ];
        }
        return [];
      });

      const tree = buildFileTree(rootDir);

      expect(tree).not.toContain('node_modules');
      expect(tree).not.toContain('.git');
      expect(tree).not.toContain('.DS_Store');
      expect(tree).toContain('└── src/');
    });

    it('should respect MAX_TREE_DEPTH', () => {
      global.__MAX_TREE_DEPTH = 1;
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === rootDir) {
          return [{ name: 'dir1', isDirectory: () => true }];
        }
        return [{ name: 'sub.js', isDirectory: () => false }];
      });

      const tree = buildFileTree(rootDir);
      expect(tree).toContain('└── dir1/');
      expect(tree).not.toContain('sub.js');
    });

    it('should truncate tree if MAX_TREE_ENTRIES is exceeded', () => {
      global.__MAX_TREE_ENTRIES = 1;
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === rootDir) {
          return [
            { name: 'file1.js', isDirectory: () => false },
            { name: 'file2.js', isDirectory: () => false }
          ];
        }
        return [];
      });

      const tree = buildFileTree(rootDir);
      expect(tree).toContain('file1.js');
      expect(tree).not.toContain('file2.js');
      expect(tree).toContain('дерево обрезано');
    });

    it('should show count for big directories (MAX_FILES_PER_DIR)', () => {
      global.__MAX_FILES_PER_DIR = 2;
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === rootDir) {
          return [{ name: 'big-dir', isDirectory: () => true }];
        }
        if (dir.includes('big-dir')) {
          return [
            { name: 'f1.js', isDirectory: () => false },
            { name: 'f2.js', isDirectory: () => false },
            { name: 'f3.js', isDirectory: () => false }
          ];
        }
        return [];
      });

      const tree = buildFileTree(rootDir);
      expect(tree).toContain('└── big-dir/ (3 элементов)');
    });

    it('should handle readdirSync errors gracefully', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('EACCES');
      });

      const tree = buildFileTree(rootDir);
      expect(tree).toBe('test-project/');
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Не удалось прочитать папку'));
    });
  });

  describe('collectFlatFileList', () => {
    it('should collect flat list of files', () => {
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === rootDir) {
          return [
            { name: 'file1.js', isDirectory: () => false },
            { name: 'dir1', isDirectory: () => true }
          ];
        }
        if (dir.includes('dir1')) {
          return [{ name: 'file2.js', isDirectory: () => false }];
        }
        return [];
      });

      const list = collectFlatFileList(rootDir);

      expect(list.has('file1.js')).toBe(true);
      expect(list.has('dir1/file2.js')).toBe(true);
      expect(list.size).toBe(2);
    });

    it('should respect depth limits in flat list', () => {
      global.__MAX_TREE_DEPTH = 1;
      fs.readdirSync.mockImplementation((dir) => {
        if (dir === rootDir) {
          return [{ name: 'dir1', isDirectory: () => true }];
        }
        return [{ name: 'file.js', isDirectory: () => false }];
      });

      const list = collectFlatFileList(rootDir);
      expect(list.size).toBe(0);
    });

    it('should handle errors in collectFlatFileList', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Error');
      });

      const list = collectFlatFileList(rootDir);
      expect(list.size).toBe(0);
    });
  });
});
