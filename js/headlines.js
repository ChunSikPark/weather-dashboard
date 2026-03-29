/**
 * News headline system — ticker banner for minor events, popup for critical.
 * Usage: initHeadlines(), checkHeadlines(gridRow, weatherRow, iso, timestep)
 */

let _tickerEl = null;
let _popupOverlay = null;
let _popupHeadline = null;
let _popupBody = null;
let _popupDismiss = null;

// ── Handcrafted headlines for the 6 injected scenarios ──
// Keyed by ISO + approximate UTC hour range

const SCENARIO_HEADLINES = [
  {
    iso: 'ERCOT',
    startHour: '2026-03-25T15',
    endHour: '2026-03-25T17',
    headline: 'SEVERE WEATHER ADVISORY — STORM SYSTEM APPROACHING TEXAS',
    body: 'National Weather Service warns of strong winds and unseasonable heat across ERCOT territory. Wind gusts may force turbine shutdowns while demand surges. Grid operators preparing for potential stress.',
  },
  {
    iso: 'ERCOT',
    startHour: '2026-03-25T18',
    endHour: '2026-03-25T23',
    headline: 'ROLLING BLACKOUTS ORDERED AS ERCOT GRID FREQUENCY HITS 59.35 Hz',
    body: 'Reserves collapsed to {reserve_mw} MW ({reserve_pct}%) as multiple generators tripped offline during peak evening demand of {demand_gw} GW. Wholesale prices hit ${lmp}/MWh.',
  },
  {
    iso: 'SPP',
    startHour: '2026-03-22T14',
    endHour: '2026-03-22T20',
    headline: 'WIND AND SOLAR EXCEED TOTAL DEMAND — SPP GRID FREQUENCY SURGES TO {freq} Hz',
    body: 'Renewables producing {renewable_pct}% of SPP demand. {interchange_gw} GW of excess power exported to neighbors. LMP at ${lmp}/MWh.',
  },
  {
    iso: 'CAISO',
    startHour: '2026-03-29T00',
    endHour: '2026-03-29T04',
    headline: 'SOLAR CLIFF TRIGGERS EMERGENCY AS 14 GW DROPS TO ZERO AT SUNSET',
    body: 'CAISO solar generation collapsed from peak to zero in 3 hours. Gas plants unable to ramp fast enough. Reserves at {reserve_mw} MW ({reserve_pct}%). LMP spiked to ${lmp}/MWh.',
  },
  {
    iso: 'MISO',
    startHour: '2026-03-27T02',
    endHour: '2026-03-27T08',
    headline: 'ICE STORM COLLAPSES MIDWEST WIND FLEET — FREQUENCY PLUNGES TO {freq} Hz',
    body: 'Blade icing reduced MISO wind output from 15 GW to 2 GW. Emergency imports of {interchange_gw} GW underway. ACE excursion of {ace} MW. LMP at ${lmp}/MWh.',
  },
  {
    iso: 'PJM',
    startHour: '2026-03-23T14',
    endHour: '2026-03-23T16',
    headline: 'CONTROL SYSTEM ERROR OVER-DISPATCHES 7 GW — PJM SCRAMBLES TO CORRECT',
    body: 'EMS software error caused generation to exceed demand by {overgen_pct}%. Frequency pushed to {freq} Hz. {interchange_gw} GW of excess dumped to neighbors at ${lmp}/MWh.',
  },
  {
    iso: 'ISO-NE',
    startHour: '2026-03-31T12',
    endHour: '2026-03-31T17',
    headline: 'GAS PIPELINE MAXED OUT — NEW ENGLAND GRID DECLARES EMERGENCY',
    body: 'Late-season cold snap maxed gas pipeline capacity. Thermal output limited. Reserves at {reserve_mw} MW ({reserve_pct}%). Emergency imports of {interchange_gw} GW from NYISO. LMP at ${lmp}/MWh.',
  },
];

// ── Generic critical headlines ──
const GENERIC_CRITICAL_HEADLINES = [
  { flag: 'FREQ_EMERGENCY', headline: 'GRID EMERGENCY — {region} FREQUENCY AT {freq} Hz', body: 'Reserves at {reserve_mw} MW ({reserve_pct}%). Demand: {demand_gw} GW. Rolling outages may be in effect.' },
  { flag: 'UFLS_IMMINENT', headline: 'AUTOMATIC LOAD SHEDDING IMMINENT — {region} AT {freq} Hz', body: 'Grid approaching UFLS threshold. Automatic blackouts may trigger within minutes.' },
  { flag: 'UFLS_STEP1_ACTIVE', headline: 'AUTOMATIC LOAD SHEDDING ACTIVATED IN {region}', body: 'UFLS relays have tripped at {freq} Hz. 5% of load automatically disconnected.' },
  { flag: 'SCARCITY_PRICING', headline: 'SCARCITY PRICING — {region} POWER HITS ${lmp}/MWh', body: 'System-wide scarcity. Reserve margin at {reserve_pct}%. Frequency: {freq} Hz.' },
  { flag: 'VOLL_CAP_PRICING', headline: '{region} PRICES HIT $5,000/MWh — SYSTEM CAP REACHED', body: 'Maximum allowed wholesale price. Thats $5/kWh — roughly 40x normal retail rates.' },
  { flag: 'SEVERE_GENERATION_SHORTFALL', headline: 'SEVERE GENERATION SHORTFALL IN {region}', body: 'Only {gen_pct}% of demand being met. {deficit_gw} GW of generation missing. Load shedding in effect.' },
  { flag: 'EEA3_FIRM_LOAD_SHED', headline: 'CONTROLLED POWER OUTAGES BEGIN ACROSS {region}', body: 'Grid operator shedding load to prevent collapse. Demand: {demand_gw} GW. Reserves: {reserve_mw} MW.' },
];

