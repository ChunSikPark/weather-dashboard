# Weather Dashboard — Agent Guide

## What This Is

A standalone SCADA-style weather dashboard prototype for power system operation simulation. Users click ISO regions on a US map and view wind/solar weather conditions via gauges, compass, and time-series charts with playback controls. Built to pitch to the Lattice (tamu-twin.onrender.com) team for potential integration.

## Tech Stack

- **Plain HTML/CSS/JS** — no build step, no Node.js, no framework
- **D3.js v7** (CDN) — ISO map rendering, SVG manipulation
- **Chart.js v4** (CDN) — time-series line charts
- **Python 3** — data processing scripts only (not runtime)

## Project Structure

```
weather-dashboard/
├── index.html              # Single-page dashboard (entry point)
├── css/
│   ├── tokens.css          # Design tokens + CSS reset (black/white/cyan theme)
│   └── dashboard.css       # Layout, component, and playback styles
├── data/
│   ├── iso-regions.geojson # 10 ISO region polygons (from shapefile via Python)
│   ├── weather_{ISO}.csv   # Per-ISO weather data (10 files)
│   └── weather_by_iso.csv  # Combined file (not used by dashboard)
├── js/
│   ├── state.js            # Global state: selected ISO, timestep, playback, observer pattern
│   ├── gauge.js            # createGauge() / updateGauge() — semicircular SVG gauges
│   ├── compass.js          # createCompass() / updateCompass() — wind direction compass rose
│   ├── charts.js           # createTimeChart() / updateTimeChart() — Chart.js wrappers
│   ├── map.js              # createMap() / updateMapSelection() — D3 clickable ISO map
│   ├── playback.js         # initPlayback() — play/pause, scrubber, speed controls
│   └── app.js              # Main entry: loads data, initializes components, wires state
└── scripts/
    └── process_weather_data.py  # Converts raw weather CSVs to dashboard-ready format
```

## How to Run

```bash
cd weather-dashboard
python -m http.server 8000
# Open http://localhost:8000
```

Cannot open `index.html` directly via `file://` — browsers block CSV fetch from local filesystem.

## Architecture

### Data Flow

1. Raw weather CSVs (from PowerWorld/NOAA) are processed via `scripts/process_weather_data.py`
2. Processed CSVs land in `data/weather_{ISO}.csv`
3. `app.js` loads CSVs at runtime via `d3.csv()`
4. Data is cleaned (sentinel `-9999` → `null`, empty → `null`)
5. Solar irradiance is synthesized from cloud cover + solar position (no real GHI available)
6. State object holds all data; components subscribe to state changes

### State Management (`state.js`)

Single `State` object with observer pattern:
- `State.selectedISO` — current ISO region
- `State.currentTimestep` — current position in timeline (0–208)
- `State.isPlaying` / `State.playbackSpeed` — playback state
- `State.weatherData` — all loaded data keyed by ISO
- `State.subscribe(fn)` — register callback for state changes
- `State._notify()` — triggers all subscribers

All ISOs share the same timeline — switching ISOs preserves the current timestep.

### Component Pattern

Each JS file exports `create*()` and `update*()` functions:
- `create*()` — builds DOM/SVG, called once at init
- `update*()` — refreshes with new data, called on every state change

### Charts — Progressive History

Charts show data only up to the current timestep (not the full dataset). As playback progresses, the chart builds up like a live feed. The cyan vertical marker always sits at the rightmost (most recent) data point.

### Synthetic Solar Irradiance

Real GHI/DHI data is unavailable (NOAA forecast data doesn't include it; PowerWorld has a field name typo). Solar irradiance is estimated using:
- Solar position from timestamp + ISO lat/lon
- Clear-sky GHI model: `1000 * sin(elevation_angle)`
- Cloud attenuation: `GHI *= (1 - 0.75 * (cloud_cover/100)^3.4)`

If real irradiance data becomes available in the CSV (`dhi_wm2` column with valid values), the dashboard will automatically use it instead of the synthetic estimate.

### GeoJSON Generation

`data/iso-regions.geojson` was generated from `ISO_Regions_cleaned.shp` (EPSG:3857 → 4326, simplified at 0.05° tolerance). The ISO name column in the shapefile is `ISO_1`. To regenerate:

```bash
python scripts/generate-geojson.py [path/to/ISO_Regions_cleaned.shp] [output.geojson]
```

## Design System

Matches the Lattice site (tamu-twin.onrender.com):
- **Background:** `#0a0c10` (deep blue-black)
- **Surfaces:** `#10131a`, `#161a24` (layered panels)
- **Text:** `#e0e4ef` (primary), `#8891a8` (secondary)
- **Accent:** `#06b6d4` (cyan — selections, gauges, charts, glows)
- **Fonts:** Inter (body), JetBrains Mono (data/values)
- **Labels:** Uppercase, bold, wide letter-spacing (micro-label style)
- **Corners:** `0.125rem` (sharp, technical)

## Variables Used (5 total)

| Display Name | CSV Column | Unit | Panel |
|-------------|-----------|------|-------|
| Wind Speed (100m) | `wind_speed_100m_mph` | mph | Wind |
| Wind Speed (Surface) | `wind_speed_mph` | mph | Wind |
| Wind Direction | `wind_direction` | degrees | Wind |
| Solar Irradiance (Est.) | `dhi_wm2` (or synthetic) | W/m² | Solar |
| Cloud Cover | `cloud_cover_pct` | % | Solar |

## Common Tasks

### Adding a new variable to the dashboard
1. Ensure the column exists in the CSV files
2. Add it to the data loading in `app.js` (`State.weatherData[iso]` mapping)
3. Add a gauge/display in `index.html`
4. Initialize the gauge in `app.js`
5. Update it in the `State.subscribe()` callback

### Updating weather data
1. Run `scripts/process_weather_data.py` with new source CSVs
2. Output replaces files in `data/`
3. Refresh browser

### Changing the ISO list
1. Update `isoNames` array in `app.js`
2. Ensure matching CSV file exists in `data/`
3. Ensure GeoJSON has matching feature with `ISO` property
