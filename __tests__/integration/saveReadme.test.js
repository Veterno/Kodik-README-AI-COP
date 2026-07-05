'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { saveReadme } = require('../../src/saveReadme');

describe('saveReadme.js (Integration)', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save markdown to README.md in target directory', () => {
    const markdown = '# Hello World';
    const targetPath = saveReadme(tempDir, markdown);

    expect(targetPath).toBe(path.join(tempDir, 'README.md'));
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('# Hello World\n');
  });

  it('should strip markdown code blocks if present', () => {
    const markdown = '```markdown\n# Content\n```';
    saveReadme(tempDir, markdown);

    const savedContent = fs.readFileSync(path.join(tempDir, 'README.md'), 'utf8');
    expect(savedContent).toBe('# Content\n');
  });

  it('should handle nested paths correctly', () => {
    const subDir = path.join(tempDir, 'sub');
    fs.mkdirSync(subDir);
    const markdown = '# Sub Project';
    
    const targetPath = saveReadme(subDir, markdown);
    
    expect(targetPath).toBe(path.join(subDir, 'README.md'));
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('# Sub Project\n');
  });
});
