/**
 * Wind direction compass rose with animated arrow.
 * Usage: createCompass(containerId)
 *        updateCompass(containerId, degrees)
 */

const _compassInstances = {};

const CARDINAL_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

function toCardinal(deg) {
  const idx = Math.round(deg / 22.5) % 16;
  return CARDINAL_DIRS[idx];
}

function createCompass(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const cx = 80, cy = 80, r = 60;
  const cardinals = [
    { label: 'N', angle: 0 },
    { label: 'E', angle: 90 },
    { label: 'S', angle: 180 },
    { label: 'W', angle: 270 },
  ];

  let cardinalLabels = '';
  for (const { label, angle } of cardinals) {
    const rad = ((angle - 90) * Math.PI) / 180;
    const x = cx + (r + 12) * Math.cos(rad);
    const y = cy + (r + 12) * Math.sin(rad);
    const fill = label === 'N' ? 'var(--cyan)' : 'var(--text-tertiary)';
    cardinalLabels += `<text x="${x}" y="${y}" fill="${fill}" font-size="11" font-weight="600" font-family="var(--font-mono)" text-anchor="middle" dominant-baseline="central">${label}</text>`;
  }

  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const angle = i * 30;
    const rad = ((angle - 90) * Math.PI) / 180;
    const isMajor = angle % 90 === 0;
    const innerR = isMajor ? r - 12 : r - 8;
    ticks += `<line x1="${cx + innerR * Math.cos(rad)}" y1="${cy + innerR * Math.sin(rad)}" x2="${cx + (r - 2) * Math.cos(rad)}" y2="${cy + (r - 2) * Math.sin(rad)}" stroke="var(--text-tertiary)" stroke-width="${isMajor ? 1.5 : 0.75}" />`;
  }

  container.innerHTML = `
    <span class="micro-label">WIND DIRECTION</span>
    <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border)" stroke-width="1.5" />
      <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="none" stroke="var(--bg-surface-2)" stroke-width="0.5" />
      ${cardinalLabels}
      ${ticks}
      <g id="${containerId}-arrow" transform="rotate(0, ${cx}, ${cy})" style="transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
        <line x1="${cx}" y1="${cy + 20}" x2="${cx}" y2="${cy - r + 16}" stroke="var(--cyan)" stroke-width="2" stroke-linecap="round" />
        <polygon points="${cx},${cy - r + 10} ${cx - 6},${cy - r + 22} ${cx + 6},${cy - r + 22}" fill="var(--cyan)" />
      </g>
      <circle cx="${cx}" cy="${cy}" r="3" fill="var(--cyan)" />
    </svg>
    <div class="readout">
      <span class="value mono" id="${containerId}-value">--°</span>
      <span class="cardinal" id="${containerId}-cardinal"></span>
    </div>
  `;

  _compassInstances[containerId] = { cx: 80, cy: 80, currentRotation: 0 };
}

function updateCompass(containerId, degrees) {
  const inst = _compassInstances[containerId];
  if (!inst) return;

  const arrow = document.getElementById(`${containerId}-arrow`);
  const valueEl = document.getElementById(`${containerId}-value`);
  const cardinalEl = document.getElementById(`${containerId}-cardinal`);
  if (!arrow || !valueEl || !cardinalEl) return;

  if (degrees === null || degrees === undefined || isNaN(degrees)) {
    valueEl.textContent = '--°';
    cardinalEl.textContent = '';
    return;
  }

  // Shortest rotation path
  let current = inst.currentRotation;
  let target = degrees;
  let diff = target - (current % 360);
  if (diff > 180) target = current + diff - 360;
  else if (diff < -180) target = current + diff + 360;
  else target = current + diff;

  inst.currentRotation = target;
  arrow.setAttribute('transform', `rotate(${target}, ${inst.cx}, ${inst.cy})`);
  valueEl.textContent = `${Math.round(degrees)}°`;
  cardinalEl.textContent = toCardinal(degrees);
}
