# 📝 Kodik README AI Copilot

> 🌐 [English version](README_EN.md)

---

<p align="center">
  <img src="https://img.shields.io/npm/v/kodik-readme-ai?style=for-the-badge&color=6366f1" alt="npm version">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&color=6366f1" alt="License MIT">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=for-the-badge&color=6366f1" alt="Node.js >= 18">
  <br>
  <img src="https://img.shields.io/badge/AI-OpenAI_|_Ollama_|_DeepSeek_|_Groq-8b5cf6?style=for-the-badge" alt="AI Providers">
  <img src="https://img.shields.io/badge/стеки-20%2B-8b5cf6?style=for-the-badge" alt="Stack Detection">
</p>

<br>

<p align="center">
  <b>Автоматическая генерация профессиональных README.md</b><br>
  <i>AI-анализ кода • Локальный fallback • 20+ стеков • Веб-интерфейс • Плагины</i>
</p>

---

## 📖 О проекте

**Kodik README AI Copilot** — утилита командной строки, которая превращает код вашего проекта в качественную документацию. Она сканирует структуру, анализирует исходный код, манифесты, Git-историю и бизнес-документацию, чтобы сгенерировать исчерпывающий README.md.
<div align="center">

| 🧠 AI | ⚡ Локально |
|:---:|:---:|
| OpenAI, Ollama, DeepSeek, Groq | Встроенные шаблоны и эвристики |
| Максимальное качество | Работает без интернета |

</div>

---

## ✨ Возможности

<table>
<tr>
  <td width="50%">

### 🧠 AI-генерация

- **OpenAI** — GPT-4o, GPT-4o-mini
- **Ollama** — Llama, Mistral, CodeGemma
- **DeepSeek** — DeepSeek-V3, DeepSeek-R1
- **Groq** — Llama, Mixtral (быстрый инференс)
- **LM Studio** — любые локальные модели
- **Любой OpenAI-совместимый API**

  </td>
  <td width="50%">

### 📂 Умный анализ

- **Детектор стека** — 20+ языков и фреймворков
- **Главный файл** — автоматический поиск точки входа
- **Git-контекст** — анализ коммитов (`feat`, `fix`, `docs`)
- **Бизнес-документы** — FEATURES.md, ROADMAP.md, CHANGELOG.md
- **Кодовый контекст** — комментарии, сигнатуры, экспорты

  </td>
</tr>
<tr>
  <td>

### 🌍 Локализация

- Генерация на **6+ языках**
- Автоматический перевод разделов
- Интерфейс: CLI + веб на русском и английском

  </td>
  <td>

### 🛡 Надёжность

- **Двойная валидация** — LLM-as-a-Judge + локальные правила
- **Маскировка секретов** — API-ключи, токены, пароли
- **Human-friendly ошибки** — понятные подсказки

  </td>
</tr>
</table>

### 🎯 Дополнительно

| Возможность | Описание |
|---|---|
| 🏷️ **Интерактивный режим** | Уточняет аудиторию, тон, тип проекта и ключевые фичи |
| 🌐 **Веб-интерфейс** | Express + Bootstrap: загрузи архив или вставь GitHub-ссылку |
| 🔌 **Плагины** | Расширение через хуки: `afterBuild`, `validate`, кастомные разделы |
| 🎨 **Кастомизация** | Шаблоны, эмодзи, включение/выключение разделов через конфиг |
| 📊 **Бенчмаркинг** | Автоматический прогон по репозиториям, сравнение моделей, CI-интеграция |
| 🧪 **Тесты** | Unit, интеграционные и e2e тесты с Jest |

---

## 🚀 Быстрый старт

### 📥 Установка

```bash
# Глобально
npm install -g kodik-readme-ai

# Без установки
npx kodik-readme-ai
```

### ⚡ 30 секунд до результата

```bash
# 1. Генерация в текущей папке (базовый режим)
kodik-readme-ai .

# 2. С AI — локальный Ollama
kodik-readme-ai . --non-interactive --api-url http://localhost:11434/v1 --model llama3.1 --api-key ollama

# 3. Без AI — офлайн, встроенные шаблоны
kodik-readme-ai . --non-interactive --ai false
```

### 🌐 Веб-интерфейс

```bash
npm run server
# Открой http://localhost:3000
```

Загрузи архив проекта или укажи GitHub-ссылку — получи готовый README онлайн.

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
"model": "gpt-4o-mini",
    "apiUrl": "https://api.openai.com/v1"
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
│  • Поиск главного файла (entryDetector.js)                   │
│  • Сбор бизнес-контекста из Git-логов (contextCollector.js)   │
│  • Сбор кодового контекста (projectScanner.js)                │
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

В локальном режиме используются встроенные шаблоны из `localGenerator.js`. Вы можете модифицировать:
- `buildDescription()` — структура описания
- `buildFeaturesList()` — автодетекция функций
- `buildQuickStartData()` — команды быстрого старта

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

#С покрытием
npm run test:coverage

# В режиме наблюдения
npm run test:watch
```

---

## Лицензия

[MIT License](LICENSE)
