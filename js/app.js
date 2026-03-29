/**
 * Main application entry point.
 * Loads data, initializes all components, wires state subscriptions.
 */

(async function main() {
  // ── Load GeoJSON ──
  const geojsonResp = await fetch('data/iso-regions.geojson');
  State.geojson = await geojsonResp.json();

  // ── Load CSV data for all ISOs ──
  const isoNames = [
    'CAISO', 'ERCOT', 'ISO-NE', 'MISO', 'NYISO',
    'Northwest', 'PJM', 'SPP', 'Southeast', 'Southwest'
  ];

  const NO_DATA = -9999;

  function cleanValue(v) {
    if (v === '' || v === undefined || v === null) return null;
    const num = +v;
    if (isNaN(num) || num === NO_DATA || num <= -9999) return null;
    return num;
  }

  // Approximate latitude per ISO region (for solar position estimate)
  const ISO_LAT = {
    'CAISO': 36.5, 'ERCOT': 31.0, 'ISO-NE': 42.5, 'MISO': 40.0,
    'NYISO': 42.0, 'Northwest': 46.0, 'PJM': 39.5, 'SPP': 35.5,
    'Southeast': 33.0, 'Southwest': 34.0
  };
  const ISO_LON = {
    'CAISO': -119.5, 'ERCOT': -97.5, 'ISO-NE': -71.5, 'MISO': -90.0,
    'NYISO': -74.5, 'Northwest': -120.0, 'PJM': -78.0, 'SPP': -98.0,
    'Southeast': -84.0, 'Southwest': -111.0
  };

  /**
   * Synthetic GHI from solar position + cloud cover.
   * Uses a simplified clear-sky model:
   *   solar_elevation -> clear_sky_GHI (~1000 W/m² at zenith)
   *   cloud attenuation: GHI *= (1 - 0.75 * (cloud/100)^3.4)
   */
  function syntheticGHI(datetimeStr, cloudPct, lat, lon) {
    const dt = new Date(datetimeStr);
    const dayOfYear = Math.floor((dt - new Date(dt.getUTCFullYear(), 0, 0)) / 86400000);
    const hourUTC = dt.getUTCHours() + dt.getUTCMinutes() / 60;

    // Solar declination (degrees)
    const decl = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
    const declRad = decl * Math.PI / 180;
    const latRad = lat * Math.PI / 180;

    // Hour angle (degrees, solar noon = 0)
    const solarNoonUTC = 12 - lon / 15; // approximate
    const hourAngle = (hourUTC - solarNoonUTC) * 15;
    const haRad = hourAngle * Math.PI / 180;

    // Solar elevation angle
    const sinElev = Math.sin(latRad) * Math.sin(declRad) +
                    Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
    const elevDeg = Math.asin(Math.max(-1, Math.min(1, sinElev))) * 180 / Math.PI;

    if (elevDeg <= 0) return 0; // nighttime

    // Clear-sky GHI (simplified)
    const clearSkyGHI = 1000 * Math.sin(elevDeg * Math.PI / 180);

    // Cloud attenuation
    const cloud = cloudPct !== null ? cloudPct / 100 : 0;
    const attenuation = 1 - 0.75 * Math.pow(cloud, 3.4);

    return Math.max(0, Math.round(clearSkyGHI * attenuation));
  }

  const loadPromises = isoNames.map(async (iso) => {
    const url = `data/weather_${iso}.csv`;
    try {
      const rows = await d3.csv(url);
      const lat = ISO_LAT[iso] || 35;
      const lon = ISO_LON[iso] || -95;

      State.weatherData[iso] = rows.map(row => {
        const cloudPct = cleanValue(row.cloud_cover_pct);
        const realDHI = cleanValue(row.dhi_wm2);
        // Use real DHI if available, otherwise synthetic
        const ghi = realDHI !== null ? realDHI : syntheticGHI(row.datetime_utc, cloudPct, lat, lon);

        return {
          datetime_utc: row.datetime_utc,
          wind_speed_mph: cleanValue(row.wind_speed_mph),
          wind_speed_100m_mph: cleanValue(row.wind_speed_100m_mph),
          wind_direction: cleanValue(row.wind_direction),
          dhi_wm2: ghi,
          cloud_cover_pct: cloudPct,
        };
      });
    } catch (e) {
      console.warn(`Failed to load ${url}:`, e);
    }
  });

  await Promise.all(loadPromises);
  State.isoList = Object.keys(State.weatherData).sort();

  // ── Initialize Components ──

  // Map
  createMap('map-container', State.geojson, (iso) => State.setISO(iso));

  // Wind gauges
  createGauge('gauge-wind100m', { label: 'WIND SPEED (100M)', min: 0, max: 50, unit: 'mph', decimals: 1 });
  createGauge('gauge-wind-surface', { label: 'WIND SPEED (SURFACE)', min: 0, max: 50, unit: 'mph', decimals: 1 });

  // Compass
  createCompass('compass');

  // Solar gauges
  createGauge('gauge-dhi', { label: 'SOLAR IRRADIANCE (EST.)', min: 0, max: 1000, unit: 'W/m²', decimals: 0 });
  createGauge('gauge-cloud', { label: 'CLOUD COVER', min: 0, max: 100, unit: '%', decimals: 0 });

  // Charts
  createTimeChart('chart-wind', { yLabel: 'mph', chartLabel: 'Wind Speed (100m)' });
  createTimeChart('chart-solar', { yLabel: 'W/m²', chartLabel: 'Solar Irradiance (Estimated)' });

  // Playback
  initPlayback();

  // ── Chart update: only show data up to current timestep ──
  function updateCharts() {
    const ts = State.isoTimeseries;
    const step = State.currentTimestep;

    // Slice data from 0 to current timestep (inclusive)
    const slice = ts.slice(0, step + 1);

    const labels = slice.map(r => {
      const d = new Date(r.datetime_utc);
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const h = String(d.getUTCHours()).padStart(2, '0');
      return `${m}/${day} ${h}:00`;
    });

    updateTimeChart('chart-wind', labels, slice.map(r => r.wind_speed_100m_mph));
    updateTimeChart('chart-solar', labels, slice.map(r => r.dhi_wm2));

    // Marker is always at the last point (the "now" line)
    updateTimeChartMarker('chart-wind', slice.length - 1);
    updateTimeChartMarker('chart-solar', slice.length - 1);
  }

  // ── State Subscription ──
  State.subscribe((state) => {
    // Header
    document.getElementById('selected-iso-label').textContent = state.selectedISO;

    // Map
    updateMapSelection(state.selectedISO);

    // Gauges
    const d = state.currentData;
    if (d) {
      updateGauge('gauge-wind100m', d.wind_speed_100m_mph);
      updateGauge('gauge-wind-surface', d.wind_speed_mph);
      updateCompass('compass', d.wind_direction);
      updateGauge('gauge-dhi', d.dhi_wm2);
      updateGauge('gauge-cloud', d.cloud_cover_pct);
    }

    // Update charts with data up to current timestep
    updateCharts();
  });

  // Update charts when ISO changes
  const originalSetISO = State.setISO.bind(State);
  State.setISO = function(iso) {
    originalSetISO(iso);
    updateCharts();
  };

  // Initial render (starts empty — just timestep 0)
  State._notify();

})();
