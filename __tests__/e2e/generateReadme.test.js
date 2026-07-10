const { generateReadme } = require('../../src/generator/readmeGenerator');
const axios = require('axios');

jest.mock('axios');

describe('E2E: generateReadme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockParams = {
    projectName: 'TestProject',
    tree: 'src/\n  index.js',
    flatFiles: new Set(['package.json', 'src/index.js']),
    manifests: [{ name: 'package.json', content: '{"name": "test"}' }],
    options: {
      ai: {
        enabled: false,
        apiUrl: 'http://localhost:11434/v1',
        apiKey: 'test',
        model: 'llama3',
        retryAttempts: 0, // Отключаем ретраи для E2E тестов, чтобы не ждать
      },
      content: { tone: 'technical', generationLanguage: 'ru' },
      answers: { license: 'MIT' }
    }
  };

  test('должен генерировать валидный локальный README без AI', async () => {
    const result = await generateReadme({
      ...mockParams,
      options: { ...mockParams.options, ai: { ...mockParams.options.ai, enabled: false } }
    });
    expect(result.markdown).toContain('# 🚀 TestProject');
    expect(result.markdown).toContain('## 🛠️ Стек технологий');
    expect(result.markdown).toContain('MIT');
  });

  test('должен генерировать README через AI (с моком)', async () => {
    const aiResponseJson = {
      title: 'AI Generated Project',
      description: 'Это описание создано искусственным интеллектом.',
      features: [
        { name: 'Умный поиск', description: 'Находит всё' },
        { name: 'Авто-магия', description: 'Работает само' }
      ],
      stack: {
        language: 'JavaScript',
        framework: 'Express',
        packageManager: 'npm'
      },
      quickStart: {
        requirements: ['Node.js'],
        installCommands: ['npm install'],
        runCommands: ['npm start']
      },
      projectStructure: 'src/index.js',
      license: 'Apache 2.0'
    };

    axios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: JSON.stringify(aiResponseJson)
          }
        }]
      }
    });

    const result = await generateReadme({
      ...mockParams,
      options: { ...mockParams.options, ai: { ...mockParams.options.ai, enabled: true } }
    });

    expect(result.markdown).toContain('🚀');
    expect(result.markdown).toContain('Описание');
    expect(result.markdown).toContain('Стек технологий');
    expect(result.markdown).toContain('Apache 2.0');
    expect(axios.post).toHaveBeenCalled();  });

  test('должен падать в локальный режим, если AI вернул ошибку', async () => {
    axios.post.mockRejectedValue(new Error('AI Service Down'));

    const result = await generateReadme({
      ...mockParams,
      options: { ...mockParams.options, ai: { ...mockParams.options.ai, enabled: true } }
    });

    // Должен вернуться локальный шаблон
    expect(result.markdown).toContain('# 🚀 TestProject');
    expect(result.markdown).toContain('## 🛠️ Стек технологий');
  });
});