// ── Ticker templates for minor events ──
const TICKER_TEMPLATES = {
  'FREQ_ALERT': '{region} monitoring frequency dip to {freq} Hz — reserves responding',
  'OVERFREQ_ALERT': '{region} frequency elevated to {freq} Hz — governors responding',
  'EEA1_CONSERVATION_APPEAL': 'CONSERVATION APPEAL: {region} asks residents to reduce electricity use — reserves at {reserve_pct}%',
  'HIGH_RENEWABLES': '{region} renewables at {renewable_pct}% of demand — wind {wind_gw} GW, solar {solar_gw} GW',
  'RECORD_RENEWABLES': 'RECORD: {region} renewables hit {renewable_pct}% of demand',
  'LOW_RENEWABLES': '{region} renewables at just {renewable_pct}% — thermal carrying {thermal_gw} GW',
  'LOW_PRICE': '{region} wholesale power at ${lmp}/MWh — surplus generation overnight',
  'HIGH_PRICE': '{region} prices climbing to ${lmp}/MWh as reserves tighten to {reserve_pct}%',
  'MASSIVE_EXPORT': '{region} exporting {interchange_gw} GW to neighboring regions',
};

function initHeadlines() {
  _tickerEl = document.getElementById('ticker-text');
  _popupOverlay = document.getElementById('news-popup-overlay');
  _popupHeadline = document.getElementById('news-popup-headline');
  _popupBody = document.getElementById('news-popup-body');
  _popupDismiss = document.getElementById('news-popup-dismiss');

  _popupDismiss.addEventListener('click', () => {
    _popupOverlay.style.display = 'none';
    State.resumeFromPopup();
  });
}

function checkHeadlines(gridRow, weatherRow, iso, timestep) {
  if (!gridRow) return;

  const conditionStr = gridRow.grid_condition || 'NORMAL';
  const flags = conditionStr.split('|').map(f => f.trim());
  const vars = buildVars(gridRow, weatherRow, iso);
  vars.ace = Math.abs(Math.round(gridRow.ace_mw || 0)).toLocaleString();

  // ── Check for critical popup ──
  const dtStr = gridRow.datetime_utc.substring(0, 13); // "2026-03-25T18" format
  const popupKey = iso + '_' + dtStr;

  if (!State.shownPopups.has(popupKey)) {
    // Check scenario-specific headlines first
    for (const scenario of SCENARIO_HEADLINES) {
      if (scenario.iso === iso && dtStr >= scenario.startHour && dtStr <= scenario.endHour) {
        State.shownPopups.add(popupKey);
        // Mark all hours in this scenario as shown
        for (let h = parseInt(scenario.startHour.slice(-2)); h <= parseInt(scenario.endHour.slice(-2)); h++) {
          const padH = String(h).padStart(2, '0');
          State.shownPopups.add(iso + '_' + scenario.startHour.substring(0, 11) + padH);
        }
        showPopup(fillTemplate(scenario.headline, vars), fillTemplate(scenario.body, vars));
        return;
      }
    }

    // Check generic critical headlines
    for (const generic of GENERIC_CRITICAL_HEADLINES) {
      if (flags.includes(generic.flag) && !State.shownPopups.has(iso + '_' + generic.flag + '_' + timestep)) {
        State.shownPopups.add(popupKey);
        State.shownPopups.add(iso + '_' + generic.flag + '_' + timestep);
        showPopup(fillTemplate(generic.headline, vars), fillTemplate(generic.body, vars));
        return;
      }
    }
  }

  // ── Update ticker for minor/moderate events ──
  if (conditionStr !== 'NORMAL') {
    for (const flag of flags) {
      if (TICKER_TEMPLATES[flag]) {
        updateTicker(fillTemplate(TICKER_TEMPLATES[flag], vars));
        return;
      }
    }
    // Generic ticker for unmatched non-normal conditions
    updateTicker(`${iso} grid condition: ${conditionStr.replace(/\|/g, ' | ')} — Freq: ${vars.freq} Hz`);
  } else {
    updateTicker(`${iso} — Normal operations. Demand ${vars.demand_gw} GW | Wind ${vars.wind_gw} GW | LMP $${vars.lmp}/MWh`);
  }
}

function showPopup(headline, body) {
  _popupHeadline.textContent = headline;
  _popupBody.textContent = body;
  _popupOverlay.style.display = 'flex';
  State.pauseForPopup();
}

function updateTicker(text) {
  if (!_tickerEl) return;
  // Only update if text changed (avoid resetting animation)
  if (_tickerEl.textContent !== text) {
    _tickerEl.textContent = text;
  }
}
