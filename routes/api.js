'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const generateService = require('../services/generateService');

const upload = multer({ dest: 'uploads/' });

// Хранилище для прогресса (в памяти)
const progressMap = new Map();

/**
 * Запуск генерации
 */
router.post('/generate', upload.single('zipFile'), async (req, res) => {
  const sessionId = uuidv4();
  const { githubUrl, language, tone, useAi, apiKey } = req.body;
  const zipFile = req.file;

  // Инициализируем прогресс
  progressMap.set(sessionId, { step: 'init', message: 'Запуск...', done: false });

  // Запускаем процесс асинхронно, чтобы сразу вернуть sessionId
  generateService.generate({
    githubUrl,
    zipFile,
    language,
    tone,
    useAi,
    apiKey
  }, (progress) => {
    progressMap.set(sessionId, { ...progress, timestamp: Date.now() });
    if (progress.step === 'done' || progress.step === 'error') {
      progressMap.get(sessionId).done = true;
    }
  }).catch(err => {
    console.error('Generation error:', err);
    progressMap.set(sessionId, { step: 'error', message: err.message, done: true });
  });

  res.json({ sessionId });
});

/**
 * SSE эндпоинт для отслеживания прогресса
 */
router.get('/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendProgress = () => {
    const progress = progressMap.get(sessionId);
    if (progress) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
      if (progress.done) {
        clearInterval(interval);
        res.end();
        // Удаляем из карты через некоторое время
        setTimeout(() => progressMap.delete(sessionId), 10000);
      }
    } else {
      res.write(`data: ${JSON.stringify({ step: 'error', message: 'Сессия не найдена' })}\n\n`);
      clearInterval(interval);
      res.end();
    }
  };

  const interval = setInterval(sendProgress, 1000);
  sendProgress();

  req.on('close', () => {
    clearInterval(interval);
  });
});

module.exports = router;
