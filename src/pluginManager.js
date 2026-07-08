'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

/**
 * @typedef {Object} PluginContext
 * @property {Object} options - Текущие опции запуска
 * @property {Object} projectData - Данные сканирования (tree, flatFiles, manifests)
 * @property {Object} context - Собранный контекст для AI
 * @property {string} rawContent - Ответ от AI
 * @property {string} markdown - Итоговый Markdown
 * @property {Array<string>} errors - Список ошибок валидации
 */

class PluginManager {
  constructor() {
    this.plugins = [];
    this.context = {
      options: {},
      projectData: {},
      context: {},
      rawContent: '',
      markdown: '',
      errors: []
    };
  }

  /**
   * Загрузка плагинов из разных источников
   * @param {Object} options - Опции приложения
   */
  async load(options) {
    const { 
      plugins = [], 
      localPluginsPath = './plugins',
      disabledPlugins = [] 
    } = options;

    this.context.options = options;

    // 1. Загрузка из npm-пакетов или по именам
    for (const name of plugins) {
      if (disabledPlugins.includes(name)) continue;
      await this._tryImport(name);
    }

    // 2. Загрузка из локальной папки
    const fullLocalPath = path.resolve(process.cwd(), localPluginsPath);
    if (fs.existsSync(fullLocalPath)) {
      const files = fs.readdirSync(fullLocalPath);
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.mjs')) {
          await this._tryImport(path.join(fullLocalPath, file));
        }
      }
    }

    // 3. Загрузка из ~/.kodik/plugins (опционально, можно добавить позже)
  }

  async _tryImport(pluginPath) {
    try {
      // Поддержка путей и имен пакетов
      const isPath = pluginPath.startsWith('.') || path.isAbsolute(pluginPath);
      const importPath = isPath
        ? pathToFileURL(path.resolve(pluginPath)).href
        : pluginPath;

      const module = await import(importPath);
      const plugin = module.default || module;
      
      if (this._validatePlugin(plugin)) {
        this.plugins.push(plugin);
        // console.log(`[PluginManager] Loaded plugin: ${plugin.meta.name}`);
      } else {
        console.warn(`[PluginManager] Invalid plugin structure at: ${pluginPath}`);
      }
    } catch (err) {
      console.error(`[PluginManager] Failed to load plugin: ${pluginPath}`, err.message);
    }
  }

  _validatePlugin(plugin) {
    return plugin && plugin.meta && plugin.meta.name && plugin.meta.version;
  }

  /**
   * Запуск хука для всех плагинов
   * @param {string} hookName - Имя хука
   * @param {Object} data - Данные для обновления контекста
   */
  async runHook(hookName, data = {}) {
    // Обновляем контекст перед запуском
    Object.assign(this.context, data);

    for (const plugin of this.plugins) {
      if (typeof plugin[hookName] === 'function') {
        try {
          await plugin[hookName](this.context);
        } catch (err) {
          console.error(`[PluginManager] Error in plugin ${plugin.meta.name} [${hookName}]:`, err.message);
        }
      }
    }
    return this.context;
  }
}

module.exports = { PluginManager };