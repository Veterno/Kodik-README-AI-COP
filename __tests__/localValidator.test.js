'use strict';

const { validateLocal, applyFixes } = require('../src/validation/localRules');

describe('localValidator', () => {
  const mockOptions = {
    sections: [
      { id: 'description', title: 'Описание', enabled: true },
      { id: 'quickStart', title: 'Быстрый старт', enabled: true },
      { id: 'license', title: 'Лицензия', enabled: true }
    ],
    emojis: {
      description: '📝',
      quickStart: '📦',
      license: '📄'
    }
  };

  test('should detect missing sections', () => {
    const markdown = '# Project Title\n\n## 📝 Описание\nSome description';
    const report = validateLocal(markdown, mockOptions);

    const missingIds = report.errors.map(e => e.id);
    expect(missingIds).toContain('quickStart');
    expect(missingIds).toContain('license');
    expect(report.fixes.length).toBe(2);
  });

  test('should detect empty sections', () => {
    const markdown = '# Project Title\n\n## 📝 Описание\nSome description\n\n## 📦 Быстрый старт\n\n## 📄 Лицензия\nMIT';
    const report = validateLocal(markdown, mockOptions);

    const emptySections = report.warnings.filter(w => w.type === 'empty_section');
    expect(emptySections.length).toBe(1);
    expect(emptySections[0].section).toBe('Быстрый старт');
  });

  test('should detect invalid links', () => {
    const markdown = '[Invalid Link](not-a-url)';
    const report = validateLocal(markdown, mockOptions);

    expect(report.warnings.some(w => w.type === 'invalid_link')).toBe(true);
  });

  test('should detect bad header format', () => {
    const markdown = '##Bad Header';
    const report = validateLocal(markdown, mockOptions);

    expect(report.warnings.some(w => w.type === 'bad_header_format')).toBe(true);
    expect(report.fixes.some(f => f.type === 'fix_headers')).toBe(true);
  });

  test('should apply fixes correctly', () => {
    const markdown = '##Bad Header';
    const report = validateLocal(markdown, mockOptions);
    const fixedMarkdown = applyFixes(markdown, report.fixes);

    expect(fixedMarkdown).toContain('## Bad Header');
    expect(fixedMarkdown).toContain('## 📝 Описание');
    expect(fixedMarkdown).toContain('## 📦 Быстрый старт');
    expect(fixedMarkdown).toContain('## 📄 Лицензия');
  });

  test('should detect broken code blocks', () => {
    const markdown = '```javascript\nconst a = 1;';
    const report = validateLocal(markdown, mockOptions);

    expect(report.errors.some(e => e.type === 'broken_code_blocks')).toBe(true);
  });
});
