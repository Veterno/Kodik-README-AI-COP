const { mergeStacks } = require('../../src/context/stack/detector');

describe('stackUtils: mergeStacks', () => {
  test('должен объединять несколько стеков', () => {
    const stacks = [
      {
        language: 'Node.js (TypeScript)',
        framework: 'Express',
        packageManager: 'npm',
        requirements: ['Node.js v18'],
        installCommands: ['npm install'],
        runCommands: ['npm start'],
        extras: ['TypeScript'],
        dockerSupported: true,
        dockerCommands: ['docker build -t node-app .']
      },
      {
        language: 'Python',
        framework: 'Django',
        packageManager: 'pip',
        requirements: ['Python 3.10'],
        installCommands: ['pip install -r requirements.txt'],
        runCommands: ['python manage.py runserver'],
        extras: ['PostgreSQL'],
        dockerSupported: false,
        dockerCommands: []
      }
    ];

    const merged = mergeStacks(stacks);

    expect(merged.language).toBe('Node.js (TypeScript), Python');
    expect(merged.framework).toBe('Express, Django');
    expect(merged.packageManager).toBe('npm, pip');
    expect(merged.requirements).toContain('Node.js v18');
    expect(merged.requirements).toContain('Python 3.10');
    expect(merged.installCommands).toContain('npm install');
    expect(merged.installCommands).toContain('pip install -r requirements.txt');
    expect(merged.extras).toContain('TypeScript');
    expect(merged.extras).toContain('PostgreSQL');
    expect(merged.dockerSupported).toBe(true);
    expect(merged.dockerCommands).toContain('docker build -t node-app .');
  });

  test('должен корректно обрабатывать пустой список', () => {
    expect(mergeStacks([])).toBeNull();
  });

  test('должен удалять дубликаты при объединении', () => {
    const stacks = [
      { language: 'JavaScript', requirements: ['Node.js'] },
      { language: 'JavaScript', requirements: ['Node.js', 'npm'] }
    ];
    const merged = mergeStacks(stacks);
    expect(merged.language).toBe('JavaScript');
    expect(merged.requirements).toEqual(['Node.js', 'npm']);
  });
});
