import pandas as pd
import numpy as np
from typing import Dict, List, Tuple

def clean_telemetry_data(df: pd.DataFrame, outlier_preserve: bool = True) -> pd.DataFrame:
    """
    Cleans raw telemetry data by:
    - Removing duplicate timestamps per bridge.
    - Sorting by timestamp and validating monotonicity.
    - Handling missing values: if outlier_preserve is True, it leaves extreme values 
      unaltered and only imputes actual NaNs (via interpolation/forward fill) so 
      anomaly signatures are not smoothed out.
    """
    df = df.copy()
    
    # 1. Monotonicity & Sorting check
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by=["bridge_id", "timestamp"]).reset_index(drop=True)
    
    # 2. Duplicate removal
    initial_len = len(df)
    df = df.drop_duplicates(subset=["bridge_id", "timestamp"]).reset_index(drop=True)
    dup_removed = initial_len - len(df)
    if dup_removed > 0:
        print(f"Removed {dup_removed} duplicate records.")
        
    # Keep track of missingness before imputation (for sensor health indicators)
    physical_cols = ["strain_microstrain", "vibration_g", "displacement_mm", "temperature_c", "humidity_percent", "rainfall_mm", "traffic_load_percent", "wind_speed_mps"]
    for col in physical_cols:
        df[f"{col}_was_missing"] = df[col].isna().astype(int)
        
    # 3. Imputation (Forward fill followed by backward fill or linear interpolation)
    # We group by bridge_id so we don't bleed values between different bridges
    def impute_bridge_group(group: pd.DataFrame) -> pd.DataFrame:
        for col in physical_cols:
            # Linear interpolation is smooth, but we fallback to ffill/bfill for edges
            group[col] = group[col].interpolate(method="linear").ffill().bfill()
        return group
        
    df = df.groupby("bridge_id", group_keys=False).apply(impute_bridge_group)
    
    return df

def compute_robust_scale_params(series: pd.Series) -> Tuple[float, float]:
    """
    Calculates median and Median Absolute Deviation (MAD) for robust scaling.
    """
    median = series.median()
    mad = np.median(np.abs(series - median))
    # Avoid division by zero for flatlined series
    if mad < 1e-6:
        mad = series.std()
        if pd.isna(mad) or mad < 1e-6:
            mad = 1.0
    return float(median), float(mad)

def apply_robust_scaling(series: pd.Series, median: float, mad: float) -> pd.Series:
    """
    Scales a series using pre-computed median and MAD parameters.
    """
    return (series - median) / mad

def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes time-series and sensor-health features per bridge:
    - Lag features (t-1, t-2)
    - Rate-of-change features (t - (t-1))
    - Moving averages (rolling window mean and std)
    - Flatline detector (rolling std == 0 over a 15-minute window)
    """
    df = df.copy()
    
    # Sort to guarantee temporal ordering
    df = df.sort_values(by=["bridge_id", "timestamp"]).reset_index(drop=True)
    
    # Process features grouped by bridge
    processed_groups = []
    
    for bridge_id, group in df.groupby("bridge_id"):
        group = group.copy()
        
        target_cols = ["strain_microstrain", "vibration_g", "displacement_mm"]
        
        for col in target_cols:
            # 1. Lag features (1 and 2 minutes)
            group[f"{col}_lag_1"] = group[col].shift(1)
            group[f"{col}_lag_2"] = group[col].shift(2)
            
            # 2. Rate of Change
            group[f"{col}_roc_1"] = group[col] - group[f"{col}_lag_1"]
            
            # 3. Rolling Averages (5-minute and 15-minute window)
            # min_periods=1 allows calculation at start of series
            group[f"{col}_roll_mean_5"] = group[col].rolling(window=5, min_periods=1).mean()
            group[f"{col}_roll_mean_15"] = group[col].rolling(window=15, min_periods=1).mean()
            
            # Rolling standard deviation for variance analysis
            group[f"{col}_roll_std_5"] = group[col].rolling(window=5, min_periods=1).std().fillna(0.0)
            group[f"{col}_roll_std_15"] = group[col].rolling(window=15, min_periods=1).std().fillna(0.0)
            
            # 4. Sensor health: Flatline flag
            # If standard deviation over last 15 minutes is exactly 0.0 and we have enough records
            # represent standard dropout/flatline
            # We check if it is very close to 0 (to account for floating point)
            is_flatline = (group[f"{col}_roll_std_15"] < 1e-9) & (group.index >= 14)
            group[f"{col}_flatline_flag"] = is_flatline.astype(int)
            
        processed_groups.append(group)
        
    result_df = pd.concat(processed_groups, ignore_index=True)
    
    # Impute the new lag features which contain NaNs at the beginning of the series
    lag_cols = [c for c in result_df.columns if "lag_" in c or "roc_" in c]
    for col in lag_cols:
        result_df[col] = result_df[col].ffill().bfill().fillna(0.0)
        
    return result_df
