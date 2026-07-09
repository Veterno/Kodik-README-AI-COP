// src/commands/plugin.js
const InstallManager = require('../installManager');

exports.command = 'plugin <action> [name]';
exports.desc = 'Управление плагинами (search, install, uninstall, list, update)';
exports.builder = (yargs) => {
  return yargs
    .positional('action', {
      choices: ['search', 'install', 'uninstall', 'list', 'update'],
      describe: 'Действие'
    })
    .positional('name', {
      describe: 'Имя плагина',
      type: 'string'
    })
    .option('query', {
      alias: 'q',
      describe: 'Поисковый запрос'
    });
};

exports.handler = async (argv) => {
  const manager = new InstallManager();
  
  switch (argv.action) {
    case 'search':
      await manager.searchPlugins(argv.name || argv.query);
      break;
    case 'install':
      await manager.installPlugin(argv.name);
      break;
    case 'uninstall':
      await manager.uninstallPlugin(argv.name);
      break;
    case 'list':
      await manager.listPlugins();
      break;
    case 'update':
      await manager.updatePlugins(argv.name);
      break;
  }
};
