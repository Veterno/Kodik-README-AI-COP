# 📝 Kodik README AI Copilot

> 🌐 [English version](README_EN.md)

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

## 🔌 API

Содержимое раздела.
## 📂 Структура проекта

## 🤝 Участие в разработке

Содержимое раздела.
## 📄 Лицензия

MIT
