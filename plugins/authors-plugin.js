/**
 * Плагин для добавления раздела с авторами в конец README.md
 */
export default {
  name: 'kodik-authors-plugin',
  version: '1.0.0',
  
  async afterBuild(context) {
    const { projectData, markdown } = context;
    const manifests = projectData?.manifests || [];
    
    // Ищем package.json
    const pkg = manifests.find(m => m.name === 'package.json');
    let authorName = 'Kodik AI';

    if (pkg) {
      try {
        const pkgData = JSON.parse(pkg.content.replace(/\n\.\.\. \(файл обрезан\)$/, ''));
        if (pkgData.author) {
          authorName = typeof pkgData.author === 'string' ? pkgData.author : pkgData.author.name;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }

    context.markdown += `\n\n## 👥 Авторы\n\n- **${authorName}** — генерация документации через [Kodik README AI](https://github.com/vibekodik/kodik-readme-ai)\n`;
    
    context.helpers.log('Добавлен раздел "Авторы"');
  }
};
