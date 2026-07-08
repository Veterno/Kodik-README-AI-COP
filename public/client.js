document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('generateForm');
    const submitBtn = document.getElementById('submitBtn');
    const useAiCheckbox = document.getElementById('useAi');
    const aiOptions = document.getElementById('aiOptions');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const statusMessage = document.getElementById('statusMessage');
    const resultContainer = document.getElementById('resultContainer');
    const markdownOutput = document.querySelector('#markdownOutput code');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const hljsStyle = document.getElementById('hljs-style');
    const langToggle = document.getElementById('langToggle');

    let generatedMarkdown = '';

    // --- i18n Logic ---
    const translations = {
        en: {
            lead: 'Automatically generate README.md for your project',
            projectSource: 'Project Source',
            zipArchive: 'ZIP Archive',
            genLang: 'Generation Language',
            descTone: 'Description Tone',
            toneTechnical: 'Technical',
            toneMarketing: 'Marketing',
            toneMinimal: 'Minimalist',
            langEn: 'English',
            langRu: 'Russian',
            useAi: 'Use AI (OpenAI-compatible API)',
            apiKeyLabel: 'API Key (optional if set in .env)',
            generateBtn: 'Generate README',
            progressTitle: 'Generation Progress',
            resultTitle: 'Result: README.md',
            copyBtn: 'Copy',
            downloadBtn: 'Download',
            alertGithub: 'Please enter a GitHub URL',
            alertZip: 'Please select a ZIP file',
            startProcess: 'Starting process...',
            connLost: 'Connection to server lost',
            copied: 'Copied!',
            'Preparing temporary folder...': 'Preparing temporary folder...',
            'Cloning repository:': 'Cloning repository:',
            'Extracting archive...': 'Extracting archive...',
            'Scanning project structure...': 'Scanning project structure...',
            'Analyzing project and gathering context...': 'Analyzing project and gathering context...',
            'Generating README content...': 'Generating README content...',
            'Final processing and translation': 'Final processing and translation',
            'README successfully generated!': 'README successfully generated!'
        },
        ru: {
            lead: 'Автоматическая генерация README.md для вашего проекта',
            projectSource: 'Источник проекта',
            zipArchive: 'ZIP Архив',
            genLang: 'Язык генерации',
            descTone: 'Тон описания',
            toneTechnical: 'Технический',
            toneMarketing: 'Маркетинговый',
            toneMinimal: 'Минималистичный',
            langEn: 'Английский',
            langRu: 'Русский',
            useAi: 'Использовать AI (OpenAI-совместимый API)',
            apiKeyLabel: 'API Ключ (опционально, если не задан в .env)',
            generateBtn: 'Сгенерировать README',
            progressTitle: 'Прогресс генерации',
            resultTitle: 'Результат: README.md',
            copyBtn: 'Копировать',
            downloadBtn: 'Скачать',
            alertGithub: 'Пожалуйста, введите GitHub URL',
            alertZip: 'Пожалуйста, выберите ZIP файл',
            startProcess: 'Запуск процесса...',
            connLost: 'Соединение с сервером потеряно',
            copied: 'Скопировано!',
            'Preparing temporary folder...': 'Подготовка временной папки...',
            'Cloning repository:': 'Клонирование репозитория:',
            'Extracting archive...': 'Распаковка архива...',
            'Scanning project structure...': 'Сканирование структуры проекта...',
            'Analyzing project and gathering context...': 'Анализ проекта и сбор контекста...',
            'Generating README content...': 'Генерация содержимого README...',
            'Final processing and translation': 'Финальная обработка и перевод',
            'README successfully generated!': 'README успешно сгенерирован!'
        }
    };

    let currentLang = localStorage.getItem('lang') || 'en';

    const updateInterface = () => {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[currentLang][key]) {
                if (el.tagName === 'OPTION') {
                    el.text = translations[currentLang][key];
                } else {
                    el.textContent = translations[currentLang][key];
                }
            }
        });
        langToggle.textContent = currentLang === 'en' ? 'RU' : 'EN';
        localStorage.setItem('lang', currentLang);
    };

    // Initial language sync for generator
    const genLangSelect = document.getElementById('language');
    if (genLangSelect && !localStorage.getItem('hasSetInitialGenLang')) {
        genLangSelect.value = currentLang;
        localStorage.setItem('hasSetInitialGenLang', 'true');
    }

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ru' : 'en';
        updateInterface();
    });

    updateInterface();

    // --- Theme Logic ---
    const toggleTheme = (theme) => {
        const currentTheme = theme || (document.documentElement.getAttribute('data-bs-theme') === 'light' ? 'dark' : 'light');
        document.documentElement.setAttribute('data-bs-theme', currentTheme);
        themeIcon.textContent = currentTheme === 'light' ? '🌙' : '☀️';
        
        if (currentTheme === 'dark') {
            hljsStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css';
        } else {
            hljsStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css';
        }
        
        localStorage.setItem('theme', currentTheme);
    };

    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
        toggleTheme('dark');
    }

    themeToggle.addEventListener('click', () => toggleTheme());

    // --- UI Logic ---
    useAiCheckbox.addEventListener('change', () => {
        aiOptions.classList.toggle('d-none', !useAiCheckbox.checked);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const activeTab = document.querySelector('#sourceTabs .nav-link.active').id;
        
        if (activeTab === 'github-tab' && !formData.get('githubUrl')) {
            alert(translations[currentLang].alertGithub);
            return;
        }
        if (activeTab === 'zip-tab' && !formData.get('zipFile').name) {
            alert(translations[currentLang].alertZip);
            return;
        }

        submitBtn.disabled = true;
        progressContainer.classList.remove('d-none');
        resultContainer.classList.add('d-none');
        progressBar.style.width = '0%';
        progressBar.classList.remove('bg-danger');
        statusMessage.textContent = translations[currentLang].startProcess;
        statusMessage.classList.remove('text-danger');

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to start generation');

            const { sessionId } = await response.json();
            trackProgress(sessionId);
        } catch (err) {
            showError('Request error: ' + err.message);
        }
    });

    function trackProgress(sessionId) {
        const eventSource = new EventSource(`/api/progress/${sessionId}`);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            let msg = data.message;
            for (const [en, localized] of Object.entries(translations[currentLang])) {
                if (msg.includes(en)) {
                    msg = msg.replace(en, localized);
                    break;
                }
            }
            
            statusMessage.textContent = msg;
            updateProgressBar(data.step);

            if (data.step === 'done') {
                eventSource.close();
                showResult(data.result);
            } else if (data.step === 'error') {
                eventSource.close();
                showError(data.message);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            showError(translations[currentLang].connLost);
        };
    }

    function updateProgressBar(step) {
        const steps = {
            'init': 10,
            'download': 30,
            'scan': 50,
            'analyze': 60,
            'generate': 80,
            'translate': 95,
            'done': 100,
            'error': 100
        };
        const percent = steps[step] || 0;
        progressBar.style.width = `${percent}%`;
        if (step === 'error') {
            progressBar.classList.add('bg-danger');
        }
    }

    function showResult(markdown) {
        generatedMarkdown = markdown;
        markdownOutput.textContent = markdown;
        hljs.highlightElement(markdownOutput);
        
        resultContainer.classList.remove('d-none');
        submitBtn.disabled = false;
        
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function showError(message) {
        statusMessage.textContent = message;
        statusMessage.classList.add('text-danger');
        submitBtn.disabled = false;
        progressBar.classList.add('bg-danger');
    }

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(generatedMarkdown);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = translations[currentLang].copied;
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });

    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([generatedMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'README.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});