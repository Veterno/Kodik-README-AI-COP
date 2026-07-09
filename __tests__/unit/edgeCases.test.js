'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { scanProject } = require('../../src/scanner/projectScanner');
const { resolveOptions } = require('../../src/interfaces/cli/options');
const { AiClient } = require('../../src/generator/ai/client');

jest.mock('../../src/core/logger');

describe('Edge Cases', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-cases-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle empty directory correctly', async () => {
    const result = await scanProject(tempDir);
    
    expect(result.flatFiles.size).toBe(0);
    expect(result.manifests).toEqual([]);
    expect(result.tree).toContain(path.basename(tempDir) + '/');
  });

  it('should handle malformed package.json', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{ invalid json }');
    
    const result = scanProject(tempDir);
    expect(result.manifests.length).toBe(1);
    expect(result.manifests[0].content).toBe('{ invalid json }');
  });

  it('should handle directory with many files', () => {
    for (let i = 0; i < 10; i++) {
      fs.writeFileSync(path.join(tempDir, `file${i}.txt`), 'content');
    }

    const result = scanProject(tempDir);
    expect(result.flatFiles.size).toBe(10);
    expect(result.tree).toContain('file0.txt');
  });

  it('should handle deep directory structures (MAX_TREE_DEPTH)', () => {
    let current = tempDir;
    for (let i = 0; i < 10; i++) {
      current = path.join(current, `dir${i}`);
      fs.mkdirSync(current);
      fs.writeFileSync(path.join(current, 'file.txt'), 'content');
    }

    const result = scanProject(tempDir);
    // MAX_TREE_DEPTH is 4 by default. Files at depth 10 should not be in the tree
    // but might be in flatFiles depending on walk implementation.
    // Current walk stops at MAX_TREE_DEPTH for the tree and for flatFiles.
    expect(result.flatFiles.size).toBeLessThan(10);
  });

  it('should handle resolveOptions with missing target', () => {
    const argv = { _: [] };
    const options = resolveOptions(argv);
    expect(options.target).toBe(process.cwd());
  });

  it('should handle permission errors during scanning', () => {
    const restrictedDir = path.join(tempDir, 'restricted');
    fs.mkdirSync(restrictedDir);
    
    // Mock readdirSync to throw for this specific directory
    const originalReaddirSync = fs.readdirSync;
    fs.readdirSync = jest.fn((p, opts) => {
      if (p.includes('restricted')) throw new Error('EACCES: permission denied');
      return originalReaddirSync(p, opts);
    });

    const result = scanProject(tempDir);
    expect(result.tree).toContain('restricted/');
    expect(result.flatFiles.size).toBe(0);
    
    fs.readdirSync = originalReaddirSync;
  });

  it('should handle invalid YAML in config file', () => {
    const configPath = path.join(tempDir, 'invalid.yaml');
    fs.writeFileSync(configPath, 'invalid: : yaml');
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const argv = { _: [], config: configPath };
    const options = resolveOptions(argv);
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(options.projectName).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should respect MAX_MANIFEST_BYTES limit', () => {
    const largeManifest = 'a'.repeat(10000);
    fs.writeFileSync(path.join(tempDir, 'package.json'), largeManifest);
    
    const result = scanProject(tempDir);
    expect(result.manifests[0].content).toContain('... (файл обрезан)');
    expect(result.manifests[0].content.length).toBeLessThan(10000);
  });
});
