# Input Data Format Specification

This document describes the expected format for data files consumed by the dashboard.

## Weather Data

### File Naming

```
data/weather_{ISO_NAME}.csv
```

Where `{ISO_NAME}` matches the ISO region identifier exactly (case-sensitive):

| ISO Name | File |
|----------|------|
| CAISO | `weather_CAISO.csv` |
| ERCOT | `weather_ERCOT.csv` |
| ISO-NE | `weather_ISO-NE.csv` |
| MISO | `weather_MISO.csv` |
| NYISO | `weather_NYISO.csv` |
| Northwest | `weather_Northwest.csv` |
| PJM | `weather_PJM.csv` |
| SPP | `weather_SPP.csv` |
| Southeast | `weather_Southeast.csv` |
| Southwest | `weather_Southwest.csv` |

### Required Columns

| Column | Type | Unit | Description |
|--------|------|------|-------------|
| `datetime_utc` | ISO 8601 datetime with timezone | -- | Timestamp (e.g., `2026-03-18 00:00:00+00:00`) |
| `wind_speed_mph` | float | mph | Surface-level wind speed |
| `wind_speed_100m_mph` | float | mph | Wind speed at 100m hub height |
| `wind_direction` | float | degrees (0-360, meteorological) | Direction wind is coming FROM (0=N, 90=E, 180=S, 270=W) |
| `cloud_cover_pct` | float | % (0-100) | Cloud cover percentage |

### Optional Columns

| Column | Type | Unit | Description |
|--------|------|------|-------------|
| `dhi_wm2` | float | W/m2 | Direct Horizontal Irradiance. If all values are `-9999` or empty, synthetic irradiance is generated from cloud cover + solar position. |
| `wind_gust_mph` | float | mph | Peak wind gust speed (not currently displayed) |
| `humidity` | float | % (0-100) | Relative humidity (not currently displayed) |
| `dni_wm2` | float | W/m2 | Direct Normal Irradiance (not currently displayed) |
| `diff_hi_wm2` | float | W/m2 | Diffuse Horizontal Irradiance (not currently displayed) |

Extra columns are ignored by the dashboard.

## Grid Operations Data

### File Naming

```
data/grid_ops_{ISO_NAME}.csv
```

**Important:** ISO-NE uses underscore in the filename (`grid_ops_ISO_NE.csv`), not hyphen. The mapping is handled in `app.js` via `gridOpsFileMap`.

| ISO Name | File |
|----------|------|
| CAISO | `grid_ops_CAISO.csv` |
| ERCOT | `grid_ops_ERCOT.csv` |
| ISO-NE | `grid_ops_ISO_NE.csv` |
| MISO | `grid_ops_MISO.csv` |
| NYISO | `grid_ops_NYISO.csv` |
| Northwest | `grid_ops_Northwest.csv` |
| PJM | `grid_ops_PJM.csv` |
| SPP | `grid_ops_SPP.csv` |
| Southeast | `grid_ops_Southeast.csv` |
| Southwest | `grid_ops_Southwest.csv` |

### Required Columns

| Column | Type | Unit | Description |
|--------|------|------|-------------|
| `datetime_utc` | datetime | -- | Timestamp matching weather data |
| `demand_mw` | float | MW | Total system electrical load |
| `total_generation_mw` | float | MW | Total generation dispatched |
| `wind_generation_mw` | float | MW | Wind turbine output |
| `solar_generation_mw` | float | MW | Solar PV output |
| `thermal_generation_mw` | float | MW | Gas + coal + nuclear generation |
| `spinning_reserve_mw` | float | MW | Available generation margin |
| `frequency_hz` | float | Hz | System frequency (nominal 60.000 Hz) |
| `ace_mw` | float | MW | Area Control Error |
| `lmp_usd_per_mwh` | float | $/MWh | Locational Marginal Price |
| `net_interchange_mw` | float | MW | Inter-region power flow (positive=exporting) |
| `renewable_penetration_pct` | float | % | (wind+solar)/demand |
| `reserve_margin_pct` | float | % | spinning_reserve/demand |
| `grid_condition` | string | -- | Pipe-delimited event flags (e.g., `NORMAL`, `FREQ_EMERGENCY\|EEA3_FIRM_LOAD_SHED`) |

### Grid Condition Flags

The `grid_condition` column drives tweet generation and news headlines. See `Live_feed/GRID_OPS_DATA_SPEC.md` for the full flag reference. Key flags:

**Critical (trigger news popup):**
`FREQ_EMERGENCY`, `UFLS_IMMINENT`, `UFLS_STEP1_ACTIVE`, `CASCADING_COLLAPSE`, `EEA3_FIRM_LOAD_SHED`, `EEA3_LOAD_SHED_IMMINENT`, `SCARCITY_PRICING`, `VOLL_CAP_PRICING`, `SEVERE_GENERATION_SHORTFALL`, `SEVERE_OVERGENERATION`

**Moderate (trigger tweets):**
`FREQ_EEA1`, `FREQ_EEA2`, `EEA1_CONSERVATION_APPEAL`, `HIGH_PRICE`, `PRICE_SPIKE`, `NEGATIVE_PRICE`, `DEEP_NEGATIVE_PRICE`, `RENEWABLES_EXCEED_DEMAND`, `RECORD_RENEWABLES`, `EMERGENCY_IMPORT`

**Minor (trigger ticker):**
`FREQ_ALERT`, `OVERFREQ_ALERT`, `HIGH_RENEWABLES`, `LOW_RENEWABLES`, `LOW_PRICE`, `MASSIVE_EXPORT`

**Normal:**
`NORMAL` -- no tweets generated, ticker shows routine status

## Special Values

| Value | Meaning | Dashboard Handling |
|-------|---------|--------------------|
| `-9999.0` | PowerWorld no-data sentinel | Treated as null/missing |
| `-9999` | Same, integer variant | Treated as null/missing |
| Empty string | No data available | Treated as null/missing |
| `NaN` | Not a number | Treated as null/missing |

## Temporal Requirements

- **Timestamps must be in UTC** (with `+00:00` timezone suffix for weather data)
- **Rows must be sorted chronologically** (ascending datetime)
- **Consistent interval**: all rows should have the same time step (typically 1 hour)
- **All ISO files must cover the same time range** (the dashboard shares one timeline across all ISOs)
- **Weather and grid ops files must have the same number of rows and matching timestamps**

## GeoJSON Format

The ISO map requires `data/iso-regions.geojson` with this structure:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "ISO": "ERCOT"
      },
      "geometry": { "type": "MultiPolygon", "coordinates": [...] }
    }
  ]
}
```

- Coordinate reference system: **EPSG:4326** (WGS84 lat/lon)
- Each feature must have a `properties.ISO` field matching the ISO name
- Simplified geometries recommended (< 100 KB total)

## Adding a New ISO Region

1. Add weather CSV: `data/weather_{NEW_ISO}.csv`
2. Add grid ops CSV: `data/grid_ops_{NEW_ISO}.csv`
3. Add region polygon to `data/iso-regions.geojson` with matching `ISO` property
4. In `js/app.js`: add to `isoNames` array, `gridOpsFileMap`, `ISO_LAT`, `ISO_LON`
5. In `js/tweets.js`: add to `ISO_TZ`, `HANDLES.citizen`
