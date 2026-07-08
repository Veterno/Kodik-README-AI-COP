const { buildMarkdown } = require('../../src/markdownBuilder');
const { DEFAULT_SECTIONS, DEFAULT_EMOJIS } = require('../../src/config');

describe('markdownBuilder', () => {
  const data = {
    title: 'Test Project',
    description: 'Test Description',
    features: ['Feature 1', 'Feature 2'],
    stack: { language: 'JavaScript' },
    license: 'MIT'
  };

  const options = {
    content: {
      style: 'modern',
      sections: DEFAULT_SECTIONS,
      emojis: DEFAULT_EMOJIS
    }
  };

  test('должен генерировать стандартный README', () => {
    const md = buildMarkdown(data, options);
    expect(md).toContain('# 🚀 Test Project');
    expect(md).toContain('## 📝 Описание');
    expect(md).toContain('Test Description');
    expect(md).toContain('## ✨ Ключевые возможности');
    expect(md).toContain('- Feature 1');
  });

  test('должен поддерживать стиль minimal (без эмодзи)', () => {
    const minimalOptions = {
      content: {
        style: 'minimal',
        sections: DEFAULT_SECTIONS
      }
    };
    const md = buildMarkdown(data, minimalOptions);
    expect(md).toContain('# Test Project');
    expect(md).not.toContain('🚀');
    expect(md).toContain('## Описание');
    expect(md).not.toContain('📝');
  });

  test('должен отключать разделы', () => {
    const disabledOptions = {
      content: {
        sections: DEFAULT_SECTIONS.map(s => s.id === 'license' ? { ...s, enabled: false } : s)
      }
    };
    const md = buildMarkdown(data, disabledOptions);
    expect(md).not.toContain('## 📄 Лицензия');
  });

  test('должен менять порядок разделов', () => {
    const reorderedOptions = {
      content: {
        style: 'minimal',
        sections: [
          { id: 'license', title: 'License', order: 1, enabled: true },
          { id: 'title', title: null, order: 2, enabled: true }
        ]
      }
    };
    const md = buildMarkdown(data, reorderedOptions);
    const licenseIdx = md.indexOf('## License');
    const titleIdx = md.indexOf('# Test Project');
    expect(licenseIdx).not.toBe(-1);
    expect(titleIdx).not.toBe(-1);
    expect(licenseIdx).toBeLessThan(titleIdx);
  });
});
