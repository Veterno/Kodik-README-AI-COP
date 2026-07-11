'use strict';

const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка безопасности
app.use(cors());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // Лимит 100 запросов с одного IP
  message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже.'
});
app.use('/api/', limiter);

// Настройка статики и парсинга тела запроса (Express 5 встроенные средства)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Маршруты API
app.use('/api', apiRoutes);

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Ошибка: Порт ${PORT} уже занят.`);
  } else {
    console.error('Ошибка сервера:', err.message);
  }
  process.exit(1);
});

