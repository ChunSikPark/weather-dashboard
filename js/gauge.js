/**
 * Semicircular SVG gauge with animated needle.
 * Usage: createGauge(containerId, { label, min, max, unit, decimals })
 *        updateGauge(containerId, value)
 */

const _gaugeInstances = {};

function createGauge(containerId, opts = {}) {
  const { label = '', min = 0, max = 100, unit = '', decimals = 1 } = opts;
  const container = document.getElementById(containerId);
  if (!container) return;

  const cx = 100, cy = 90, r = 70;

  function arcPoint(angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const arcStart = arcPoint(180);
  const arcEnd = arcPoint(0);
  const trackPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

  // Build HTML
  container.innerHTML = `
    <span class="micro-label">${label}</span>
    <svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg">
      <path d="${trackPath}" fill="none" stroke="var(--bg-surface-2)" stroke-width="8" stroke-linecap="round" />
      <path d="${trackPath}" fill="none" stroke="var(--cyan)" stroke-width="8" stroke-linecap="round" opacity="0.2" />
      ${[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const angle = 180 + pct * 180;
        const rad = (angle * Math.PI) / 180;
        const inner = { x: cx + (r - 12) * Math.cos(rad), y: cy + (r - 12) * Math.sin(rad) };
        const outer = { x: cx + (r - 4) * Math.cos(rad), y: cy + (r - 4) * Math.sin(rad) };
        return `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="var(--text-tertiary)" stroke-width="1" />`;
      }).join('')}
      <text x="${arcStart.x - 5}" y="${cy + 14}" fill="var(--text-tertiary)" font-size="9" text-anchor="end" font-family="var(--font-mono)">${min}</text>
      <text x="${arcEnd.x + 5}" y="${cy + 14}" fill="var(--text-tertiary)" font-size="9" text-anchor="start" font-family="var(--font-mono)">${max}</text>
      <line id="${containerId}-needle" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 55}" stroke="var(--cyan)" stroke-width="2" stroke-linecap="round" />
      <circle cx="${cx}" cy="${cy}" r="4" fill="var(--cyan)" />
    </svg>
    <div class="readout">
      <span class="value mono" id="${containerId}-value">--</span>
      <span class="unit">${unit}</span>
    </div>
  `;

  _gaugeInstances[containerId] = { min, max, decimals, cx, cy, currentAngle: -90 };
}

function updateGauge(containerId, value) {
  const inst = _gaugeInstances[containerId];
  if (!inst) return;

  const { min, max, decimals, cx, cy } = inst;
  const needle = document.getElementById(`${containerId}-needle`);
  const valueEl = document.getElementById(`${containerId}-value`);
  if (!needle || !valueEl) return;

  if (value === null || value === undefined || isNaN(value)) {
    valueEl.textContent = '--';
    // Point needle to min
    const rad = (-180 * Math.PI) / 180;
    needle.setAttribute('x2', cx + 55 * Math.cos(rad));
    needle.setAttribute('y2', cy + 55 * Math.sin(rad));
    return;
  }

  const clamped = Math.min(Math.max(value, min), max);
  const pct = (clamped - min) / (max - min);
  // -90 deg (left/min) to +90 deg (right/max), but in SVG coords
  const angleDeg = pct * 180 - 180; // -180 (left) to 0 (right)
  const rad = (angleDeg * Math.PI) / 180;

  needle.setAttribute('x2', cx + 55 * Math.cos(rad));
  needle.setAttribute('y2', cy + 55 * Math.sin(rad));
  needle.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

  valueEl.textContent = value.toFixed(decimals);
}
