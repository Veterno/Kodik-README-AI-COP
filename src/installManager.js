const path = require('path');
const fs = require('fs-extra');
const { execSync } = require('child_process');
const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const os = require('os');
const { log } = require('./core/logger');

class InstallManager {
  constructor() {
    this.kodikDir = path.join(os.homedir(), '.kodik');
    this.pluginsDir = path.join(this.kodikDir, 'plugins');
    this.templatesDir = path.join(this.kodikDir, 'templates');
    this.configFile = path.join(process.cwd(), '.kodikrc.json');
    
    fs.ensureDirSync(this.kodikDir);
    fs.ensureDirSync(this.pluginsDir);
    fs.ensureDirSync(this.templatesDir);
    
    // Инициализируем package.json в папке плагинов, если его нет
    const pkgPath = path.join(this.pluginsDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      fs.writeJsonSync(pkgPath, { name: 'kodik-plugins', version: '1.0.0' });
    }

    // Настройка axios с ретраями для менеджера установки
    this.httpClient = axios.create({
      timeout: 10000
    });

    axiosRetry(this.httpClient, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
               (error.response && error.response.status >= 500);
      }
    });
  }

  async searchPlugins(query = '') {
    log.info(`🔍 Поиск плагинов для "${query}"...`);
    try {
      const url = `https://registry.npmjs.org/-/v1/search?text=keywords:kodik-plugin+${query}`;
      const { data } = await this.httpClient.get(url);
      
      if (data.objects.length === 0) {
        log.info('Ничего не найдено.');
        return;
      }

      data.objects.forEach(pkg => {
        console.log(`\x1b[36m${pkg.package.name}\x1b[0m (v${pkg.package.version}) - ${pkg.package.description || 'Нет описания'}`);
      });
    } catch (error) {
      log.error(`Ошибка при поиске плагинов: ${error.message}`, error);
      throw error; // Перебрасываем, так как это действие пользователя, он должен знать об ошибке
    }
  }

  async installPlugin(name) {
    if (!name) {
      log.error('Необходимо указать имя плагина.');
      return;
    }

    log.info(`📦 Установка плагина ${name}...`);
    try {
      // Установка через npm в ~/.kodik/plugins
      execSync(`npm install ${name} --prefix "${this.pluginsDir}"`, { stdio: 'inherit' });
      
      // Обновляем локальный конфиг
      await this.updateConfig(name, 'add');
      log.ok(`Плагин ${name} успешно установлен и добавлен в .kodikrc.json`);
    } catch (error) {
      log.error(`Ошибка при установке: ${error.message}`);
    }
  }

  async uninstallPlugin(name) {
    if (!name) {
      log.error('Необходимо указать имя плагина.');
      return;
    }

    log.info(`🗑️ Удаление плагина ${name}...`);
    try {
      execSync(`npm uninstall ${name} --prefix "${this.pluginsDir}"`, { stdio: 'inherit' });
      await this.updateConfig(name, 'remove');
      log.ok(`Плагин ${name} удален.`);
    } catch (error) {
      log.error(`Ошибка при удалении: ${error.message}`);
    }
  }

  async listPlugins() {
    log.info('📋 Установленные плагины:');
    const pkgPath = path.join(this.pluginsDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = fs.readJsonSync(pkgPath);
      const deps = pkg.dependencies || {};
      Object.keys(deps).forEach(name => {
        console.log(`- ${name} (${deps[name]})`);
      });
    }

    // Также выводим локальные плагины из конфига
    if (fs.existsSync(this.configFile)) {
      const config = fs.readJsonSync(this.configFile);
      const localPlugins = (config.plugins || []).filter(p => p.startsWith('.') || path.isAbsolute(p));
      if (localPlugins.length > 0) {
        log.info('Локальные плагины проекта:');
        localPlugins.forEach(p => console.log(`- ${p}`));
      }
    }
  }

  async updatePlugins(name) {
    const target = name || '';
    log.info(`🆙 Обновление ${target || 'всех плагинов'}...`);
    try {
      execSync(`npm update ${target} --prefix "${this.pluginsDir}"`, { stdio: 'inherit' });
      log.ok('Обновление завершено.');
    } catch (error) {
      log.error(`Ошибка при обновлении: ${error.message}`);
    }
  }

  async searchTemplates(query = '') {
    log.info(`🔍 Поиск шаблонов для "${query}"...`);
    // На данный момент используем заглушку или GitHub API
    log.info('Поиск шаблонов временно доступен только через GitHub: https://github.com/kodik-ai/marketplace');
  }

  async getTemplate(name) {
    if (!name) {
      log.error('Необходимо указать имя шаблона.');
      return;
    }

    log.info(`📄 Получение шаблона ${name}...`);
    try {
      // Пример: скачивание с GitHub
      const url = `https://raw.githubusercontent.com/kodik-ai/marketplace/main/templates/${name}.md`;
      const { data } = await this.httpClient.get(url);
      
      const outputPath = path.join(process.cwd(), `${name}.md`);
      await fs.writeFile(outputPath, data);
      log.ok(`Шаблон сохранен в ${outputPath}`);
    } catch (error) {
      log.error(`Не удалось получить шаблон "${name}": ${error.message}`, error);
      throw error;
    }
  }

  async updateConfig(name, action) {
    let config = {};
    if (await fs.pathExists(this.configFile)) {
      config = await fs.readJson(this.configFile);
    }
    
    config.plugins = config.plugins || [];
    
    if (action === 'add' && !config.plugins.includes(name)) {
      config.plugins.push(name);
    } else if (action === 'remove') {
      config.plugins = config.plugins.filter(p => p !== name);
    }
    
    await fs.writeJson(this.configFile, config, { spaces: 2 });
  }
}

module.exports = InstallManager;
