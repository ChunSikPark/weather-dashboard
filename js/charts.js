/**
 * Time-series charts using Chart.js with current-timestep vertical marker.
 * Usage: createTimeChart(canvasId, { yLabel, chartLabel })
 *        updateTimeChart(canvasId, labels, data)
 *        updateTimeChartMarker(canvasId, timestep)
 */

const _chartInstances = {};

// Plugin: draw vertical dashed line at current timestep
const verticalLinePlugin = {
  id: 'currentTimeLine',
  afterDraw(chart) {
    const step = chart._currentTimestep;
    if (step === undefined || step === null) return;

    const meta = chart.getDatasetMeta(0);
    if (!meta.data[step]) return;

    const x = meta.data[step].x;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    // Small dot at data point
    const y = meta.data[step].y;
    if (y !== undefined && !isNaN(y)) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
    }

    ctx.restore();
  }
};

Chart.register(verticalLinePlugin);

function createTimeChart(canvasId, opts = {}) {
  const { yLabel = '', chartLabel = '' } = opts;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: chartLabel,
        data: [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.08)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHitRadius: 8,
        fill: true,
        tension: 0.3,
        spanGaps: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          ticks: {
            color: '#8891a8',
            font: { family: "'JetBrains Mono', monospace", size: 10 },
            maxTicksLimit: 10,
            maxRotation: 0,
          },
          grid: { color: 'rgba(28, 29, 31, 0.5)' },
          border: { color: '#1c1d1f' },
        },
        y: {
          title: {
            display: true,
            text: yLabel,
            color: '#8891a8',
            font: { family: "'Inter', sans-serif", size: 11 },
          },
          ticks: {
            color: '#8891a8',
            font: { family: "'JetBrains Mono', monospace", size: 10 },
          },
          grid: { color: 'rgba(28, 29, 31, 0.5)' },
          border: { color: '#1c1d1f' },
          beginAtZero: true,
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#161a24',
          borderColor: '#1c1d1f',
          borderWidth: 1,
          titleColor: '#e0e4ef',
          bodyColor: '#e0e4ef',
          titleFont: { family: "'Inter', sans-serif" },
          bodyFont: { family: "'JetBrains Mono', monospace" },
        }
      }
    }
  });

  chart._currentTimestep = 0;
  _chartInstances[canvasId] = chart;
}

function updateTimeChart(canvasId, labels, data) {
  const chart = _chartInstances[canvasId];
  if (!chart) return;

  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update('none');
}

function updateTimeChartMarker(canvasId, timestep) {
  const chart = _chartInstances[canvasId];
  if (!chart) return;

  chart._currentTimestep = timestep;
  chart.draw();
}
