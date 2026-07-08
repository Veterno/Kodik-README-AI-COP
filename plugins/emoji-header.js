/**
 * Пример плагина для Kodik README AI
 */
module.exports = {
  meta: {
    name: 'emoji-header',
    version: '1.0.0',
    description: 'Добавляет ракету в заголовок README'
  },

  /**
   * Хук после сборки Markdown
   * @param {import('../src/pluginManager').PluginContext} ctx
   */
  afterBuild(ctx) {
    if (ctx.markdown) {
      // Добавляем эмодзи к первому заголовку H1
      ctx.markdown = ctx.markdown.replace(/^# (.*)/m, '# 🚀 $1');
      console.log('[Plugin: Emoji] Добавлена ракета в заголовок');
    }
  },

  /**
   * Хук валидации
   */
  validate(ctx) {
    if (ctx.markdown && !ctx.markdown.includes('License')) {
      ctx.errors.push('Плагин Emoji: Секция License не найдена (рекомендуется добавить)');
    }
  }
};
