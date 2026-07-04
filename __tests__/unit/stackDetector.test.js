const { detectStack, formatStackHints } = require('../../src/stackDetector');

describe('stackDetector: detectStack', () => {
  test('должен определять Node.js (JavaScript) из package.json', () => {
    const manifest = {
      name: 'package.json',
      content: JSON.stringify({
        name: 'test-app',
        dependencies: { express: '^4.18.2' },
        scripts: { start: 'node index.js' }
      })
    };
    const flatFiles = new Set(['package.json']);
    const stack = detectStack(manifest, flatFiles);

    expect(stack.language).toBe('Node.js (JavaScript)');
    expect(stack.framework).toBe('Express');
    expect(stack.packageManager).toBe('npm');
    expect(stack.runCommands).toContain('npm start');
  });

  test('должен определять TypeScript и pnpm', () => {
    const manifest = {
      name: 'package.json',
      content: JSON.stringify({
        devDependencies: { typescript: '^5.0.0' }
      })
    };
    const flatFiles = new Set(['package.json', 'pnpm-lock.yaml']);
    const stack = detectStack(manifest, flatFiles);

    expect(stack.language).toBe('Node.js (TypeScript)');
    expect(stack.packageManager).toBe('pnpm');
    expect(stack.installCommands).toContain('pnpm install');
  });

  test('должен определять Python (Django) из requirements.txt', () => {
    const manifest = {
      name: 'requirements.txt',
      content: 'Django==4.2\nrequests'
    };
    const flatFiles = new Set(['requirements.txt']);
    const stack = detectStack(manifest, flatFiles);

    expect(stack.language).toBe('Python');
    expect(stack.framework).toBe('Django');
    expect(stack.runCommands).toContain('python manage.py runserver');
  });

  test('должен определять Rust из Cargo.toml', () => {
    const manifest = {
      name: 'Cargo.toml',
      content: '[package]\nname = "hello"\n[dependencies]\nactix-web = "4"'
    };
    const flatFiles = new Set(['Cargo.toml']);
    const stack = detectStack(manifest, flatFiles);

    expect(stack.language).toBe('Rust');
    expect(stack.framework).toBe('actix-web');
  });

  test('должен определять Go из go.mod', () => {
    const manifest = {
      name: 'go.mod',
      content: 'module test\ngo 1.21\nrequire github.com/gin-gonic/gin v1.9.1'
    };
    const flatFiles = new Set(['go.mod']);
    const stack = detectStack(manifest, flatFiles);

    expect(stack.language).toBe('Go');
    expect(stack.framework).toBe('gin');
  });

  test('должен определять Docker поддержку', () => {
    const flatFiles = new Set(['index.js', 'docker-compose.yml', 'Dockerfile']);
    const stack = detectStack(null, flatFiles);

    expect(stack.dockerSupported).toBe(true);
    expect(stack.dockerCommands).toContain('docker compose up --build');
    expect(stack.dockerCommands).toContain('docker build -t my-app .');
  });

  test('должен определять язык по расширениям, если манифест отсутствует', () => {
    const flatFiles = new Set(['main.py', 'utils.py']);
    const stack = detectStack(null, flatFiles);

    expect(stack.language).toBe('Python');
    expect(stack.runCommands).toContain('python main.py');
  });

  test('должен возвращать пустой стек для неизвестных проектов', () => {
    const stack = detectStack(null, new Set(['unknown.xyz']));
    expect(stack.language).toBeNull();
  });

  test('должен определять Bun', () => {
    const manifest = {
      name: 'package.json',
      content: JSON.stringify({ scripts: { start: 'npm run dev' } })
    };
    const flatFiles = new Set(['package.json', 'bun.lockb']);
    const stack = detectStack(manifest, flatFiles);

    expect(stack.packageManager).toBe('bun');
    expect(stack.installCommands).toContain('bun install');
    expect(stack.runCommands).toContain('bun start');
  });

  test('formatStackHints должен форматировать подсказки', () => {
    const stack = {
      language: 'Node.js',
      framework: 'Express',
      packageManager: 'npm',
      requirements: ['Node.js >= 18'],
      installCommands: ['npm install'],
      runCommands: ['npm start'],
      dockerSupported: true,
      dockerCommands: ['docker compose up']
    };
    const hints = formatStackHints(stack);
    expect(hints).toContain('### Определённый стек проекта');
    expect(hints).toContain('- Язык: Node.js');
    expect(hints).toContain('- Фреймворк: Express');
    expect(hints).toContain('### Команды установки');
    expect(hints).toContain('npm install');
    expect(hints).toContain('### Альтернативный запуск через Docker');
  });

  test('formatStackHints должен обрабатывать пустой стек', () => {
    const stack = {
      language: null,
      framework: null,
      packageManager: null
    };
    const hints = formatStackHints(stack);
    expect(hints).toContain('Стек не удалось определить автоматически');
  });

  test('должен определять Java (Maven) и Spring Boot', () => {
    const manifest = {
      name: 'pom.xml',
      content: '<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter</artifactId></dependency>'
    };
    const stack = detectStack(manifest, new Set(['pom.xml']));

    expect(stack.language).toBe('Java');
    expect(stack.framework).toBe('Spring Boot');
    expect(stack.packageManager).toBe('maven');
    expect(stack.runCommands).toContain('mvn spring-boot:run');
  });

  test('должен определять Java/Kotlin (Gradle)', () => {
    const manifest = {
      name: 'build.gradle',
      content: 'plugins { id "org.springframework.boot" version "3.1.0" }'
    };
    const stack = detectStack(manifest, new Set(['build.gradle']));

    expect(stack.language).toBe('Java/Kotlin');
    expect(stack.packageManager).toBe('gradle');
    expect(stack.installCommands).toContain('./gradlew build');
  });

  test('должен определять PHP (Composer) и Laravel', () => {
    const manifest = {
      name: 'composer.json',
      content: JSON.stringify({
        require: { 'laravel/framework': '^10.0' }
      })
    };
    const stack = detectStack(manifest, new Set(['composer.json']));

    expect(stack.language).toBe('PHP');
    expect(stack.framework).toBe('Laravel');
    expect(stack.runCommands).toContain('php artisan serve');
  });

  test('должен определять C# по расширению файла', () => {
    const flatFiles = new Set(['Program.cs', 'App.config']);
    const stack = detectStack(null, flatFiles);

    expect(stack.language).toBe('C#');
    expect(stack.framework).toBe('.NET');
    expect(stack.installCommands).toContain('dotnet restore');
  });

  test('должен определять PHP по расширению файла', () => {
    const flatFiles = new Set(['index.php']);
    const stack = detectStack(null, flatFiles);

    expect(stack.language).toBe('PHP');
    expect(stack.runCommands).toContain('php -S localhost:8000');
  });
});
