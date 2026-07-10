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

### Переменные окружения

Создай `.env` (см. [`.env.example`](.env.example)):

```env
# AI-провайдер
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Языки
GENERATION_LANGUAGE=ru
TARGET_LANGUAGE=ru

# Контекст
CODE_CONTEXT_MAX_FILES=100
CODE_CONTEXT_MAX_LINES=400

# Логирование
LOG_LEVEL=info
```

### JSON/YAML-конфиг

```json
{
  "projectName": "MyProject",
  "nonInteractive": true,
  "ai": {
    "enabled": true,
    "model": "llama3.1",
    "apiUrl": "http://localhost:11434/v1"
  },
  "content": {
    "tone": "marketing",
    "generationLanguage": "ru"
  },
  "answers": {
    "audience": "developers",
    "license": "MIT"
  }
}
```

```bash
kodik-readme-ai . --config config.json
```

---

## 🎮 CLI

```text
kodik-readme-ai [target] [options]

Опции:
  -t, --target             Путь к проекту
  -n, --non-interactive    Пропустить интерактивный опрос
  --ai                     Включить AI (true/false)
  -m, --model              Модель AI
  --api-url                URL API
  --api-key                API-ключ
  --tone                   Тон: technical | marketing | minimal
  -l, --language           Язык генерации
  --no-translate           Отключить перевод разделов
  -o, --output             Папка для README.md
  -c, --config             Файл конфигурации (JSON/YAML)
  --validate               Валидация после генерации
  --projectName            Название проекта
  --dry-run                Вывод без сохранения
  --translate-section      Разделы для перевода (можно несколько)
  --lang                   Язык интерфейса (ru, en)
  -h, --help               Справка
  -v, --version            Версия
```

### Примеры

```bash
# Интерактивно
kodik-readme-ai ./my-project

# Тихо + маркетинговый тон + английский
kodik-readme-ai . --non-interactive --tone marketing --language en

# Локально без AI
kodik-readme-ai . --ai false

# С валидацией
kodik-readme-ai . --validate

# Dry-run — показать не сохраняя
kodik-readme-ai . --dry-run

# Конкретные разделы на перевод
kodik-readme-ai . --translate-section "Описание" --translate-section "Установка"
```

---

## 🧠 Архитектура

```text
┌── 1. Сканирование ──────────────────────────────────────────┐
│  • Обход ФС (исключая node_modules, .git)                   │
│  • Дерево папок (до 4 уровней)                              │
│  • Поиск манифестов, лицензий, документации                 │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌── 2. Анализ ────────────────────────────────────────────────┐
│  • Определение стека (stackDetector.js)                     │
│  • Главный файл (entryDetector.js)                          │
│  • Git-контекст (contextCollector.js)                       │
│  • Кодовый контекст (codeContext.js)                        │
│  • Интерактивный опрос                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌── 3. Генерация ─────────────────────────────────────────────┐
│  • AI: JSON через LLM (AiClient)                            │
│  • Local: шаблонизация (localGenerator.js)                  │
│  • Сборка Markdown (markdownBuilder.js)                     │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌── 4. Постобработка ─────────────────────────────────────────┐
│  • Перевод разделов (finalScanner.js)                       │
│  • Маскировка секретов (sensitive.js)                       │
│  • Сохранение (persistence.js)                              │
│  • Валидация (validator.js)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 📦 Детектор стека

| Манифест | Язык | Фреймворки |
|---|---|---|
| `package.json` | Node.js | Express, Next.js, React, NestJS, Fastify, Koa |
| `requirements.txt` / `pyproject.toml` | Python | Django, Flask, FastAPI |
| `go.mod` | Go | Gin, Echo, Fiber |
| `Cargo.toml` | Rust | Actix-web, Rocket, Axum |
| `pom.xml` / `build.gradle` | Java/Kotlin | Spring Boot |
| `composer.json` | PHP | Laravel, Symfony |
| `Gemfile` | Ruby | Rails, Sinatra |
| `pubspec.yaml` | Dart/Flutter | Flutter |
| `mix.exs` | Elixir | Phoenix |
| `Package.swift` | Swift | Vapor |

### 🔍 Анализ кода

- **Главный файл** — до 200 строк точки входа
- **Папки** — `src`, `lib`, `app`, `models`, `controllers`, `services`, `utils`, `core`, `components`, `pages`, `hooks`
- **Фильтрация** — комментарии, сигнатуры функций/классов, экспорты
- **Лимиты** — до 100 файлов × 400 строк (настраивается)
- **Git-логи** — последние 30 коммитов: `feat`, `fix`, `docs`
- **Бизнес-документы** — FEATURES.md, PRODUCT.md, ROADMAP.md, CHANGELOG.md и другие

---

##  Структура проекта

```text
kodik-readme-ai/
├── src/
│   ├── index.js                  # Точка входа CLI
│   ├── interfaces/cli/           # CLI: main, options, interactive
│   ├── scanner/                  # Сканер: projectScanner, entryDetector
│   ├── context/                  # Контекст: contextCollector, stack/detector
│   ├── generator/                # Генерация: promptLoader, readmeGenerator, localGenerator
│   │   ├── ai/                   # AI-клиент
│   │   └── builder/              # Сборщик Markdown
│   ├── validation/               # Валидация: aiRules, localRules
│   ├── output/                   # Сохранение: persistence, finalScanner
│   ├── core/                     # Конфиг, логгер
│   └── utils/                    # Утилиты: errorFormatter, sensitive
├── plugins/                      # Плагины: emoji-header, authors-plugin
├── prompts/                      # Версионированные AI-промпты
├── locales/                      # i18n: ru.json, en.json
├── public/                       # Веб-интерфейс (HTML, CSS, JS)
├── routes/                       # Express API-роуты
├── scripts/                      # Бенчмаркинг, отчёты
├── __tests__/                    # Unit, интеграционные, e2e тесты
└── app.js                        # Express-сервер
```

---

## 🔧 Провайдеры AI

| Провайдер | URL | Особенности |
|---|---|---|
| **OpenAI** | `https://api.openai.com/v1` | GPT-4o, GPT-4o-mini |
| **Ollama** | `http://localhost:11434/v1` | Локально, бесплатно |
| **LM Studio** | `http://localhost:1234/v1` | Локально, GUI |
| **Groq** | `https://api.groq.com/openai/v1` | Быстрый инференс |
| **DeepSeek** | `https://api.deepseek.com/v1` | DeepSeek-V3, R1 |
| **Любой** | ваш URL | OpenAI-совместимый |

Программное использование:

```javascript
const { AiClient } = require('kodik-readme-ai');

const client = new AiClient({
  apiUrl: 'http://localhost:11434/v1',
  apiKey: 'ollama',
  model: 'llama3.1',
  temperature: 0.7,
  timeout: 60000,
  retryAttempts: 3
});
```

---

## 🧪 Разработка

```bash
# Клонировать
git clone https://github.com/vibekodik/kodik-readme-ai.git
cd kodik-readme-ai

# Установить зависимости
npm install

# Тесты
npm test                 # Все тесты
npm run test:coverage    # С покрытием
npm run test:watch       # Watch-режим

# Бенчмаркинг
npm run benchmark

# Веб-сервер для разработки
npm run server
```

---


## 📄 Лицензия

MIT 
