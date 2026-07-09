'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { saveReadme } = require('../../src/output/persistence');

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

  it('should create a backup if README.md already exists', () => {
    const targetPath = path.join(tempDir, 'README.md');
    fs.writeFileSync(targetPath, 'Old Content');
    
    const markdown = '# New Content';
    saveReadme(tempDir, markdown);
    
    const files = fs.readdirSync(tempDir);
    const backupFile = files.find(f => f.includes('README.backup.'));
    
    expect(backupFile).toBeDefined();
    expect(fs.readFileSync(path.join(tempDir, backupFile), 'utf8')).toBe('Old Content');
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('# New Content\n');
  });

  it('should handle backup failure gracefully', () => {
    const targetPath = path.join(tempDir, 'README.md');
    fs.writeFileSync(targetPath, 'Old Content');
    
    // Мокаем copyFileSync, чтобы он выбросил ошибку
    const copySpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {
      throw new Error('Disk Full');
    });
    
    const markdown = '# New Content';
    saveReadme(tempDir, markdown);
    
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('# New Content\n');
    copySpy.mockRestore();
  });

  it('should create target directory if it does not exist', () => {
    const nonExistentDir = path.join(tempDir, 'new-dir');
    const markdown = '# New Dir Content';
    
    saveReadme(nonExistentDir, markdown);
    
    expect(fs.existsSync(path.join(nonExistentDir, 'README.md'))).toBe(true);
    expect(fs.readFileSync(path.join(nonExistentDir, 'README.md'), 'utf8')).toBe('# New Dir Content\n');
  });
});
