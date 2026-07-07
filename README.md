# 🚀 kodik-readme-ai

## 📝 Описание

Автоматическая генерация README.md с использованием OpenAI-совместимых API и анализом контекста (локальный fallback). Утилита экономит время разработчиков, создавая качественную документацию на основе сканирования проекта, Git-логов и интерактивного опроса.

## ✨ Ключевые возможности

- **AI-генерация** — Генерация README с помощью OpenAI-совместимых API (Ollama, LM Studio, Groq, DeepSeek и др.) с поддержкой JSON-режима.
- **Контекстный анализ** — Сбор контекста из исходных файлов (комментарии, функции, классы), Git-логов, бизнес-документов и манифестов.
- **Многоязычность** — Генерация и перевод README на разные языки (русский, английский и др.) с автоматическим определением языка разделов.
- **Автоматический перевод** — Финальный перевод выбранных разделов через AI с сохранением Markdown-форматирования и технических терминов.
- **Детектор стека** — Автоматическое определение языка программирования, фреймворка, менеджера пакетов и Docker-поддержки по манифестам и файлам.
- **Git-контекст** — Извлечение информации из Git-логов (feat, fix, docs коммиты) для обогащения описания и списка возможностей.
- **Бизнес-документация** — Чтение дополнительных документов (PRODUCT.md, ROADMAP.md, CHANGELOG.md и др.) для включения в контекст.
- **Интерактивный режим** — CLI-опрос для уточнения аудитории, тона, бизнес-ценности и ключевых функций проекта.
- **Гибкая конфигурация** — Настройка через CLI-аргументы, файл конфигурации (JSON/YAML), переменные окружения и .env.
- **Docker-поддержка** — Автоматическое обнаружение Dockerfile и docker-compose.yml с генерацией соответствующих команд.
- **Безопасность** — Маскировка чувствительных данных (API-ключи, пароли) в логах и генерируемом README.
- **Валидация** — LLM-as-a-Judge валидация сгенерированного README на полноту, точность и соответствие контексту.
- **Бенчмаркинг** — Скрипт для замера производительности генерации (scripts/benchmark.js).

## 🛠️ Стек технологий

- **Язык:** Node.js (JavaScript)
- **Пакетный менеджер:** npm
- **Дополнительно:** axios, dotenv, js-yaml, prompts, yargs, jest

## 📦 Быстрый старт

### Требования

- Node.js >= 14

### Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск
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
│   │   ├── saveReadme.test.js
│   │   └── scanner.test.js
│   └── unit/
│       ├── aiClient.test.js
│       ├── codeContext.test.js
│       ├── config.test.js
│       ├── contextCollector.test.js
│       ├── edgeCases.test.js
│       ├── finalScanner.test.js
│       ├── generateReadme.edge.test.js
│       ├── interactive.test.js
│       ├── jsonParser.test.js
│       ├── logger.test.js
│       ├── mainFile.test.js
│       ├── options.test.js
│       ├── pathUtils.test.js
│       ├── sensitive.test.js
│       ├── stackDetector.test.js
│       └── validator.test.js
├── .kodik/
│   └── debug/
│       ├── dbg-FR18J7MZ441S.ndjson
│       └── dbg-T57JXVAC3XC3.ndjson
├── ии/
│   ├── ии/
│   │   ├── kodik_benchmark_js.md
│   │   ├── kodik_final_readme_scanner_for_russian_translation.md
│   │   ├── kodik_fixing_code_paths_syntax_error_in_codecontext.md
│   │   ├── kodik_fixing_duplicate_identifier_syntax_error.md
│   │   ├── kodik_fixing_readme_generator_and_language_logic.md
│   │   ├── kodik_fixing_unhandled_promise_rejection_in_readme_ai.md
│   │   ├── kodik_implementing_file_logging_for_node_js_cli.md
│   │   ├── kodik_node_cli_readme_generator_test_implementation.md
│   │   ├── kodik_ollama.md
│   │   ├── kodik_readme.md
│   │   ├── kodik_refactoring_ai_client_for_multiple_providers.md
│   │   ├── kodik_refactoring_cli_argument_parsing_and_configuration.md
│   │   ├── kodik_refactoring_finalscanner_for_configurable_readme_translation.md
│   │   ├── kodik_refactoring_readme_generator_and_dead_code.md
│   │   ├── kodik_securing_nodejs_paths_against_traversal_vulnerabilities.md
│   │   ├── kodik_standardizing_node_js_error_handling_and_logging.md
│   │   ├── kodik_syncing_readme_title_with_package_json.md
│   │   └── kodik_task_transcript_2026_7_3_140142.md
│   └── ии.rar
├── logs/
│   └── app.log
├── scripts/
│   └── benchmark.js
├── src/
│   ├── utils/
│   ├── aiClient.js
│   ├── codeContext.js
│   ├── config.js
│   ├── contextCollector.js
│   ├── finalScanner.js
│   ├── generateReadme.js
│   ├── index.js
│   ├── interactive.js
│   ├── logger.js
│   ├── mainFile.js
│   ├── manifest.js
│   ├── options.js
│   ├── saveReadme.js
│   ├── scanner.js
│   ├── stackDetector.js
│   ├── tree.js
│   └── validator.js
├── .gitignore
├── package-lock.json
├── package.json
├── README.backup.1782902865082.md
├── README.backup.2026-07-07T09-46-55-426Z.md
├── README.md
└── README1.md
```

## 📊 Бенчмаркинг

В проекте есть система автоматического измерения качества генерации README на реальных репозиториях.

### Запуск локально

```bash
# Базовый запуск (использует модель из .env)
node scripts/benchmark.js

# Запуск для нескольких моделей с ограничением параллелизма
node scripts/benchmark.js --models gpt-4o-mini,gpt-4o --concurrency 2

# Запуск на специфических репозиториях
node scripts/benchmark.js --repos https://github.com/expressjs/express.git
```

### Результаты

После завершения в директории `.benchmark-results/` появятся:
- `run-YYYY-MM-DD...json` — полный структурированный отчёт.
- `index.html` — визуальный отчёт с графиками.
- `*.md` — сгенерированные файлы README для каждого прогона.

## 📄 Лицензия

MIT
