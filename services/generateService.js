'use strict';

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AdmZip = require('adm-zip');
const simpleGit = require('simple-git');
const { rimraf } = require('rimraf');

/**
 * Нормализует GitHub URL в формат, пригодный для git clone.
 * Преобразует веб-URL страниц репозитория (с query-параметрами, /tree/, /blob/ и т.д.)
 * в чистый URL для клонирования.
 * Примеры:
 *   https://github.com/user/repo?tab=readme-ov-file → https://github.com/user/repo.git
 *   https://github.com/user/repo/tree/main/src      → https://github.com/user/repo.git
 */
function normalizeGitHubUrl(url) {
  if (!url) return url;
  // Удаляем query-параметры и хэш
  let clean = url.split('?')[0].split('#')[0];
  // Удаляем трейлинг-слэш
  clean = clean.replace(/\/$/, '');
  // Если URL содержит /tree/, /blob/, /releases/ и т.п. — обрезаем до user/repo
  const match = clean.match(/^(https?:\/\/github\.com\/[^\/]+\/[^\/]+)/);
  if (match) {
    clean = match[1];
  }
  // Добавляем .git если ещё нет
  if (!clean.endsWith('.git')) {
    clean += '.git';
  }
  return clean;
}

// Импортируем существующие модули из src
const { scanProject } = require('../src/scanner/projectScanner');
const { findMainFile } = require('../src/scanner/entryDetector');
const { collectBusinessContext } = require('../src/context/contextCollector');
const { generateReadme } = require('../src/generator/readmeGenerator');
const { finalScan } = require('../src/output/processors/finalScanner');
const { resolveOptions } = require('../src/interfaces/cli/options');

/**
 * Сервис для управления процессом генерации README через веб-интерфейс.
 */
class GenerateService {
  constructor() {
    this.tempBaseDir = path.join(process.cwd(), 'temp_projects');
    if (!fs.existsSync(this.tempBaseDir)) {
      fs.mkdirSync(this.tempBaseDir, { recursive: true });
    }
  }

  /**
   * Основной метод генерации.
   * @param {Object} params Параметры из формы
   * @param {Function} onProgress Коллбэк для отправки статуса прогресса
   */
  async generate(params, onProgress) {
    const { 
      githubUrl, 
      zipFile, 
      language = 'ru', 
      tone = 'technical', 
      useAi = false, 
      apiKey = '' 
    } = params;

    const sessionId = uuidv4();
    const projectDir = path.join(this.tempBaseDir, sessionId);
    
    try {
      onProgress({ step: 'init', message: 'Preparing temporary folder...' });
      fs.mkdirSync(projectDir, { recursive: true });

      // 1. Get source code
      if (githubUrl) {
        const normalizedUrl = normalizeGitHubUrl(githubUrl);
        onProgress({ step: 'download', message: `Cloning repository: ${normalizedUrl}...` });
        await simpleGit().clone(normalizedUrl, projectDir, ['--depth', '1']);
      } else if (zipFile) {
        onProgress({ step: 'download', message: 'Extracting archive...' });
        const zip = new AdmZip(zipFile.path);
        zip.extractAllTo(projectDir, true);
      } else {
        throw new Error('Project source not provided (GitHub or ZIP)');
      }

      // 2. Configure options
      const mockArgv = {
        _: [projectDir], // Позиционный аргумент для yargs
        target: projectDir,
        ai: useAi === 'true' || useAi === true,
        'api-key': apiKey,
        tone: tone,
        language: language,
        'non-interactive': true,
        output: projectDir
      };
      
      const options = resolveOptions(mockArgv);
      options.content.targetLanguage = language;
      options.content.generationLanguage = language;
      if (apiKey) {
        options.ai.apiKey = apiKey;
        options.ai.enabled = true;
      }

      // 3. Scanning
      onProgress({ step: 'scan', message: 'Scanning project structure...' });
      const scanResult = scanProject(projectDir, options.scanner);
      const { tree, flatFiles, manifests, detectedLicense, docs, codeContext } = scanResult;

      // Project name detection
      let projectName = 'project';
      if (githubUrl) {
        projectName = path.basename(githubUrl).replace('.git', '');
      } else if (zipFile) {
        projectName = zipFile.originalname.replace('.zip', '').replace('.tar.gz', '');
      }
      
      const rootPkg = manifests.find(m => m.name === 'package.json');
      if (rootPkg) {
        try {
          const pkgData = JSON.parse(rootPkg.content.replace(/\n\.\.\. \(файл обрезан\)$/, ''));
          if (pkgData.name) projectName = pkgData.name;
        } catch (e) {}
      }

      // 4. Find main file
      onProgress({ step: 'analyze', message: 'Analyzing project and gathering context...' });
      const mainManifest = manifests && manifests.length > 0 ? manifests[0] : null;
      const mainFile = findMainFile(projectDir, mainManifest, flatFiles);

      // 5. Collect context
      const businessContext = collectBusinessContext(projectDir, docs);

      // 6. Generation
      onProgress({ step: 'generate', message: 'Generating README content...' });
      const genResult = await generateReadme({
        projectName,
        tree,
        flatFiles, // Передаем оригинальный Set
        manifests,
        mainFile,
        interactiveAnswers: { tone, language, license: detectedLicense },
        businessContext,
        codeContext,
        detectedLicense,
        options
      });

      let markdown = genResult.markdown;

      // 7. Final processing
      if (options.ai.enabled && !options.content.noTranslate) {
        onProgress({ step: 'translate', message: `Final processing and translation (${language})...` });
        markdown = await finalScan(markdown, options);
      }

      onProgress({ step: 'done', message: 'README successfully generated!', result: markdown });
      return markdown;

    } catch (error) {
      onProgress({ step: 'error', message: `Error: ${error.message}` });
      throw error;
    } finally {
      // Очистка временных файлов через 5 минут
      setTimeout(() => {
        rimraf(projectDir).catch(err => console.error(`Ошибка при удалении ${projectDir}:`, err));
        if (zipFile && fs.existsSync(zipFile.path)) {
          fs.unlinkSync(zipFile.path);
        }
      }, 300000);
    }
  }
}

module.exports = new GenerateService();
