'use strict';

const config = require('../../src/core/config');

describe('Config Module', () => {
  test('should export necessary constants', () => {
    expect(config.IGNORED_DIRS).toBeInstanceOf(Set);
    expect(config.IGNORED_FILES).toBeInstanceOf(Set);
    expect(Array.isArray(config.MANIFEST_FILES)).toBe(true);
    expect(Array.isArray(config.LICENSE_FILES)).toBe(true);
    expect(Array.isArray(config.MAIN_FILE_CANDIDATES)).toBe(true);
    expect(config.DOCS_FILES).toBeInstanceOf(Set);
    expect(Array.isArray(config.SENSITIVE_PATTERNS)).toBe(true);
  });

  test('should have numeric limits', () => {
    expect(typeof config.MAX_MAIN_FILE_LINES).toBe('number');
    expect(typeof config.MAX_TREE_DEPTH).toBe('number');
    expect(typeof config.MAX_TREE_ENTRIES).toBe('number');
    expect(typeof config.MAX_MANIFEST_BYTES).toBe('number');
    expect(typeof config.MAX_FILES_PER_DIR).toBe('number');
  });

  test('should have AI_CONFIG with correct structure', () => {
    expect(config.AI_CONFIG).toBeDefined();
    expect(typeof config.AI_CONFIG.RETRY_ATTEMPTS).toBe('number');
    expect(typeof config.AI_CONFIG.TIMEOUT).toBe('number');
    expect(typeof config.AI_CONFIG.USE_RESPONSE_FORMAT).toBe('boolean');
  });

  test('should have DEFAULT_ANSWERS', () => {
    expect(config.DEFAULT_ANSWERS).toBeDefined();
    expect(config.DEFAULT_ANSWERS.audience).toBe('developers');
    expect(config.DEFAULT_ANSWERS.license).toBe('MIT');
  });

  test('should have TRANSLATION_CONFIG', () => {
    expect(config.TRANSLATION_CONFIG).toBeDefined();
    expect(typeof config.TRANSLATION_CONFIG.ENABLED).toBe('boolean');
    expect(Array.isArray(config.TRANSLATION_CONFIG.SECTIONS)).toBe(true);
  });
});
