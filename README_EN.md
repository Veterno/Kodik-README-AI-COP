# 📝 Kodik README AI Copilot

> 🌐 [Русская версия](README.md)

---

<p align="center">
  <img src="https://img.shields.io/npm/v/kodik-readme-ai?style=for-the-badge&color=6366f1" alt="npm version">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge&color=6366f1" alt="License MIT">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=for-the-badge&color=6366f1" alt="Node.js >= 18">
  <br>
  <img src="https://img.shields.io/badge/AI-OpenAI_|_Ollama_|_DeepSeek_|_Groq-8b5cf6?style=for-the-badge" alt="AI Providers">
  <img src="https://img.shields.io/badge/stacks-20%2B-8b5cf6?style=for-the-badge" alt="Stack Detection">
</p>

<br>

<p align="center">
  <b>Automatic generation of professional README.md</b><br>
  <i>AI code analysis • Local fallback • 20+ stacks • Web interface • Plugins</i>
</p>

---

## 📖 About

**Kodik README AI Copilot** is a command-line utility that turns your project's code into high-quality documentation. It scans the structure, analyzes source code, manifests, Git history, and business documentation to generate a comprehensive README.md.

<div align="center">

| 🧠 AI | ⚡ Local |
|:---:|:---:|
| OpenAI, Ollama, DeepSeek, Groq | Built-in templates and heuristics |
| Maximum quality | Works offline |

</div>

---

## ✨ Features

<table>
<tr>
  <td width="50%">

### 🧠 AI Generation

- **OpenAI** — GPT-4o, GPT-4o-mini
- **Ollama** — Llama, Mistral, CodeGemma
- **DeepSeek** — DeepSeek-V3, DeepSeek-R1
- **Groq** — Llama, Mixtral (fast inference)
- **LM Studio** — any local models
- **Any OpenAI-compatible API**

  </td>
  <td width="50%">

### 📂 Smart Analysis

- **Stack detector** — 20+ languages and frameworks
- **Entry point** — automatic main file detection
- **Git context** — commit analysis (`feat`, `fix`, `docs`)
- **Business docs** — FEATURES.md, ROADMAP.md, CHANGELOG.md
- **Code context** — comments, signatures, exports

  </td>
</tr>
<tr>
  <td>

### 🌍 Localization

- Generation in **6+ languages**
- Automatic section translation
- UI: CLI + web in Russian and English

  </td>
  <td>

### 🛡 Reliability

- **Dual validation** — LLM-as-a-Judge + local rules
- **Secret masking** — API keys, tokens, passwords
- **Human-friendly errors** — clear messages

  </td>
</tr>
</table>

### 🎯 More

| Feature | Description |
|---|---|
| 🏷️ **Interactive mode** | Prompts for audience, tone, project type, and key features |
| 🌐 **Web interface** | Express + Bootstrap: upload archive or paste a GitHub link |
| 🔌 **Plugins** | Extend via hooks: `afterBuild`, `validate`, custom sections |
| 🎨 **Customization** | Templates, emoji, toggling sections via config |
| 📊 **Benchmarking** | Automated runs across repos, model comparison, CI integration |
| 🧪 **Tests** | Unit, integration, and e2e tests with Jest |

---

## 🚀 Quick Start

### 📥 Installation

```bash
# Globally
npm install -g kodik-readme-ai

# Without installing
npx kodik-readme-ai
```

### ⚡ 30 seconds to result

```bash
# 1. Generate in current directory (basic mode)
kodik-readme-ai .

# 2. With AI — local Ollama
kodik-readme-ai . --non-interactive --api-url http://localhost:11434/v1 --model llama3.1 --api-key ollama

# 3. Without AI — offline, built-in templates
kodik-readme-ai . --non-interactive --ai false
```

### 🌐 Web Interface

```bash
npm run server
# Open http://localhost:3000
```

Upload a project archive or specify a GitHub link — get a ready README online.

---

## ⚙️ Configuration

### Environment Variables (.env)

Create a `.env` file in the project root (see `.env.example`):

```env
# Project path
TARGET_DIR=.

# AI settings
USE_AI=true
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7

# Generation and translation language
GENERATION_LANGUAGE=en
TARGET_LANGUAGE=en
TRANSLATE_SECTIONS=Description,Key Features
SKIP_TRANSLATION_IF_SHORT=20

# Code context
CODE_CONTEXT_MAX_FILES=100
CODE_CONTEXT_MAX_LINES=400

# Logging
LOG_FILE=logs/app.log
LOG_LEVEL=info
```

### Config File (JSON/YAML)

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
    "generationLanguage": "en",
    "translateSections": ["Description", "Key Features"]
  },
  "answers": {
    "audience": "developers",
    "license": "MIT"
  }
}
```

Usage:
```bash
kodik-readme-ai . --config config.json
```

---

## 🎮 Usage

### CLI Options

```bash
kodik-readme-ai [target] [options]

Positional arguments:
  target                Path to the project (defaults to current directory)

