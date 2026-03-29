# Weather Dashboard — Agent Guide

## What This Is

A standalone SCADA-style weather and grid operations dashboard prototype for power system simulation. Users click ISO regions on a US map and view weather conditions, grid status (demand/reserves/frequency/LMP), and a live social media feed with synthetic tweets reacting to grid events. Built to pitch to the Lattice (tamu-twin.onrender.com) team for potential integration.

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
│   └── dashboard.css       # Layout, component, feed, popup styles
├── data/
│   ├── iso-regions.geojson # 10 ISO region polygons (from shapefile via Python)
│   ├── weather_{ISO}.csv   # Per-ISO weather data (10 files)
│   └── grid_ops_{ISO}.csv  # Per-ISO grid operations data (10 files)
├── js/
│   ├── state.js            # Global state: ISO, timestep, playback, grid ops, feed, observer pattern
│   ├── gauge.js            # createGauge() / updateGauge() — semicircular SVG gauges
│   ├── compass.js          # createCompass() / updateCompass() — wind direction compass rose
│   ├── charts.js           # createTimeChart() / updateTimeChart() — Chart.js wrappers
│   ├── map.js              # createMap() / updateMapSelection() — D3 clickable ISO map
│   ├── playback.js         # initPlayback() — play/pause, scrubber, speed controls
│   ├── tweets.js           # Tweet template library + generation engine (4 personas)
│   ├── feed.js             # initFeed() / addTweets() / clearFeed() — feed panel UI
│   ├── headlines.js        # initHeadlines() / checkHeadlines() — ticker + news popup
│   └── app.js              # Main entry: loads all data, initializes components, wires state
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

1. Weather CSVs and grid ops CSVs loaded at runtime via `d3.csv()`
2. Weather data cleaned (sentinel `-9999` -> `null`, empty -> `null`)
3. Solar irradiance synthesized from cloud cover + solar position (no real GHI available)
4. Grid ops data loaded in parallel with ISO-to-filename mapping (note: `grid_ops_ISO_NE.csv` uses underscore, while ISO key is `ISO-NE` with hyphen)
5. State object holds all data; components subscribe to state changes
6. On each timestep change: gauges update, charts extend, tweets generate, headlines check

### State Management (`state.js`)

Single `State` object with observer pattern:
- `State.selectedISO` — current ISO region
- `State.currentTimestep` — current position in timeline (0-208)
- `State.isPlaying` / `State.playbackSpeed` — playback state
- `State.weatherData` — weather data keyed by ISO
- `State.gridOpsData` — grid operations data keyed by ISO
- `State.currentGridOps` — computed: current timestep grid ops for selected ISO
- `State.feedTweets` — accumulated tweet objects
- `State.shownPopups` — Set tracking which news popups have been shown
- `State.pauseForPopup()` / `State.resumeFromPopup()` — HOI4-style pause/resume
- `State.subscribe(fn)` — register callback for state changes

All ISOs share the same timeline — switching ISOs preserves the current timestep.

### Component Pattern

Each JS file exports `create*()` and `update*()` functions:
- `create*()` — builds DOM/SVG, called once at init
- `update*()` — refreshes with new data, called on every state change

### Charts — Progressive History

Charts show data only up to the current timestep (not the full dataset). As playback progresses, the chart builds up like a live feed. The cyan vertical marker always sits at the rightmost (most recent) data point.

### Live Feed System

**Tweet Generation (`tweets.js`):**
- Template-based — no AI/API needed, fully deterministic
- 4 personas: journalist, citizen, business (datacenters/manufacturers), legal/political
- Frequency: 0 during normal, 1-2 moderate events, 3-4 critical events
- Weather-aware: detects wind surges, drops, cloud changes, storms from weather data
- Templates filled with real numbers from grid ops data ({freq}, {demand_gw}, {lmp}, etc.)
- `buildVars(gridRow, weatherRow, iso)` is global — also used by `headlines.js`

**Feed Panel (`feed.js`):**
- Right column of the 3-column layout (map | data | feed)
- Slide-in animation for new tweets, max 50 stored
- Cleared and regenerated when switching ISOs

**Headlines (`headlines.js`):**
- Ticker banner: one-line scrolling text for minor events
- News popup: centered modal for critical events, pauses playback, dismiss resumes
- 7 handcrafted scenario headlines (6 grid scenarios + 1 ERCOT weather advisory)
- Generic critical headlines for non-scenario flags
- De-duplicated via `State.shownPopups`

### Grid Status Display

Demand, Reserves, Reserve Margin, Frequency, and LMP shown at top of data panels. Values color-coded:
- Normal: white
- Warning (amber): frequency 59.9-60.1 Hz range, reserves 3-6%, LMP > $100
- Critical (red): frequency < 59.75 or > 60.25 Hz, reserves < 3%, LMP > $500

### Synthetic Solar Irradiance

Real GHI/DHI data is unavailable (NOAA forecast data doesn't include it). Solar irradiance is estimated using:
- Solar position from timestamp + ISO lat/lon
- Clear-sky GHI model: `1000 * sin(elevation_angle)`
- Cloud attenuation: `GHI *= (1 - 0.75 * (cloud_cover/100)^3.4)`

If real irradiance data becomes available in the CSV (`dhi_wm2` column with valid values), the dashboard will automatically use it instead.

### GeoJSON Generation

`data/iso-regions.geojson` was generated from `ISO_Regions_cleaned.shp` (EPSG:3857 -> 4326, simplified at 0.05 degree tolerance). The ISO name column in the shapefile is `ISO_1`.

## Design System

Matches the Lattice site (tamu-twin.onrender.com):
- **Background:** `#0a0c10` (deep blue-black)
- **Surfaces:** `#10131a`, `#161a24` (layered panels)
- **Text:** `#e0e4ef` (primary), `#8891a8` (secondary)
- **Accent:** `#06b6d4` (cyan — selections, gauges, charts, glows)
- **Fonts:** Inter (body), JetBrains Mono (data/values)
- **Labels:** Uppercase, bold, wide letter-spacing (micro-label style)
- **Corners:** `0.125rem` (sharp, technical)

## Common Tasks

### Adding a new tweet persona
1. Add handles to `HANDLES` object in `js/tweets.js`
2. Add templates for the persona under relevant condition keys in `TEMPLATES`
3. Add the persona to `getHandle()` function
4. Add to persona pool logic in `generateTweets()`

### Adding a new grid scenario headline
1. Add entry to `SCENARIO_HEADLINES` array in `js/headlines.js` with iso, startHour, endHour, headline, body
2. The body can use template variables like `{freq}`, `{demand_gw}`, `{lmp}`, etc.

### Adding a new variable to the dashboard
1. Ensure the column exists in the CSV files
2. Add it to the data loading in `app.js`
3. Add a gauge/display in `index.html`
4. Initialize the gauge in `app.js`
5. Update it in the `State.subscribe()` callback

### Updating data
1. Run `scripts/process_weather_data.py` with new source CSVs
2. Copy new grid ops CSVs to `data/`
3. Refresh browser

### Changing the ISO list
1. Update `isoNames` array in `app.js`
2. Update `gridOpsFileMap` in `app.js` (note underscore vs hyphen in filenames)
3. Ensure matching CSV files exist in `data/`
4. Ensure GeoJSON has matching feature with `ISO` property
5. Add lat/lon to `ISO_LAT` / `ISO_LON` in `app.js`
6. Add timezone to `ISO_TZ` in `js/tweets.js`
7. Add handles to `HANDLES.citizen` in `js/tweets.js`
