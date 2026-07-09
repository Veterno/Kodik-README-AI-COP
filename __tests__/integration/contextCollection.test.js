'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { scanProject } = require('../../src/scanner/projectScanner');
const { detectStack } = require('../../src/context/stack/detector');
const { findMainFile } = require('../../src/scanner/entryDetector');const { collectBusinessContext } = require('../../src/context/contextCollector');
const { collectCodeContext } = require('../../src/context/contextCollector');

describe('Context Collection Integration', () => {
  let tempDir;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-integration-test-'));
    
    // Create a mock project structure
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      main: 'src/main.js',
      dependencies: { express: '^4.17.1' }
    }));

    fs.mkdirSync(path.join(tempDir, 'src'));
    fs.writeFileSync(path.join(tempDir, 'src', 'main.js'), `
      /**
       * Main entry point
       */
      function startServer() {
        console.log("Server started");
      }
      export { startServer };
    `);

    fs.writeFileSync(path.join(tempDir, 'FEATURES.md'), '# Features\n- Feature A\n- Feature B');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should collect full context from a project structure', async () => {
    // 1. Scan
    const { tree, flatFiles, manifests, docs } = await scanProject(tempDir);
    
    expect(flatFiles.has('package.json')).toBe(true);
    expect(flatFiles.has('src/main.js')).toBe(true);
    expect(docs.length).toBeGreaterThan(0);

    // 2. Detect Stack
    const manifest = manifests.find(m => m.name === 'package.json');
    const stack = detectStack(manifest, flatFiles);
    
    expect(stack.language).toBe('Node.js (JavaScript)');
    expect(stack.framework).toBe('Express');

    // 3. Find Main File
    const mainFile = findMainFile(tempDir, manifest, flatFiles);
    
    expect(mainFile.name).toBe('src/main.js');
    expect(mainFile.content).toContain('Main entry point');

    // 4. Collect Business Context
    const businessContext = collectBusinessContext(tempDir, docs);
    
    expect(businessContext.docs['FEATURES.md']).toContain('Feature A');

    // 5. Collect Code Context
    const codeContext = collectCodeContext(tempDir, flatFiles, mainFile);
    
    expect(codeContext).toContain('--- Файл: src/main.js ---');
    expect(codeContext).toContain('function startServer()');
  });
});
