# 📝 Kodik README AI Copilot

> **Автоматическая генерация качественного README.md** с использованием AI-анализа кода и локального fallback-режима

[![Node.js CI](https://github.com/yourusername/kodik-readme-ai/actions/workflows/node.js.yml/badge.svg)](https://github.com/yourusername/kodik-readme-ai/actions/workflows/node.js.yml)
[![Coverage Status](https://codecov.io/gh/yourusername/kodik-readme-ai/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/kodik-readme-ai)
[![npm version](https://badge.fury.io/js/kodik-readme-ai.svg)](https://badge.fury.io/js/kodik-readme-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 Что это?

**Kodik README AI Copilot** — это мощная утилита командной строки, которая автоматически генерирует профессиональные README-файлы для ваших проектов. Она анализирует структуру проекта, исходный код, манифесты, Git-историю и даже бизнес-документацию, чтобы создать исчерпывающее описание на нужном языке.

**Ключевая особенность** — гибридный подход: вы можете использовать AI-генерацию (OpenAI, Ollama, Groq, DeepSeek и любые OpenAI-совместимые API) для получения максимально качественного результата, либо работать в **локальном режиме без AI** — утилита использует встроенные шаблоны и эвристики для создания достойного README даже без подключения к интернету.

---

## ✨ Возможности

| Функция | Описание |
|---------|----------|
| 🧠 **AI-генерация** | Поддержка OpenAI, Ollama, LM Studio, Groq, DeepSeek и любых совместимых API |
| 📂 **Контекстный анализ** | Сканирует проект, определяет стек технологий, находит главный файл, анализирует код |
| 🌍 **Многоязычность** | Генерация на русском, английском, испанском, французском, немецком, китайском |
| 🔄 **Автоматический перевод** | Финальная обработка разделов с помощью AI для полировки языка |
| 📦 **Детектор стека** | Распознаёт 20+ языков и фреймворков (Node.js, Python, Go, Rust, Java, PHP, C#, Ruby, Dart и др.) |
| 📜 **Git-контекст** | Анализирует последние коммиты (feat, fix, docs) для понимания истории разработки |
| 📄 **Бизнес-документация** | Читает FEATURES.md, PRODUCT.md, ROADMAP.md и другие документы для понимания ценности |
| 🏷️ **Интерактивный режим** | Уточняет аудиторию, тон описания, тип проекта и ключевые функции |
| ⚙️ **Гибкая конфигурация** | CLI-аргументы, переменные окружения, JSON/YAML-конфиги — любой способ |
| 🐳 **Docker-поддержка** | Автоматически определяет Dockerfile и docker-compose.yml |
| 🔒 **Безопасность** | Маскирует чувствительные данные (API-ключи, пароли, токены) в логах и README |
| 🧪 **Валидация** | LLM-as-a-Judge для оценки качества сгенерированного README |
| 📊 **Бенчмаркинг** | Скрипт для тестирования на реальных репозиториях и сбора статистики |

---

## 🚀 Быстрый старт

### Установка

```bash
# Глобальная установка через npm
npm install -g kodik-readme-ai

# Или используйте npx без установки
npx kodik-readme-ai
```

### Минимальный запуск

```bash
# В текущей папке
kodik-readme-ai .

# В указанной папке
kodik-readme-ai /path/to/your/project
```

### Пример с AI (Ollama)

```bash
# Использование локального Ollama
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_API_KEY=ollama
export OPENAI_MODEL=llama3.1

kodik-readme-ai . --non-interactive
```

### Пример без AI (локальный режим)

```bash
# Отключаем AI, используем встроенные шаблоны
kodik-readme-ai . --non-interactive --ai false
```

---

## ⚙️ Конфигурация

### Переменные окружения (.env)

Создайте файл `.env` в корне проекта (см. `.env.example`):

```env
# Путь к проекту
TARGET_DIR=.

# Настройки AI
USE_AI=true
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7

# Язык генерации и перевода
GENERATION_LANGUAGE=ru
TARGET_LANGUAGE=ru
TRANSLATE_SECTIONS=Описание,Ключевые возможности
SKIP_TRANSLATION_IF_SHORT=20

# Контекст кода
CODE_CONTEXT_MAX_FILES=100
CODE_CONTEXT_MAX_LINES=400

# Логирование
LOG_FILE=logs/app.log
LOG_LEVEL=info
```

### Файл конфигурации (JSON/YAML)

```json
{
  "projectName": "MyAwesomeProject",
  "nonInteractive": true,
  "ai": {
    "enabled": true,
    "model": "llama3.1",
    "apiUrl": "http://localhost:11434/v1"
  },
  "content": {
    "tone": "marketing",
    "generationLanguage": "ru",
    "translateSections": ["Описание", "Ключевые возможности"]
  },
  "answers": {
    "audience": "developers",
    "license": "MIT"
  }
}
```

Использование:
```bash
kodik-readme-ai . --config config.json
```

---

## 🎮 Использование

### CLI-опции

```bash
kodik-readme-ai [target] [options]

Позиционные аргументы:
  target                Путь к проекту (по умолчанию текущая папка)

Опции:
  -t, --target          Путь к проекту
  -n, --non-interactive Пропустить интерактивный опрос
  --ai                  Включить AI-генерацию (true/false)
  -m, --model           Модель AI
  --api-url             URL API
  --api-key             API-ключ
  --tone                Тон описания: technical, marketing, minimal
  -l, --language        Язык генерации
  --no-translate        Отключить финальный перевод
  -o, --output          Папка для сохранения README.md
  -c, --config          Путь к файлу конфигурации
  --validate            Запустить валидацию после генерации
  --projectName         Явное название проекта
  --dry-run             Показать результат без сохранения
  --translate-section   Секции для перевода (можно указать несколько)
  -h, --help            Показать справку
  -v, --version         Показать версию
```

### Примеры использования

```bash
# Базовая генерация с интерактивным опросом
kodik-readme-ai ./my-project

# Тихая генерация с дефолтными настройками
kodik-readme-ai . --non-interactive

# Маркетинговый тон, английский язык
kodik-readme-ai . --tone marketing --language en

# Только локальная генерация без AI
kodik-readme-ai . --ai false

# С валидацией качества
kodik-readme-ai . --validate

# Dry-run (только показать результат)
kodik-readme-ai . --dry-run

# Использование Ollama с конкретной моделью
kodik-readme-ai . --api-url http://localhost:11434/v1 --model llama3.1 --api-key ollama

# Перевод только определённых разделов
kodik-readme-ai . --translate-section Описание --translate-section "Ключевые возможности"
```

---

## 🧠 Как это работает?

### Архитектура процесса

```
┌─────────────────────────────────────────────────────────────────┐
│                      1. Сканирование проекта                    │
│  • Обход файловой системы (игнорирование node_modules, .git)   │
│  • Построение дерева папок (глубина до 4 уровней)              │
│  • Сбор плоского списка файлов                                  │
│  • Обнаружение манифестов (package.json, go.mod, ...)          │
│  • Поиск лицензии (LICENSE, MIT, Apache, GPL)                  │
│  • Сбор документации (FEATURES.md, PRODUCT.md, ...)            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. Анализ контекста                         │
│  • Определение стека технологий (stackDetector.js)            │
│  • Поиск главного файла (mainFile.js)                         │
│  • Сбор бизнес-контекста из Git-логов (contextCollector.js)   │
│  • Сбор кодового контекста (codeContext.js)                   │
│  • Интерактивный опрос (interactive.js)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   3. Генерация README                           │
│  • AI-режим: формирование JSON через LLM (AiClient)           │
│  • Локальный режим: шаблонизация на основе эвристик            │
│  • Сборка финального Markdown                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. Постобработка                             │
│  • Финальный перевод разделов (finalScanner.js)               │
│  • Маскировка чувствительных данных (sensitive.js)            │
│  • Сохранение в README.md (saveReadme.js)                     │
│  • Опциональная валидация (validator.js)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Детектор стека

Утилита автоматически определяет язык, фреймворк и пакетный менеджер по манифестам:

| Манифест | Язык | Фреймворк |
|----------|------|-----------|
| `package.json` | Node.js (JS/TS) | Express, Next.js, React, NestJS, Fastify, Koa, ... |
| `requirements.txt`, `pyproject.toml` | Python | Django, Flask, FastAPI |
| `go.mod` | Go | Gin, Echo, Fiber |
| `Cargo.toml` | Rust | Actix-web, Rocket, Axum |
| `pom.xml`, `build.gradle` | Java/Kotlin | Spring Boot |
| `composer.json` | PHP | Laravel, Symfony |
| `Gemfile` | Ruby | — |
| `pubspec.yaml` | Dart/Flutter | Flutter |

### Сбор контекста из кода

- **Главный файл** — читает до 200 строк (настраивается)
- **Дополнительные файлы** — из папок `src`, `lib`, `app`, `models`, `controllers`, `services`, `utils`, `core`, `internal`, `components`, `pages`, `hooks`, `helpers`, `modules`
- **Фильтрация** — сохраняет только комментарии, объявления функций, классов, экспортов
- **Лимиты** — до 100 файлов, по 400 строк каждый (настраивается)

### Business-контекст

- **Git-логи** — анализирует последние 30 коммитов, выделяет `feat`, `fix`, `docs`
- **Документация** — читает файлы из списка `DOCS_FILES` (FEATURES.md, PRODUCT.md, ROADMAP.md, CHANGELOG.md и др.)

---

## 🔧 Расширенная настройка

### Настройка AI-клиента

Поддерживаются любые провайдеры с OpenAI-совместимым API:

```javascript
// В коде
const client = new AiClient({
  apiUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  timeout: 60000,
  retryAttempts: 3
});
```

**Поддерживаемые провайдеры:**
- **OpenAI** — `https://api.openai.com/v1`
- **Ollama** — `http://localhost:11434/v1` (локально)
- **LM Studio** — `http://localhost:1234/v1`
- **Groq** — `https://api.groq.com/openai/v1`
- **DeepSeek** — `https://api.deepseek.com/v1`
- **Any other** — совместимый с OpenAI API

### Кастомизация шаблонов

В локальном режиме используются встроенные шаблоны из `generateReadme.js`. Вы можете модифицировать:
- `buildDescription()` — структура описания
- `buildFeaturesList()` — автодетекция функций
- `buildQuickStart()` — команды быстрого старта

### Логирование

```bash
# Включить отладочные логи
export DEBUG=true

# Установить уровень логирования
export LOG_LEVEL=debug

# Запись в файл
export LOG_FILE=logs/app.log
```

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
npm test

# С покрытием
npm run test:coverage

# В режиме наблюдения
npm run test:watch
```

### Структура тестов

```
tests/
├── e2e/
│   └── generateReadme.test.js          # Сквозные тесты генерации
├── integration/
│   ├── contextCollection.test.js       # Интеграция сбора контекста
│   ├── saveReadme.test.js              # Сохранение README
│   └── scanner.test.js                 # Сканирование проекта
└── unit/                               # Юнит-тесты каждого модуля
    ├── aiClient.test.js
    ├── codeContext.test.js
    ├── config.test.js
    ├── contextCollector.test.js
    ├── edgeCases.test.js
    ├── finalScanner.test.js
    ├── generateReadme.edge.test.js
    ├── interactive.test.js
    ├── jsonParser.test.js
    ├── logger.test.js
    ├── mainFile.test.js
    ├── options.test.js
    ├── pathUtils.test.js
    ├── sensitive.test.js
    ├── stackDetector.test.js
    └── validator.test.js
```

### Бенчмаркинг

Запуск на реальных репозиториях:

```bash
npm run benchmark
```

Результаты сохраняются в `.benchmark-results/` с оценками:
- **accuracy** — точность описания
- **clarity** — ясность текста
- **completeness** — полнота разделов
- **hallucinations** — отсутствие выдумок

---

## 🛠️ Разработка

### Структура проекта

```
kodik-readme-ai/
├── src/
│   ├── utils/
│   │   ├── jsonParser.js        # Извлечение JSON из ответов LLM
│   │   ├── pathUtils.js         # Безопасная работа с путями
│   │   └── sensitive.js         # Маскировка секретов
│   ├── aiClient.js              # Клиент для OpenAI-совместимых API
│   ├── codeContext.js           # Сбор контекста из кода
│   ├── config.js                # Все константы и настройки
│   ├── contextCollector.js      # Сбор бизнес-контекста (Git, docs)
│   ├── finalScanner.js          # Финальный перевод разделов
│   ├── generateReadme.js        # Основная логика генерации
│   ├── index.js                 # Точка входа (CLI)
│   ├── interactive.js           # Интерактивный опрос
│   ├── logger.js                # Логирование
│   ├── mainFile.js              # Поиск главного файла
│   ├── options.js               # Разрешение опций (CLI, env, config)
│   ├── saveReadme.js            # Сохранение README
│   ├── scanner.js               # Сканирование файловой системы
│   ├── stackDetector.js         # Детектор стека технологий
│   └── validator.js             # Валидация через LLM-as-a-Judge
├── scripts/
│   └── benchmark.js             # Бенчмаркинг
├── tests/                       # Тесты (см. выше)
├── .env.example                 # Пример переменных окружения
├── package.json
├── package-lock.json
├── node.js.yml                  # GitHub Actions CI
└── README.md                    # Этот файл
```

### Добавление нового языка/фреймворка

1. В `config.js` добавьте манифест в `MANIFEST_FILES`
2. В `stackDetector.js` реализуйте функцию `detectFromXxx()`
3. Добавьте вызов в `detectStack()` (switch-блок)

### Кастомизация промптов

Промпты для AI находятся в `generateReadme.js` (`systemPrompt` и `userPrompt`). Для валидации — в `validator.js`.

---

## 🔒 Безопасность

Утилита активно маскирует чувствительные данные:

- **API-ключи**: AWS (AKIA...), GitHub (ghp_...), Google (AIza...), Stripe (sk_live_...)
- **Токены**: JWT, Slack, Square
- **Строки подключения**: MongoDB, PostgreSQL, MySQL, Redis
- **Переменные окружения**: пароли, секреты в .env

Все логи и содержимое README проходят через `maskSensitive()`.

---

## 📊 Пример сгенерированного README

