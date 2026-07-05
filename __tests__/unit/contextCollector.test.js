'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { collectBusinessContext } = require('../../src/contextCollector');
const { resolveSafePath } = require('../../src/utils/pathUtils');

jest.mock('child_process');
jest.mock('fs');
jest.mock('../../src/utils/pathUtils');
jest.mock('../../src/logger');

describe('contextCollector.js', () => {
  const rootDir = '/root';

  beforeEach(() => {
    jest.clearAllMocks();
    resolveSafePath.mockImplementation((root, rel) => path.join(root, rel));
  });

  describe('collectBusinessContext', () => {
    it('should collect git context when .git exists', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('.git'));
      execSync.mockReturnValue('a1b2c3d feat: add login\ne5f6a7b fix: crash\nc9d8e7f docs: update readme');

      const result = collectBusinessContext(rootDir);

      expect(result.features).toContain('a1b2c3d feat: add login');
      expect(result.fixes).toContain('e5f6a7b fix: crash');
      expect(result.docs).toEqual({}); // No docs files found yet
    });

    it('should return empty git context when .git does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = collectBusinessContext(rootDir);

      expect(result.commits).toEqual([]);
      expect(result.features).toEqual([]);
    });

    it('should collect doc files from scannedDocs', () => {
      fs.existsSync.mockReturnValue(false); // No git
      const scannedDocs = [
        { name: 'FEATURES.md', content: 'Feature 1\nFeature 2' },
        { name: 'README.md', content: 'Should be ignored' }
      ];

      const result = collectBusinessContext(rootDir, scannedDocs);

      expect(result.docs['FEATURES.md']).toBe('Feature 1\nFeature 2');
      expect(result.docs['README.md']).toBeUndefined();
    });

    it('should fallback to reading files from disk if scannedDocs is missing', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('PRODUCT.md'));
      fs.readFileSync.mockReturnValue('# Product Title\n- Bullet point');

      const result = collectBusinessContext(rootDir);

      expect(result.docs['PRODUCT.md']).toBe('# Product Title\n- Bullet point');
    });

    it('should handle git errors gracefully', () => {
      fs.existsSync.mockImplementation((p) => p.endsWith('.git'));
      execSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      const result = collectBusinessContext(rootDir);

      expect(result.commits).toEqual([]);
    });
  });
});
