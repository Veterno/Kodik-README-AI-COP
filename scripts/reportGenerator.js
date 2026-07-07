'use strict';

const fs = require('fs');
const path = require('path');

function generate(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const results = data.results.filter(r => r.success);
  
  // Агрегация данных для графиков
  const models = [...new Set(results.map(r => r.model))];
  const metrics = ['accuracy', 'clarity', 'completeness', 'hallucinations'];
  
  const modelStats = models.map(model => {
    const modelResults = results.filter(r => r.model === model);
    const stats = {};
    metrics.forEach(metric => {
      const avg = modelResults.reduce((sum, r) => sum + r.scores[metric], 0) / modelResults.length;
      stats[metric] = avg.toFixed(2);
    });
    return { model, stats };
  });

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kodik README AI Benchmark Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f4f7f9; }
        .card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }
        h1, h2 { color: #2c3e50; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; }
        .score { font-weight: bold; }
        .score-high { color: #27ae60; }
        .score-mid { color: #f39c12; }
        .score-low { color: #e74c3c; }
        .chart-container { position: relative; height: 400px; width: 100%; }
    </style>
</head>
<body>
    <h1>Отчёт о бенчмаркинге Kodik README AI</h1>
    <p>Дата запуска: ${new Date(data.timestamp).toLocaleString()}</p>

    <div class="card">
        <h2>Сравнение моделей</h2>
        <div class="chart-container">
            <canvas id="modelChart"></canvas>
        </div>
    </div>

    <div class="card">
        <h2>Детальные результаты</h2>
        <table>
            <thead>
                <tr>
                    <th>Репозиторий</th>
                    <th>Модель</th>
                    <th>Accuracy</th>
                    <th>Clarity</th>
                    <th>Completeness</th>
                    <th>Hallucinations</th>
                    <th>Время (сек)</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(r => `
                <tr>
                    <td>${r.repoName}</td>
                    <td>${r.model}</td>
                    <td class="score ${getScoreClass(r.scores.accuracy)}">${r.scores.accuracy}</td>
                    <td class="score ${getScoreClass(r.scores.clarity)}">${r.scores.clarity}</td>
                    <td class="score ${getScoreClass(r.scores.completeness)}">${r.scores.completeness}</td>
                    <td class="score ${getScoreClass(r.scores.hallucinations, true)}">${r.scores.hallucinations}</td>
                    <td>${(r.generationTimeMs / 1000).toFixed(1)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <script>
        const ctx = document.getElementById('modelChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(metrics)},
                datasets: ${JSON.stringify(modelStats.map(ms => ({
                  label: ms.model,
                  data: metrics.map(m => ms.stats[m]),
                  borderWidth: 1
                })))}
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 10 }
                }
            }
        });
    </script>
</body>
</html>
  `;

  const reportPath = path.join(path.dirname(jsonPath), 'index.html');
  fs.writeFileSync(reportPath, html);
  console.log(`HTML-отчёт создан: ${reportPath}`);
}

function getScoreClass(score, inverted = false) {
  if (inverted) {
    if (score <= 2) return 'score-high';
    if (score <= 5) return 'score-mid';
    return 'score-low';
  }
  if (score >= 8) return 'score-high';
  if (score >= 5) return 'score-mid';
  return 'score-low';
}

module.exports = { generate };
