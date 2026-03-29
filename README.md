# Weather Operations Dashboard

SCADA-style weather dashboard for power system operation simulation. View real-time-like weather conditions across 10 US ISO regions that affect wind and solar generation.

## Live Demo

Visit: **https://chunsikpark.github.io/weather-dashboard/**

## Run Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/ChunSikPark/weather-dashboard.git
   cd weather-dashboard
   ```

2. Start a local server (Python required):
   ```bash
   python -m http.server 8000
   ```

3. Open **http://localhost:8000** in your browser.

> You cannot open `index.html` directly — browsers block data loading from `file://`.

## Features

- **Clickable ISO Map** — 10 US regions (ERCOT, CAISO, MISO, PJM, etc.), click to switch
- **Wind Gauges** — Wind speed at 100m hub height and surface level
- **Compass Rose** — Wind direction with cardinal readout (e.g., 153° SSE)
- **Solar Irradiance** — Estimated from cloud cover + solar position model
- **Cloud Cover** — Percentage gauge
- **Time-Series Charts** — Progressive history that builds up like a live feed
- **Playback Controls** — Play/pause, step forward/back, timeline scrubber, 1x/2x/5x speed
- **Shared Timeline** — Switching ISOs preserves your position in time

## Design

Black/white/cyan dark theme matching the [Lattice Power Grid Simulator](https://tamu-twin.onrender.com/texas).

## Data

- 10 ISO regions, 209 hourly timesteps (2026-03-18 to 2026-04-03)
- Wind data from NOAA forecast via PowerWorld Simulator
- Solar irradiance estimated (clear-sky model attenuated by cloud cover)
- See `DATA_FORMAT.md` for input data specification

## Tech Stack

- Plain HTML/CSS/JS (no build step, no Node.js)
- [D3.js v7](https://d3js.org/) — map and SVG components
- [Chart.js v4](https://www.chartjs.org/) — time-series charts
