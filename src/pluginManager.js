'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

/**
 * PluginManager управляет жизненным циклом плагинов и выполнением хуков.
 */
class PluginManager {
  constructor(options = {}) {
    this.plugins = [];
    this.options = options;
    // Реестр хуков
    this.hooks = {
      beforeScan: [],
      afterScan: [],
      beforeGenerate: [],
      afterGenerate: [],
      beforeBuild: [],
      afterBuild: [],
      validate: []
    };
    
    // Общий контекст, который будет обогащаться в процессе
    this.context = {
      options: options,
      projectData: {},
      context: {},
      rawContent: '',
      markdown: '',
      errors: [],
      helpers: {
        log: (msg) => console.log(`[Plugin] ${msg}`),
        warn: (msg) => console.warn(`[Plugin] ⚠️ ${msg}`)
      }
    };

    this.globalPluginsPath = path.join(os.homedir(), '.kodik', 'plugins', 'node_modules');
  }

  /**
   * Динамическая загрузка плагинов
   */
  async load() {
    if (this.options.noPlugins) {
      return;
    }

    // Извлекаем список плагинов из опций (которые приходят из .kodikrc.json или CLI)
    const pluginList = Array.isArray(this.options.plugins) ? this.options.plugins : [];

    for (const pluginIdent of pluginList) {
      await this._tryImport(pluginIdent);
    }
  }

  async _tryImport(pluginPath) {
    try {
      let importPath;
      
      // 1. Проверяем, является ли это локальным путем
      if (pluginPath.startsWith('.') || path.isAbsolute(pluginPath)) {
        const absolutePath = path.resolve(process.cwd(), pluginPath);
        if (fs.existsSync(absolutePath)) {
          importPath = pathToFileURL(absolutePath).href;
        }
      } 
      
      // 2. Если не путь, пробуем найти как npm пакет в проекте или в глобальной папке
      if (!importPath) {
        try {
          // Пробуем локальный node_modules
          importPath = require.resolve(pluginPath, { paths: [process.cwd()] });
        } catch (e) {
          try {
            // Пробуем глобальную папку Kodik
            importPath = require.resolve(pluginPath, { paths: [this.globalPluginsPath] });
          } catch (e2) {
            // Игнорируем, если не нашли
          }
        }
      }

      if (!importPath) {
        console.error(`[PluginManager] Could not find plugin: ${pluginPath}`);
        return;
      }

      // Используем динамический import() для поддержки ESM плагинов
      const module = await import(pathToFileURL(importPath).href);
      const plugin = module.default || module;
      
      if (this._validatePlugin(plugin)) {
        this.plugins.push(plugin);
        this._registerHooks(plugin);
        if (this.options.debug) {
          console.log(`[PluginManager] Loaded: ${plugin.name || plugin.meta?.name} v${plugin.version || plugin.meta?.version}`);
        }
      }
    } catch (err) {
      console.error(`[PluginManager] Failed to load plugin from ${pluginPath}:`, err.message);
    }
  }

  _validatePlugin(plugin) {
    const name = plugin.name || plugin.meta?.name;
    const version = plugin.version || plugin.meta?.version;
    return plugin && name && version;
  }

  _registerHooks(plugin) {
    for (const hookName in this.hooks) {
      if (typeof plugin[hookName] === 'function') {
        this.hooks[hookName].push({
          name: plugin.name || plugin.meta?.name,
          fn: plugin[hookName].bind(plugin)
        });
      }
    }
  }

  /**
   * Выполнение хука
   * @param {string} hookName 
   * @param {Object} data - Новые данные для подмешивания в контекст
   */
  async runHook(hookName, data = {}) {
    if (data) {
      // Синхронизируем входящие данные с контекстом
      Object.assign(this.context, data);
    }

    if (!this.hooks[hookName] || this.hooks[hookName].length === 0) {
      return this.context;
    }

    for (const hook of this.hooks[hookName]) {
      try {
        await hook.fn(this.context);
      } catch (err) {
        console.error(`[PluginManager] Error in plugin "${hook.name}" during "${hookName}":`, err.message);
      }
    }

    return this.context;
  }
}

module.exports = { PluginManager };