'use strict';

const fs = require('fs');
const { DEFAULT_EMOJIS, DEFAULT_SECTIONS } = require('../../core/config');

/**
 * Собирает финальный Markdown из структурированных данных.
 */
function buildMarkdown(data, options = {}) {
  const contentOptions = options.content || {};
  
  if (contentOptions.templatePath) {
    return buildFromTemplate(data, contentOptions.templatePath);
  }

  const parts = [];
  const style = contentOptions.style || 'modern';
  const emojis = style === 'minimal' ? {} : (contentOptions.emojis || DEFAULT_EMOJIS);
  const sections = (contentOptions.sections && contentOptions.sections.length > 0) ? contentOptions.sections : DEFAULT_SECTIONS;

  sections.forEach(section => {
    if (!section.enabled) return;

    const sectionContent = buildSection(section.id, data, section, emojis);
    if (sectionContent) {
      parts.push(sectionContent);
      parts.push('');
    }
  });

  return parts.join('\n').trim();
}

function buildSection(id, data, section, emojis) {
  const emoji = emojis[id] ? `${emojis[id]} ` : '';
  const titlePrefix = section.title ? `## ${emoji}${section.title}\n\n` : '';

  switch (id) {
    case 'title':
      const titleEmoji = emojis.title ? `${emojis.title} ` : '';
      return `# ${titleEmoji}${data.title || 'Project'}`;

    case 'description':
      if (!data.description) return null;
      return `${titlePrefix}${data.description}`;

    case 'features':
      if (!data.features || !data.features.length) return null;
      const featuresList = data.features.map(f => {
        if (f && typeof f === 'object') {
          const name = f.name || '';
          const desc = f.description ? ` — ${f.description}` : '';
          return name ? `- **${name}**${desc}` : null;
        } else if (f) {
          return `- ${f}`;
        }
        return null;
      }).filter(Boolean).join('\n');
      return `${titlePrefix}${featuresList}`;

    case 'stack':
      if (!data.stack || typeof data.stack !== 'object') return null;
      const s = data.stack;
      const stackParts = [];
      if (s.language) stackParts.push(`- **Язык:** ${s.language}`);
      if (s.framework) stackParts.push(`- **Фреймворк:** ${s.framework}`);
      if (s.packageManager) stackParts.push(`- **Пакетный менеджер:** ${s.packageManager}`);
      if (s.extras && Array.isArray(s.extras) && s.extras.length) {
        stackParts.push(`- **Дополнительно:** ${s.extras.join(', ')}`);
      }
      return stackParts.length ? `${titlePrefix}${stackParts.join('\n')}` : null;

    case 'quickStart':
      if (!data.quickStart || typeof data.quickStart !== 'object') return null;
      const qs = data.quickStart;
      const qsParts = [];

      if (qs.requirements && Array.isArray(qs.requirements) && qs.requirements.length) {
        qsParts.push('### Требования\n');
        qs.requirements.forEach(req => qsParts.push(`- ${req}`));
        qsParts.push('');
      }

      if ((qs.installCommands && qs.installCommands.length) || (qs.runCommands && qs.runCommands.length)) {
        qsParts.push('### Установка и запуск\n');
        qsParts.push('```bash');
        if (qs.installCommands && qs.installCommands.length) {
          qsParts.push('# Установка зависимостей');
          qs.installCommands.forEach(cmd => qsParts.push(cmd));
          qsParts.push('');
        }
        if (qs.runCommands && qs.runCommands.length) {
          qsParts.push('# Запуск');
          qs.runCommands.forEach(cmd => qsParts.push(cmd));
        }
        qsParts.push('```\n');
      }

      if (qs.dockerCommands && qs.dockerCommands.length) {
        qsParts.push('### Запуск через Docker\n');
        qsParts.push('```bash');
        qs.dockerCommands.forEach(cmd => qsParts.push(cmd));
        qsParts.push('```');
      }
      return qsParts.length ? `${titlePrefix}${qsParts.join('\n').trim()}` : null;

    case 'projectStructure':
      if (!data.projectStructure) return null;
      const structure = String(data.projectStructure);
      const formattedStructure = structure.startsWith('```') ? structure : `\`\`\`\n${structure}\n\`\`\``;
      return `${titlePrefix}${formattedStructure}`;

    case 'license':
      if (!data.license) return null;
      return `${titlePrefix}${data.license}`;

    default:
      return null;
  }
}

function buildFromTemplate(data, templatePath) {
  try {
    let template = fs.readFileSync(templatePath, 'utf8');
    
    const variables = {
      title: data.title || '',
      description: data.description || '',
      features: buildSection('features', data, { title: null }, {}),
      stack: buildSection('stack', data, { title: null }, {}),
      quickStart: buildSection('quickStart', data, { title: null }, {}),
      projectStructure: buildSection('projectStructure', data, { title: null }, {}),
      license: data.license || '',
    };

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  } catch (err) {
    throw new Error(`Не удалось прочитать шаблон: ${err.message}`);
  }
}


module.exports = { buildMarkdown };