Options:
  -t, --target          Path to the project
  -n, --non-interactive Skip interactive prompts
  --ai                  Enable AI generation (true/false)
  -m, --model           AI model
  --api-url             API URL
  --api-key             API key
  --tone                Description tone: technical, marketing, minimal
  -l, --language        Generation language
  --no-translate        Disable final translation
  -o, --output          Directory to save README.md
  -c, --config          Path to config file
  --validate            Run validation after generation
  --projectName         Explicit project name
  --dry-run             Show result without saving
  --translate-section   Sections to translate (can be specified multiple times)
  -h, --help            Show help
  -v, --version         Show version
```

### Usage Examples

```bash
# Basic generation with interactive prompts
kodik-readme-ai ./my-project

# Silent generation with defaults
kodik-readme-ai . --non-interactive

# Marketing tone, English language
kodik-readme-ai . --tone marketing --language en

# Local generation only, no AI
kodik-readme-ai . --ai false

# With quality validation
kodik-readme-ai . --validate

# Dry-run (preview only)
kodik-readme-ai . --dry-run

# Using Ollama with a specific model
kodik-readme-ai . --api-url http://localhost:11434/v1 --model llama3.1 --api-key ollama

# Translate only specific sections
kodik-readme-ai . --translate-section Description --translate-section "Key Features"
```

---

## 🧠 How It Works

### Process Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. Project Scanning                          │
│  • File system traversal (ignoring node_modules, .git)         │
│  • Directory tree building (depth up to 4 levels)              │
│  • Flat file list collection                                    │
│  • Manifest detection (package.json, go.mod, ...)              │
│  • License search (LICENSE, MIT, Apache, GPL)                  │
│  • Documentation collection (FEATURES.md, PRODUCT.md, ...)     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. Context Analysis                          │
│  • Stack detection (stackDetector.js)                          │
│  • Entry point detection (entryDetector.js)                    │
│  • Business context from Git logs (contextCollector.js)        │
│  • Code context collection (projectScanner.js)                 │
│  • Interactive prompts (interactive.js)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. README Generation                         │
│  • AI mode: JSON generation via LLM (AiClient)                 │
│  • Local mode: heuristic-based templating                       │
│  • Final Markdown assembly                                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. Post-processing                           │
│  • Final section translation (finalScanner.js)                 │
│  • Sensitive data masking (sensitive.js)                       │
│  • Save to README.md (saveReadme.js)                           │
│  • Optional validation (validator.js)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Detector

The utility automatically detects the language, framework, and package manager from manifests:

| Manifest | Language | Framework |
|----------|------|-----------|
| `package.json` | Node.js (JS/TS) | Express, Next.js, React, NestJS, Fastify, Koa, ... |
| `requirements.txt`, `pyproject.toml` | Python | Django, Flask, FastAPI |
| `go.mod` | Go | Gin, Echo, Fiber |
| `Cargo.toml` | Rust | Actix-web, Rocket, Axum |
| `pom.xml`, `build.gradle` | Java/Kotlin | Spring Boot |
| `composer.json` | PHP | Laravel, Symfony |
| `Gemfile` | Ruby | — |
| `pubspec.yaml` | Dart/Flutter | Flutter |

### Code Context Collection

- **Main file** — reads up to 200 lines (configurable)
- **Additional files** — from `src`, `lib`, `app`, `models`, `controllers`, `services`, `utils`, `core`, `internal`, `components`, `pages`, `hooks`, `helpers`, `modules` folders
- **Filtering** — keeps only comments, function declarations, classes, exports
- **Limits** — up to 100 files, 400 lines each (configurable)

### Business Context

- **Git logs** — analyzes the last 30 commits, extracts `feat`, `fix`, `docs`
- **Documentation** — reads files from the `DOCS_FILES` list (FEATURES.md, PRODUCT.md, ROADMAP.md, CHANGELOG.md, etc.)

---

## 🔧 Advanced Configuration

### AI Client Setup

Any OpenAI-compatible API provider is supported:

```javascript
// In code
const client = new AiClient({
  apiUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  timeout: 60000,
  retryAttempts: 3
});
```

**Supported providers:**
- **OpenAI** — `https://api.openai.com/v1`
- **Ollama** — `http://localhost:11434/v1` (local)
- **LM Studio** — `http://localhost:1234/v1`
- **Groq** — `https://api.groq.com/openai/v1`
- **DeepSeek** — `https://api.deepseek.com/v1`
- **Any other** — OpenAI API compatible

### Template Customization

Local mode uses built-in templates from `localGenerator.js`. You can modify:
- `buildDescription()` — description structure
- `buildFeaturesList()` — auto-detection of features
- `buildQuickStartData()` — quick start commands

### Logging

```bash
# Enable debug logs
export DEBUG=true

# Set logging level
export LOG_LEVEL=debug

# Write to file
export LOG_FILE=logs/app.log
```

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## License

[MIT License](LICENSE)
