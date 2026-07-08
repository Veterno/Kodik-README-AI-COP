'use strict';

const fs = require('fs');
const path = require('path');
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
  }

  /**
   * Динамическая загрузка плагинов
   */
  async load() {
    if (this.options.noPlugins) {
      return;
    }

    const { 
      paths = [], 
      npmPackages = [] 
    } = this.options.plugins || {};

    // 1. Загрузка из локальных путей
    for (const p of paths) {
      const absolutePath = path.resolve(process.cwd(), p);
      await this._tryImport(absolutePath);
    }

    // 2. Загрузка из npm-пакетов
    for (const pkgName of npmPackages) {
      await this._tryImport(pkgName);
    }
  }

  async _tryImport(pluginPath) {
    try {
      const isPath = fs.existsSync(pluginPath);
      const importPath = isPath
        ? pathToFileURL(pluginPath).href
        : pluginPath;

      // Используем динамический import() для поддержки ESM плагинов
      const module = await import(importPath);
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