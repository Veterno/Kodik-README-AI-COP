# 🚀 kodik-readme-ai

## 📝 Описание

**kodik-readme-ai** — это микросервис на **Node.js (JavaScript), Node.js (TypeScript), Rust** с использованием **axum, Express**. Бизнес-ценность: Инструмент для автоматической генерации файла `README.md` для любого программного проекта. Он анализирует содержимое репозитория (структуру, манифесты, код, Git-логи) и создаёт качественную документацию, используя либо встроенную локальную логику, либо большие языковые модели (LLM) через OpenAI-совместимые API.. Проект ориентирован на разработчиков. 🚀 Express 📝 Описание ✨ Ключевые возможности Code of Conduct Он предоставляет REST API и управление через CLI. Ключевые компоненты: path, AdmZip, simpleGit.

## ✨ Ключевые возможности

- ✨ Автоматическое сканирование проекта
- ✨ Генерация README в двух режимах локальный и по ключу
- ✨ Интерактивный опрос
- ✨ Перевод разделов
- ✨ Валидация и исправление
- ✨ Плагины
- ✨ Веб-интерфейс
- ✨ CLI-интерфейс
- ✨ Бенчмаркинг
- 🔧 Функция/Компонент: path
- 🔧 Функция/Компонент: AdmZip
- 🔧 Функция/Компонент: simpleGit
- 🔧 Функция/Компонент: GenerateService
- 🔧 Функция/Компонент: projectDir

## 🛠️ Стек технологий

- **Язык:** Node.js (JavaScript), Node.js (TypeScript), Rust
- **Фреймворк:** axum, Express
- **Пакетный менеджер:** npm, cargo
- **Дополнительно:** ESLint, Testing, TypeScript

## 📦 Быстрый старт

### Требования

- Node.js v18 или новее
- npm (входит в состав Node.js)
- Rust toolchain (rustup, cargo)

### Установка и запуск

```bash
# Установка зависимостей
npm install
cargo build

# Запуск
node index.js
node fastify.js
cargo run
npm start
```

## 📂 Структура проекта

