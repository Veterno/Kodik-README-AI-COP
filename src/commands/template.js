// src/commands/template.js
const InstallManager = require('../installManager');

exports.command = 'template <action> [name]';
exports.desc = 'Управление шаблонами (search, get)';
exports.builder = (yargs) => {
  return yargs
    .positional('action', {
      choices: ['search', 'get'],
      describe: 'Действие'
    })
    .positional('name', {
      describe: 'Имя шаблона',
      type: 'string'
    });
};

exports.handler = async (argv) => {
  const manager = new InstallManager();
  
  switch (argv.action) {
    case 'search':
      await manager.searchTemplates(argv.name);
      break;
    case 'get':
      await manager.getTemplate(argv.name);
      break;
  }
};
