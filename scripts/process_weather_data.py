"""
Weather Data Processor for the SCADA-Style Weather Dashboard.

Converts raw weather CSVs (from PowerWorld/NOAA extraction pipeline)
into the dashboard-ready format expected by the frontend.

Input:  Raw per-ISO CSVs with all weather variables
Output: Cleaned per-ISO CSVs with only the columns the dashboard needs

Usage:
    python scripts/process_weather_data.py <input_dir> <output_dir>

    # Example: process from Weather_Processed into dashboard data/
    python scripts/process_weather_data.py ../Weather_Processed ./data

    # Dry run (show what would happen, don't write files)
    python scripts/process_weather_data.py ../Weather_Processed ./data --dry-run

Input Requirements:
    - CSV files named weather_{ISO}.csv (e.g., weather_ERCOT.csv)
    - Must contain columns: datetime_utc, wind_speed_mph, wind_speed_100m_mph,
      wind_direction, cloud_cover_pct
    - See DATA_FORMAT.md for full schema specification
"""

import argparse
import os
import sys

import pandas as pd


# Columns the dashboard requires (in order)
REQUIRED_COLUMNS = [
    "datetime_utc",
    "wind_speed_mph",
    "wind_speed_100m_mph",
    "wind_direction",
    "cloud_cover_pct",
]

# Optional columns to carry through if they exist
OPTIONAL_COLUMNS = [
    "wind_gust_mph",
    "humidity",
    "dhi_wm2",
    "dni_wm2",
    "diff_hi_wm2",
]

# PowerWorld no-data sentinel
NO_DATA_SENTINEL = -9999.0


def validate_csv(df: pd.DataFrame, filename: str) -> list[str]:
    """Check that a DataFrame meets the dashboard input requirements.

    Returns a list of warning/error messages (empty = all good).
    """
    issues = []

    # Check required columns
    for col in REQUIRED_COLUMNS:
        if col not in df.columns:
            issues.append(f"MISSING REQUIRED COLUMN: '{col}'")

    if issues:
        return issues  # Can't validate further without required columns

    # Check datetime parsing
    try:
        pd.to_datetime(df["datetime_utc"])
    except Exception as e:
        issues.append(f"DATETIME PARSE ERROR: {e}")

    # Check chronological order
    dt = pd.to_datetime(df["datetime_utc"])
    if not dt.is_monotonic_increasing:
        issues.append("TIMESTAMPS NOT SORTED: rows are not in ascending order")

    # Check for data quality
    total_rows = len(df)
    for col in REQUIRED_COLUMNS[1:]:  # skip datetime
        null_count = df[col].isna().sum()
        sentinel_count = (df[col] == NO_DATA_SENTINEL).sum()
        bad_count = null_count + sentinel_count
        if bad_count == total_rows:
            issues.append(f"ALL DATA MISSING: '{col}' has no valid values ({total_rows} rows)")
        elif bad_count > total_rows * 0.5:
            issues.append(
                f"WARNING: '{col}' is >50% missing ({bad_count}/{total_rows} rows)"
            )

    return issues


def process_file(input_path: str, output_path: str, dry_run: bool = False) -> bool:
    """Process a single ISO weather CSV.

    Steps:
    1. Read CSV
    2. Validate required columns exist
    3. Replace -9999 sentinel with NaN
    4. Keep only required + available optional columns
    5. Sort by datetime
    6. Write cleaned CSV

    Returns True if successful, False if validation failed.
    """
    filename = os.path.basename(input_path)
    print(f"\n{'-' * 60}")
    print(f"Processing: {filename}")

    # Read
    df = pd.read_csv(input_path)
    print(f"  Rows: {len(df)}, Columns: {list(df.columns)}")

    # Validate
    issues = validate_csv(df, filename)
    if any(issue.startswith("MISSING") or issue.startswith("DATETIME") for issue in issues):
        print(f"  FAILED VALIDATION:")
        for issue in issues:
            print(f"    - {issue}")
        return False

    if issues:
        print(f"  Warnings:")
        for issue in issues:
            print(f"    - {issue}")

    # Replace sentinel values with NaN
    df = df.replace(NO_DATA_SENTINEL, float("nan"))
    # Also catch integer variant
    df = df.replace(-9999, float("nan"))

    # Select columns (required + available optional)
    keep_cols = list(REQUIRED_COLUMNS)
    for col in OPTIONAL_COLUMNS:
        if col in df.columns:
            keep_cols.append(col)

    df = df[keep_cols]

    # Parse and sort by datetime
    df["datetime_utc"] = pd.to_datetime(df["datetime_utc"], utc=True)
    df = df.sort_values("datetime_utc").reset_index(drop=True)

    # Format datetime back to string (ISO 8601 with UTC offset)
    df["datetime_utc"] = df["datetime_utc"].dt.strftime("%Y-%m-%d %H:%M:%S+00:00")

    # Report
    for col in keep_cols[1:]:
        valid = df[col].notna().sum()
        print(f"  {col}: {valid}/{len(df)} valid values")

    if dry_run:
        print(f"  DRY RUN — would write to: {output_path}")
    else:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"  Wrote: {output_path} ({len(df)} rows)")

    return True


def main():
    parser = argparse.ArgumentParser(
        description="Process raw weather CSVs into dashboard-ready format."
    )
    parser.add_argument(
        "input_dir",
        help="Directory containing raw weather_{ISO}.csv files",
    )
    parser.add_argument(
        "output_dir",
        help="Directory to write processed CSVs (e.g., ./data)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and report without writing files",
    )

    args = parser.parse_args()

    if not os.path.isdir(args.input_dir):
        print(f"ERROR: Input directory not found: {args.input_dir}")
        sys.exit(1)

    # Find all per-ISO CSV files (exclude combined file)
    csv_files = sorted(
        f
        for f in os.listdir(args.input_dir)
        if f.startswith("weather_")
        and f.endswith(".csv")
        and f != "weather_by_iso.csv"
    )

    if not csv_files:
        print(f"ERROR: No weather_*.csv files found in {args.input_dir}")
        sys.exit(1)

    print(f"Found {len(csv_files)} ISO weather files in {args.input_dir}")
    if args.dry_run:
        print("MODE: Dry run (no files will be written)")

    # Process each file
    success = 0
    failed = 0
    for csv_file in csv_files:
        input_path = os.path.join(args.input_dir, csv_file)
        output_path = os.path.join(args.output_dir, csv_file)
        if process_file(input_path, output_path, dry_run=args.dry_run):
            success += 1
        else:
            failed += 1

    # Summary
    print(f"\n{'=' * 60}")
    print(f"DONE: {success} succeeded, {failed} failed out of {len(csv_files)} files")

    if failed > 0:
        print("\nFailed files need manual inspection. See errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