```
Kodik-README-AI-COP/
├── __tests__/
│   ├── e2e/
│   │   └── generateReadme.test.js
│   ├── fixtures/
│   ├── integration/
│   │   ├── contextCollection.test.js
│   │   ├── index.test.js
│   │   ├── saveReadme.test.js
│   │   └── scanner.test.js
│   ├── unit/ (17 элементов)
│   │   ├── aiClient.test.js
│   │   ├── config.test.js
│   │   ├── contextCollector.test.js
│   │   ├── edgeCases.test.js
│   │   ├── finalScanner.test.js
│   │   ├── generateReadme.edge.test.js
│   │   ├── interactive.test.js
│   │   ├── jsonParser.test.js
│   │   ├── logger.test.js
│   │   ├── manifest.test.js
│   │   ├── markdownBuilder.test.js
│   │   ├── options.test.js
│   │   ├── pathUtils.test.js
│   │   ├── sensitive.test.js
│   │   ├── stackDetector.test.js
│   │   ├── stackUtils.test.js
│   │   └── validator.test.js
│   └── localValidator.test.js
├── .benchmark-temp/
│   ├── express/ (15 элементов)
│   │   ├── examples/ (26 элементов)
│   │   ├── lib/ (6 элементов)
│   │   ├── test/ (73 элементов)
│   │   ├── .editorconfig
│   │   ├── .eslintignore
│   │   ├── .eslintrc.yml
│   │   ├── .gitignore
│   │   ├── .npmrc
│   │   ├── History.md
│   │   ├── index.js
│   │   ├── LICENSE
│   │   ├── package.json
│   │   ├── README.backup.2026-07-07T12-06-36-208Z.md
│   │   ├── README.backup.2026-07-08T19-04-03-092Z.md
│   │   ├── README.backup.2026-07-08T19-07-48-927Z.md
│   │   └── Readme.md
│   ├── fastify/ (28 элементов)
│   │   ├── docs/
│   │   ├── examples/ (14 элементов)
│   │   ├── integration/
│   │   ├── lib/ (32 элементов)
│   │   ├── scripts/
│   │   ├── test/ (143 элементов)
│   │   ├── types/ (15 элементов)
│   │   ├── .borp.yaml
│   │   ├── .editorconfig
│   │   ├── .gitattributes
│   │   ├── .gitignore
│   │   ├── .gitpod.yml
│   │   ├── .markdownlint-cli2.yaml
│   │   ├── .npmignore
│   │   ├── .npmrc
│   │   ├── .prettierignore
│   │   ├── CODE_OF_CONDUCT.md
│   │   ├── CONTRIBUTING.md
│   │   ├── eslint.config.js
│   │   ├── EXPENSE_POLICY.md
│   │   ├── fastify.d.ts
│   │   ├── fastify.js
│   │   ├── GOVERNANCE.md
│   │   ├── LICENSE
│   │   ├── package.json
│   │   ├── PROJECT_CHARTER.md
│   │   ├── README.backup.2026-07-08T19-04-35-683Z.md
│   │   ├── README.backup.2026-07-08T19-08-11-996Z.md
│   │   ├── README.md
│   │   ├── SECURITY.md
│   │   └── SPONSORS.md
│   ├── hono/ (24 элементов)
│   │   ├── benchmarks/ (9 элементов)
│   │   ├── docs/
│   │   ├── perf-measures/
│   │   ├── runtime-tests/ (8 элементов)
│   │   ├── src/ (25 элементов)
│   │   ├── .editorconfig
│   │   ├── .gitignore
│   │   ├── .prettierrc
│   │   ├── .tool-versions
│   │   ├── bun.lock
│   │   ├── bunfig.toml
│   │   ├── codecov.yml
│   │   ├── eslint.config.mjs
│   │   ├── jsr.json
│   │   ├── LICENSE
│   │   ├── package.cjs.json
│   │   ├── package.json
│   │   ├── README.backup.2026-07-08T19-04-44-483Z.md
│   │   ├── README.backup.2026-07-08T19-08-20-161Z.md
│   │   ├── README.md
│   │   ├── tsconfig.base.json
│   │   ├── tsconfig.build.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.spec.json
│   │   └── vitest.config.ts
│   ├── lucia/ (10 элементов)
│   │   ├── pages/ (6 элементов)
│   │   ├── .gitignore
│   │   ├── .prettierignore
│   │   ├── .prettierrc.json
│   │   ├── LICENSE-0BSD
│   │   ├── LICENSE-MIT
│   │   ├── malta.config.json
│   │   ├── package.json
│   │   ├── README.backup.2026-07-08T19-04-08-540Z.md
│   │   ├── README.backup.2026-07-08T19-07-53-775Z.md
│   │   └── README.md
│   └── pnpm/ (45 элементов)
│       ├── __patches__/
│       ├── .agents/
│       ├── .cargo/
│       ├── .changeset/ (6 элементов)
│       ├── .changeset-released/
│       ├── .devcontainer/
│       ├── .husky/ (6 элементов)
│       ├── .meta-updater/ (6 элементов)
│       ├── docker/
│       ├── pacquet/ (12 элементов)
│       ├── pnpm11/ (41 элементов)
│       ├── pnpr/ (8 элементов)
│       ├── shell/
│       ├── .coderabbit.yaml
│       ├── .editorconfig
│       ├── .gitattributes
│       ├── .gitignore
│       ├── .pnpmfile.cjs
│       ├── .pr_agent.toml
│       ├── .taplo.toml
│       ├── .typos.toml
│       ├── AGENTS.md
│       ├── Cargo.lock
│       ├── Cargo.toml
│       ├── CLAUDE.md
│       ├── CODE_OF_CONDUCT.md
│       ├── commitlint.config.cjs
│       ├── CONTRIBUTING.md
│       ├── cspell.json
│       ├── deny.toml
│       ├── dylint.toml
│       ├── eslint.config.mjs
│       ├── FUNDING.json
│       ├── justfile
│       ├── LICENSE
│       ├── package.json
│       ├── pnpm-lock.yaml
│       ├── pnpm-workspace.yaml
│       ├── README.backup.2026-07-08T19-04-19-102Z.md
│       ├── README.backup.2026-07-08T19-08-01-825Z.md
│       ├── README.md
│       ├── renovate.json
│       ├── REVIEW_GUIDE.md
│       ├── rust-toolchain.toml
│       ├── rustfmt.toml
│       ├── SECURITY.md
│       └── tsconfig.lint.json
├── .kodik/
│   └── debug/
│       ├── dbg-FR18J7MZ441S.ndjson
│       └── dbg-T57JXVAC3XC3.ndjson
├── ии/
│   ├── ии/ (32 элементов)
│   │   ├── kodik_ai_benchmarking_system_and_jest_tests.md
│   │   ├── kodik_architecting_kodik_readme_ai_plugin_system.md
│   │   ├── kodik_benchmark_js.md
│   │   ├── kodik_configuring_cli_parameters_via_environment_variables.md
│   │   ├── kodik_enhancing_readme_validation_and_auto_fix_features.md
│   │   ├── kodik_final_readme_scanner_for_russian_translation.md
│   │   ├── kodik_fixing_api_key_and_manifest_detection.md
│   │   ├── kodik_fixing_code_paths_syntax_error_in_codecontext.md
│   │   ├── kodik_fixing_duplicate_identifier_syntax_error.md
│   │   ├── kodik_fixing_kodik_readme_ai_generation_errors.md
│   │   ├── kodik_fixing_readme_generator_and_language_logic.md
│   │   ├── kodik_fixing_unhandled_promise_rejection_in_readme_ai.md
│   │   ├── kodik_generatereadme_node_js_cli.md
│   │   ├── kodik_implementing_file_logging_for_node_js_cli.md
│   │   ├── kodik_integrating_plugin_and_template_marketplace_commands.md
│   │   ├── kodik_kodik_readme_ai_plugin_system_design.md
│   │   ├── kodik_kodik_readme_ai.md
│   │   ├── kodik_modular_refactoring_and_enhanced_error_handling.md
│   │   ├── kodik_node_cli_readme_generator_test_implementation.md
│   │   ├── kodik_ollama.md
│   │   ├── kodik_readme_1.md
│   │   ├── kodik_readme.md
│   │   ├── kodik_redesigning_kodik_readme_ai_interface.md
│   │   ├── kodik_refactoring_ai_client_for_multiple_providers.md
│   │   ├── kodik_refactoring_cli_argument_parsing_and_configuration.md
│   │   ├── kodik_refactoring_finalscanner_for_configurable_readme_translation.md
│   │   ├── kodik_refactoring_readme_generator_and_dead_code.md
│   │   ├── kodik_securing_nodejs_paths_against_traversal_vulnerabilities.md
│   │   ├── kodik_standardizing_node_js_error_handling_and_logging.md
│   │   ├── kodik_syncing_readme_title_with_package_json.md
│   │   ├── kodik_task_transcript_2026_7_3_140142.md
│   │   └── kodik_task_transcript_2026_7_7_151929.md
│   └── ии.zip
├── benchmark-results/ (8 элементов)
│   ├── artifacts/
│   ├── index.html
│   ├── latest-results.json
│   ├── run-2026-07-07T12-04-23-979Z.json
│   ├── run-2026-07-07T12-04-57-883Z.json
│   ├── run-2026-07-07T12-06-36-456Z.json
│   ├── run-2026-07-08T19-04-44-646Z.json
│   └── run-2026-07-08T19-08-20-322Z.json
├── generate/
├── locales/
│   ├── en.json
│   └── ru.json
├── logs/
│   ├── .8bf7768c4dd2213e6ed00198169b0ad3ab99abdf-audit.json
│   ├── app-2026-07-09.log
│   ├── app-2026-07-10.log
│   └── app.log
├── plugins/
│   ├── authors-plugin.js
│   └── emoji-header.js
├── prompts/
│   └── readme-generation-v1.0.0.json
├── public/
│   ├── client.js
│   ├── index.html
│   └── style.css
├── routes/
│   └── api.js
├── scripts/
│   ├── benchmark.js
│   └── reportGenerator.js
├── services/
│   └── generateService.js
├── src/ (13 элементов)
│   ├── commands/
│   ├── context/
│   ├── core/
│   ├── generator/
│   ├── interfaces/
│   ├── output/
│   ├── scanner/
│   ├── utils/
│   ├── validation/
│   ├── index.js
│   ├── installManager.js
│   ├── manifest.js
│   └── pluginManager.js
├── uploads/
├── .gitignore
├── app.js
├── jest.config.js
├── package-lock.json
├── package.json
├── README.backup.2026-07-07T09-46-55-426Z.md
├── README.backup.2026-07-07T10-03-55-412Z.md
├── README.backup.2026-07-07T13-15-27-585Z.md
├── README.backup.2026-07-07T14-26-48-664Z.md
├── README.backup.2026-07-09T10-05-17-352Z.md
├── README.backup.2026-07-09T11-51-04-721Z.md
├── README.backup.2026-07-09T18-57-57-023Z.md
└── README.md
```

## 📄 Лицензия

MIT
