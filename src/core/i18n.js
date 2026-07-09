'use strict';

const fs = require('fs');
const path = require('path');

class I18n {
  constructor() {
    this.locale = 'ru';
    this.translations = {};
    this.localesPath = path.join(__dirname, '../locales');
  }

  /**
   * Инициализация языка
   * @param {string} lang - Код языка (ru, en)
   */
  init(lang) {
    this.locale = lang || 'ru';
    const filePath = path.join(this.localesPath, `${this.locale}.json`);
    
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.translations = JSON.parse(content);
      } else {
        // Fallback на русский
        const fallbackPath = path.join(this.localesPath, 'ru.json');
        if (fs.existsSync(fallbackPath)) {
          this.translations = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        }
      }
    } catch (err) {
      console.error(`[i18n] Failed to load locale ${this.locale}:`, err.message);
    }
  }

  /**
   * Получить перевод по ключу
   * @param {string} key - Ключ (например, 'cli.welcome')
   * @param {Object} params - Параметры для интерполяции
   */
  t(key, params = {}) {
    let value = key.split('.').reduce((obj, i) => (obj ? obj[i] : null), this.translations);

    if (!value) {
      return key;
    }

    // Интерполяция {{param}}
    let result = value;
    Object.keys(params).forEach(p => {
      result = result.replace(new RegExp(`{{${p}}}`, 'g'), params[p]);
    });

    return result;
  }
}

const i18n = new I18n();

module.exports = {
  i18n,
  t: (key, params) => i18n.t(key, params)
};
