# Weather Operations Dashboard

SCADA-style weather and grid operations dashboard for power system simulation. View real-time-like weather conditions, grid status, and simulated public reactions across 10 US ISO regions.

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

### Grid Operations
- **Grid Status Bar** — Demand (GW), Reserves (MW), Reserve Margin (%), Frequency (Hz), LMP ($/MWh)
- Values color-coded: amber for warning thresholds, red for critical conditions
- 6 injected critical scenarios modeled after real-world grid events (ERCOT emergency, SPP overgeneration, CAISO duck curve, MISO icing, PJM misoperation, ISO-NE fuel shortage)

### Weather
- **Clickable ISO Map** — 10 US regions (ERCOT, CAISO, MISO, PJM, etc.), click to switch
- **Wind Gauges** — Wind speed at 100m hub height and surface level
- **Compass Rose** — Wind direction with cardinal readout (e.g., 153 SSE)
- **Solar Irradiance** — Estimated from cloud cover + solar position model
- **Cloud Cover** — Percentage gauge
- **Time-Series Charts** — Progressive history that builds up like a live feed

### Live Feed
- **Simulated social media feed** — Template-based synthetic tweets from 4 personas reacting to grid conditions
  - **Journalist** — Breaking news, analysis, context (@SarahEnergyBeat, @GridWatchMike)
  - **Citizen** — Personal reactions, complaints, concerns (regionally matched handles)
  - **Business** — Datacenter ops, manufacturers, cost impact (@AWS_CloudStatus, @GoogleCloud_Ops)
  - **Legal/Political** — Consumer rights, regulatory accountability, class action (@Sen_GridOversight, @ConsumerPowerLaw)
- **News ticker** — Scrolling banner for minor grid events
- **HOI4-style news popups** — Critical events pause playback with a dramatic alert overlay; dismiss to resume
- **Weather-aware tweets** — Storm warnings, wind surges, cloud changes trigger contextual posts
- Feed is silent during normal conditions — only activates when something notable happens

### Playback
- Play/pause, step forward/back, timeline scrubber
- Speed control: 1x, 2x, 5x
- Shared timeline across all ISOs — switching regions preserves your position

## Design

Black/white/cyan dark theme matching the [Lattice Power Grid Simulator](https://tamu-twin.onrender.com/texas).

## Data

- 10 ISO regions, 209 hourly timesteps (2026-03-18 to 2026-04-03, March shoulder season)
- Weather data from NOAA forecast via PowerWorld Simulator
- Solar irradiance estimated (clear-sky model attenuated by cloud cover)
- Grid operations data with demand, generation, frequency, LMP, reserves, and grid condition flags

## Tech Stack

- Plain HTML/CSS/JS (no build step, no Node.js)
- [D3.js v7](https://d3js.org/) — map and SVG components
- [Chart.js v4](https://www.chartjs.org/) — time-series charts
