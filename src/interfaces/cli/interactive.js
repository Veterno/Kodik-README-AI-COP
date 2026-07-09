'use strict';

/**
 * src/interactive.js
 * Интерактивный CLI-опрос для уточнения аудитории, тона и бизнес-ценности.
 * Использует библиотеку prompts. Если передан флаг --non-interactive, опрос пропускается.
 */

const prompts = require('prompts');
const { DEFAULT_ANSWERS } = require('../../core/config');
const { log } = require('../../core/logger');
async function runInteractive(options, detectedLicense = null) {
  const initialAnswers = {
    ...options.answers,
    license: detectedLicense || options.answers.license
  };

  if (options.nonInteractive) {
    return initialAnswers;
  }

  const questions = [
    {
      type: 'select',
      name: 'audience',
      message: 'Для кого этот проект?',
      choices: [
        { title: 'Конечные пользователи (B2C)', value: 'end-users' },
        { title: 'Разработчики (библиотека/API)', value: 'developers' },
        { title: 'Бизнес-клиенты (B2B)', value: 'business' },
      ],
      initial: [
        'end-users',
        'developers',
        'business'
      ].indexOf(initialAnswers.audience) !== -1 ? ['end-users', 'developers', 'business'].indexOf(initialAnswers.audience) : 1,
    },
    {
      type: 'select',
      name: 'tone',
      message: 'Какой тон описания предпочитаете?',
      choices: [
        { title: 'Строгий технический', value: 'technical' },
        { title: 'Маркетинговый/продуктовый', value: 'marketing' },
        { title: 'Минималистичный', value: 'minimal' },
      ],
      initial: ['technical', 'marketing', 'minimal'].indexOf(initialAnswers.tone) !== -1 ? ['technical', 'marketing', 'minimal'].indexOf(initialAnswers.tone) : 0,
    },
    {
      type: 'text',
      name: 'value',
      message: 'Главная бизнес-ценность (кратко, опционально):',
      initial: initialAnswers.value || '',
    },
    {
      type: 'select',
      name: 'projectType',
      message: 'Какой тип проекта?',
      choices: [
        { title: 'Веб-приложение / API', value: 'web' },
        { title: 'Библиотека / SDK', value: 'library' },
        { title: 'CLI-инструмент', value: 'cli' },
        { title: 'Микросервис', value: 'microservice' },
        { title: 'Мобильное приложение', value: 'mobile' },
        { title: 'Другое', value: 'other' },
      ],
      initial: ['web', 'library', 'cli', 'microservice', 'mobile', 'other'].indexOf(initialAnswers.projectType) !== -1 ? ['web', 'library', 'cli', 'microservice', 'mobile', 'other'].indexOf(initialAnswers.projectType) : 0,
    },
    {
      type: 'text',
      name: 'keyFeatures',
      message: 'Перечислите ключевые функции (через запятую, опционально):',
      initial: initialAnswers.keyFeatures || '',
    },
    {
      type: (prev, values) => (!detectedLicense ? 'select' : null),
      name: 'license',
      message: 'Какую лицензию использовать?',
      choices: [
        { title: 'MIT', value: 'MIT' },
        { title: 'Apache 2.0', value: 'Apache 2.0' },
        { title: 'GPL v3', value: 'GPL v3' },
        { title: 'BSD 3-Clause', value: 'BSD 3-Clause' },
        { title: 'Unlicense', value: 'Unlicense' },
        { title: 'Proprietary', value: 'Proprietary' },
      ],
      initial: 0,
    },
  ];

  try {
    const response = await prompts(questions, {
      onCancel: () => {
        throw new Error('INTERRUPTED');
      }
    });

    if (detectedLicense && !response.license) {
      response.license = detectedLicense;
    }

    return { ...initialAnswers, ...response };
  } catch (err) {
    if (err.message === 'INTERRUPTED') {
      console.log('\n\x1b[33m⚠️  Опрос прерван пользователем. Используются текущие настройки.\x1b[0m');
      return initialAnswers;
    }
    throw err;
  }
}
module.exports = { runInteractive };