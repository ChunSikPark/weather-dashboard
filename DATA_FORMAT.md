# Input Data Format Specification

This document describes the expected format for weather data files consumed by the dashboard.

## File Naming

Each ISO region needs its own CSV file:

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

## CSV Schema

### Required Columns

| Column | Type | Unit | Description |
|--------|------|------|-------------|
| `datetime_utc` | ISO 8601 datetime with timezone | — | Timestamp (e.g., `2026-03-18 00:00:00+00:00`) |
| `wind_speed_mph` | float | mph | Surface-level wind speed |
| `wind_speed_100m_mph` | float | mph | Wind speed at 100m hub height |
| `wind_direction` | float | degrees (0–360, meteorological) | Direction wind is coming FROM (0=N, 90=E, 180=S, 270=W) |
| `cloud_cover_pct` | float | % (0–100) | Cloud cover percentage |

### Optional Columns

| Column | Type | Unit | Description |
|--------|------|------|-------------|
| `dhi_wm2` | float | W/m² | Direct Horizontal Irradiance. If all values are `-9999` or empty, synthetic irradiance is generated from cloud cover + solar position. |
| `wind_gust_mph` | float | mph | Peak wind gust speed (not currently displayed) |
| `humidity` | float | % (0–100) | Relative humidity (not currently displayed) |
| `dni_wm2` | float | W/m² | Direct Normal Irradiance (not currently displayed) |
| `diff_hi_wm2` | float | W/m² | Diffuse Horizontal Irradiance (not currently displayed) |

Extra columns are ignored by the dashboard.

## Special Values

| Value | Meaning | Dashboard Handling |
|-------|---------|--------------------|
| `-9999.0` | PowerWorld no-data sentinel | Treated as null/missing |
| `-9999` | Same, integer variant | Treated as null/missing |
| Empty string | No data available | Treated as null/missing |
| `NaN` | Not a number | Treated as null/missing |

## Temporal Requirements

- **Timestamps must be in UTC** (with `+00:00` timezone suffix)
- **Rows must be sorted chronologically** (ascending datetime)
- **Consistent interval**: all rows should have the same time step (typically 1 hour)
- **All ISO files must cover the same time range** (the dashboard shares one timeline across all ISOs)

## Example

```csv
datetime_utc,wind_speed_mph,wind_speed_100m_mph,wind_direction,wind_gust_mph,humidity,dhi_wm2,dni_wm2,diff_hi_wm2,cloud_cover_pct
2026-03-18 00:00:00+00:00,10.03,6.22,153.06,,37.36,-9999.0,,,53.08
2026-03-18 01:00:00+00:00,9.65,7.12,150.88,,43.15,-9999.0,,,49.01
2026-03-18 02:00:00+00:00,9.85,7.71,151.72,,46.80,-9999.0,,,44.45
```

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

1. Add a CSV file: `data/weather_{NEW_ISO}.csv` following the schema above
2. Add the region polygon to `data/iso-regions.geojson` with matching `ISO` property
3. Add the ISO name to the `isoNames` array in `js/app.js`
4. Add lat/lon to `ISO_LAT` and `ISO_LON` objects in `js/app.js` (for synthetic solar)
