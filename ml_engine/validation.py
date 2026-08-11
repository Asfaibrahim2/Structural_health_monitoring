import os
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple

# Physical range assumptions for Indian / Telangana infrastructure conditions
BOUNDS = {
    "temperature_c": (10.0, 55.0),          # Telangana range: 10C (cold winter night) to 55C (severe metal deck heat)
    "humidity_percent": (0.0, 100.0),       # Relative humidity bounds
    "wind_speed_mps": (0.0, 50.0),          # Peak cyclone storm speed limit
    "rainfall_mm": (0.0, 20.0),             # Max intensity per minute
    "traffic_load_percent": (0.0, 200.0),   # Allow up to 200% for extreme structural overload
    "vibration_g": (0.0, 5.0),              # Maximum accelerometer range (absolute magnitude g)
    "strain_microstrain": (-500.0, 500.0),  # Concrete structural limits (compression/tension)
    "displacement_mm": (-100.0, 100.0),     # Max allowable structural deflection range
    "ground_truth_anomaly": (0, 1)          # Binary flag
}

def validate_telemetry_dataset(csv_path: str) -> Dict:
    """
    Validates the generated telemetry dataset against physical and logical rules.
    Returns a dictionary summarizing validation checks, missing values, and violations.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Telemetry file not found at: {csv_path}")
        
    print(f"Loading dataset for validation: {csv_path}...")
    # Load dataset
    df = pd.read_csv(csv_path)
    total_rows = len(df)
    print(f"Loaded {total_rows:,} rows. Starting checks...")

    report = {
        "total_rows": total_rows,
        "missing_counts": {},
        "range_violations": {},
        "data_type_errors": [],
        "anomaly_distribution": {},
        "scenarios_found": [],
        "status": "PASS"
    }

    # 1. Column Presence Check
    required_cols = [
        "timestamp", "bridge_id", "strain_microstrain", "vibration_g",
        "displacement_mm", "temperature_c", "humidity_percent", "rainfall_mm",
        "traffic_load_percent", "wind_speed_mps", "sensor_id", "scenario",
        "ground_truth_anomaly"
    ]
    
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        report["status"] = "FAIL"
        report["data_type_errors"].append(f"Missing required columns: {missing_cols}")
        return report

    # 2. Check for scenario names and anomalies distribution
    report["scenarios_found"] = df["scenario"].dropna().unique().tolist()
    report["anomaly_distribution"] = df["ground_truth_anomaly"].value_counts().to_dict()

    # 3. Check for Missing (NaN) Values
    # In 'missing_values' scenario, NaNs are expected. We report where they are.
    for col in required_cols:
        nans = df[col].isna().sum()
        if nans > 0:
            report["missing_counts"][col] = int(nans)

    # 4. Check Logical Types
    # Check timestamp parseability
    try:
        pd.to_datetime(df["timestamp"])
    except Exception as e:
        report["status"] = "FAIL"
        report["data_type_errors"].append(f"Timestamp parsing error: {str(e)}")

    # 5. Check Physical Range Boundaries
    # For rows where values are not NaN, they must obey BOUNDS
    for col, (min_val, max_val) in BOUNDS.items():
        series = df[col].dropna()
        # Find values outside bounds
        violations = ((series < min_val) | (series > max_val))
        violation_count = violations.sum()
        
        if violation_count > 0:
            report["status"] = "FAIL"
            # Get sample of violating values
            sample_violators = series[violations].head(5).tolist()
            report["range_violations"][col] = {
                "count": int(violation_count),
                "expected": [min_val, max_val],
                "sample_violators": sample_violators
            }

    return report

def print_validation_report(report: Dict):
    """
    Utility to print the validation results in a clean, human-readable format.
    """
    print("\n" + "="*50)
    print("              DATA VALIDATION REPORT")
    print("="*50)
    print(f"Validation Status: {report['status']}")
    print(f"Total Records Check: {report['total_rows']:,}")
    
    print("\n--- Scenarios Detected ---")
    for scenario in report["scenarios_found"]:
        print(f" - {scenario}")
        
    print("\n--- Ground Truth Anomaly Counts ---")
    for key, count in report["anomaly_distribution"].items():
        label = "Anomalous (1)" if key == 1 else "Normal (0)"
        pct = (count / report["total_rows"]) * 100
        print(f" - {label}: {count:,} rows ({pct:.2f}%)")

    print("\n--- Missing (NaN) Values Report ---")
    if report["missing_counts"]:
        for col, count in report["missing_counts"].items():
            pct = (count / report["total_rows"]) * 100
            print(f" - Column '{col}': {count:,} missing values ({pct:.2f}%)")
    else:
        print(" - No missing values detected in the entire dataset.")

    print("\n--- Range & Bounds Violations ---")
    if report["range_violations"]:
        for col, details in report["range_violations"].items():
            print(f" - Column '{col}' violated range limits {details['expected']}:")
            print(f"   * Total Violations: {details['count']:,} occurrences")
            print(f"   * Sample Values: {details['sample_violators']}")
    else:
        print(" - All non-missing telemetry features fall within physically plausible bounds.")

    print("\n--- Data Type Consistency Errors ---")
    if report["data_type_errors"]:
        for err in report["data_type_errors"]:
            print(f" - Error: {err}")
    else:
        print(" - All data schemas and types are structurally sound.")
    print("="*50 + "\n")

if __name__ == "__main__":
    csv_path = "c:/ai_xdomain/infrastructure/data/raw/bridge_telemetry.csv"
    try:
        report = validate_telemetry_dataset(csv_path)
        print_validation_report(report)
    except Exception as e:
        print(f"Validation execution failed: {str(e)}")
