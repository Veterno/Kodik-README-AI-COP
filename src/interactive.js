'use strict';

/**
 * src/interactive.js
 * Интерактивный CLI-опрос для уточнения аудитории, тона и бизнес-ценности.
 * Использует библиотеку inquirer. Если передан флаг --non-interactive, опрос пропускается.
 */

const inquirer = require('inquirer');

async function runInteractive(flags) {
  if (flags.nonInteractive) {
    return {
      audience: 'developers',
      tone: 'technical',
      value: null,
    };
  }

  const questions = [
    {
      type: 'list',
      name: 'audience',
      message: 'Для кого этот проект?',
      choices: [
        { name: 'Конечные пользователи (B2C)', value: 'end-users' },
        { name: 'Разработчики (библиотека/API)', value: 'developers' },
        { name: 'Бизнес-клиенты (B2B)', value: 'business' },
      ],
      default: 'developers',
    },
    {
      type: 'list',
      name: 'tone',
      message: 'Какой тон описания предпочитаете?',
      choices: [
        { name: 'Строгий технический', value: 'technical' },
        { name: 'Маркетинговый/продуктовый', value: 'marketing' },
        { name: 'Минималистичный', value: 'minimal' },
      ],
      default: 'technical',
    },
    {
      type: 'input',
      name: 'value',
      message: 'Главная бизнес-ценность (кратко, опционально):',
      default: '',
    },
    // ... после существующих вопросов
    {
      type: 'list',
      name: 'projectType',
      message: 'Какой тип проекта?',
      choices: [
        { name: 'Веб-приложение / API', value: 'web' },
        { name: 'Библиотека / SDK', value: 'library' },
        { name: 'CLI-инструмент', value: 'cli' },
        { name: 'Микросервис', value: 'microservice' },
        { name: 'Мобильное приложение', value: 'mobile' },
        { name: 'Другое', value: 'other' },
      ],
      default: 'web',
    },
    {
      type: 'input',
      name: 'keyFeatures',
      message: 'Перечислите ключевые функции (через запятую, опционально):',
      default: '',
    },
  ];

  return inquirer.prompt(questions);
}

module.exports = { runInteractive };