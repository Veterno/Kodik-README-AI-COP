'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Генерирует HTML-отчёт на основе JSON-данных бенчмарка.
 * @param {string} jsonPath Путь к JSON-файлу с результатами.
 */
async function generateReport(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const resultsDir = path.dirname(jsonPath);
  const { results, config, timestamp } = data;

  // Агрегация данных для графиков
  const modelStats = {};
  results.forEach(res => {
    if (!res.success) return;
    if (!modelStats[res.model]) {
      modelStats[res.model] = { totalScore: 0, count: 0, totalTime: 0 };
    }
    modelStats[res.model].totalScore += res.scores?.overall || 0;
    modelStats[res.model].totalTime += res.generationTimeMs || 0;
    modelStats[res.model].count++;
  });

  const chartLabels = Object.keys(modelStats);
  const chartScores = chartLabels.map(m => (modelStats[m].totalScore / modelStats[m].count).toFixed(2));
  const chartTimes = chartLabels.map(m => (modelStats[m].totalTime / modelStats[m].count / 1000).toFixed(2));

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kodik README AI Benchmark</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f4f7f9; }
        h1, h2 { color: #2c3e50; }
        .card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; }
        .status-success { color: #27ae60; font-weight: bold; }
        .status-error { color: #e74c3c; font-weight: bold; }
        .score-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; background: #3498db; color: white; font-weight: bold; }
        .charts-container { display: flex; gap: 20px; flex-wrap: wrap; }
        .chart-box { flex: 1; min-width: 400px; }
        .meta { font-size: 0.9em; color: #7f8c8d; }
    </style>
</head>
<body>
    <h1>🚀 Kodik README AI Benchmark</h1>
    <p class="meta">Запуск от: ${new Date(timestamp).toLocaleString()} | Версия: ${config.version}</p>

    <div class="charts-container">
        <div class="card chart-box">
            <h2>Средний балл по моделям</h2>
            <canvas id="scoresChart"></canvas>
        </div>
        <div class="card chart-box">
            <h2>Среднее время генерации (сек)</h2>
            <canvas id="timesChart"></canvas>
        </div>
    </div>

    <div class="card">
        <h2>Детальные результаты</h2>
        <table>
            <thead>
                <tr>
                    <th>Репозиторий</th>
                    <th>Модель</th>
                    <th>Статус</th>
                    <th>Балл (Overall)</th>
                    <th>Время (сек)</th>
                    <th>Коммит</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(res => `
                <tr>
                    <td><a href="${res.repoUrl}" target="_blank">${res.repoName}</a></td>
                    <td><code>${res.model}</code></td>
                    <td>
                        <span class="${res.success ? 'status-success' : 'status-error'}">
                            ${res.success ? '✅ OK' : '❌ Fail'}
                        </span>
                    </td>
                    <td>${res.success ? `<span class="score-badge">${res.scores?.overall || 0}</span>` : '-'}</td>
                    <td>${(res.generationTimeMs / 1000).toFixed(2)}s</td>
                    <td><code>${res.commitHash}</code></td>
                </tr>
                ${res.error ? `<tr><td colspan="6" class="status-error" style="font-size: 0.8em;">Ошибка: ${res.error}</td></tr>` : ''}
                `).join('')}
            </tbody>
        </table>
    </div>

    <script>
        const ctxScores = document.getElementById('scoresChart').getContext('2d');
        new Chart(ctxScores, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(chartLabels)},
                datasets: [{
                    label: 'Средний балл (0-10)',
                    data: ${JSON.stringify(chartScores)},
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true, max: 10 } } }
        });

        const ctxTimes = document.getElementById('timesChart').getContext('2d');
        new Chart(ctxTimes, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(chartLabels)},
                datasets: [{
                    label: 'Время (сек)',
                    data: ${JSON.stringify(chartTimes)},
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: { scales: { y: { beginAtZero: true } } }
        });
    </script>
</body>
</html>
  `;

  fs.writeFileSync(path.join(resultsDir, 'index.html'), html);
  console.log(`📊 Отчёт сгенерирован: ${path.join(resultsDir, 'index.html')}`);
}

module.exports = { generateReport };
