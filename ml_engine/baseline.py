import pandas as pd
import numpy as np
from sklearn.linear_model import Ridge
from typing import Dict, List, Tuple

class AdaptiveBaselineModel:
    """
    Adaptive Baseline Model for Structural Health Monitoring.
    Fits a regularized Ridge regression for each sensor parameter (strain, vibration, displacement) 
    per bridge using ONLY normal (healthy) records from a historical training window.
    
    Accounts for:
    - Bridge identity (by training separate models per bridge)
    - Diurnal temperature cycle (temperature_c)
    - Traffic loads (traffic_load_percent)
    - Rainfall (rainfall_mm)
    - Hour of day and day of week (represented cyclical cosine/sine features)
    - Intercept captures calibration offsets.
    """
    def __init__(self, version: str = "v1.0"):
        self.version = version
        self.models: Dict[str, Dict[str, Ridge]] = {}  # bridge_id -> {target_col -> Ridge}
        self.residual_stds: Dict[str, Dict[str, float]] = {}  # bridge_id -> {target_col -> std}
        self.train_start: str = ""
        self.train_end: str = ""
        self.feature_cols = [
            "temperature_c", "traffic_load_percent", "rainfall_mm",
            "hour_sin", "hour_cos", "dow_sin", "dow_cos"
        ]

    def _engineer_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Creates cyclical hour and day of week features to prevent boundary discontinuities.
        """
        df = df.copy()
        times = pd.to_datetime(df["timestamp"])
        
        # Diurnal hours
        hours = times.dt.hour + times.dt.minute / 60.0
        df["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
        df["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)
        
        # Weekly pattern
        dow = times.dt.dayofweek
        df["dow_sin"] = np.sin(2 * np.pi * dow / 7.0)
        df["dow_cos"] = np.cos(2 * np.pi * dow / 7.0)
        
        return df

    def fit(self, df: pd.DataFrame, train_start: str, train_end: str):
        """
        Trains baseline models for each bridge and target column using normal records.
        Ensures NO leak of future data or anomalous data into the baseline model.
        """
        self.train_start = train_start
        self.train_end = train_end
        
        # 1. Filter training window
        df_time = pd.to_datetime(df["timestamp"])
        train_mask = (df_time >= pd.to_datetime(train_start)) & (df_time <= pd.to_datetime(train_end))
        train_df = df[train_mask].copy()
        
        if len(train_df) == 0:
            raise ValueError(f"Training window {train_start} to {train_end} contains no records.")
            
        # 2. Add cyclical time features
        train_df = self._engineer_time_features(train_df)
        
        # 3. Fit model per bridge and target column
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        bridges = train_df["bridge_id"].unique()
        
        for bridge_id in bridges:
            bridge_df = train_df[train_df["bridge_id"] == bridge_id].copy()
            
            # CRITICAL: Filter OUT anomaly records. ONLY train on normal records.
            normal_df = bridge_df[bridge_df["ground_truth_anomaly"] == 0].copy()
            
            if len(normal_df) < 50:
                print(f"Warning: Bridge {bridge_id} has very few normal training records ({len(normal_df)}). Falling back to all records.")
                normal_df = bridge_df.copy()
                
            self.models[bridge_id] = {}
            self.residual_stds[bridge_id] = {}
            
            X_train = normal_df[self.feature_cols]
            
            for target in targets:
                y_train = normal_df[target]
                
                # Fit Ridge Regression (alpha=1.0)
                model = Ridge(alpha=1.0)
                model.fit(X_train, y_train)
                
                # Calculate training residuals to evaluate variance and thresholds
                y_pred = model.predict(X_train)
                residuals = y_train - y_pred
                res_std = float(np.std(residuals))
                
                # Prevent 0 threshold for flatlined test signals
                if res_std < 1e-6:
                    res_std = 1.0
                    
                self.models[bridge_id][target] = model
                self.residual_stds[bridge_id][target] = res_std

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates baseline expected values, residuals, normalized residuals, 
        and lower/upper bounds (3 * standard deviation) for all rows.
        """
        df = df.copy()
        df = self._engineer_time_features(df)
        
        # Initialize output columns
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        for target in targets:
            df[f"{target}_expected"] = np.nan
            df[f"{target}_lower"] = np.nan
            df[f"{target}_upper"] = np.nan
            df[f"{target}_residual"] = np.nan
            df[f"{target}_normalized_residual"] = np.nan
            
        df["baseline_version"] = self.version
        df["training_window"] = f"{self.train_start} to {self.train_end}"
        
        # Apply prediction per bridge
        for bridge_id, bridge_group in df.groupby("bridge_id"):
            if bridge_id not in self.models:
                print(f"Warning: Bridge {bridge_id} has no trained baseline model. Skipping predictions.")
                continue
                
            group_indices = bridge_group.index
            X_test = bridge_group[self.feature_cols]
            
            for target in targets:
                model = self.models[bridge_id][target]
                res_std = self.residual_stds[bridge_id][target]
                
                # Predict expected values
                y_pred = model.predict(X_test)
                y_actual = bridge_group[target].values
                
                # Compute bounds and residuals
                residuals = y_actual - y_pred
                # In 'missing_values' scenario, NaNs could exist in actual inputs, handle them
                normalized_residuals = np.where(pd.isna(residuals), np.nan, residuals / res_std)
                
                # Bounds: +/- 3 sigma limit
                lower_bound = y_pred - 3.0 * res_std
                upper_bound = y_pred + 3.0 * res_std
                
                # Write back values using group indices
                df.loc[group_indices, f"{target}_expected"] = y_pred
                df.loc[group_indices, f"{target}_lower"] = lower_bound
                df.loc[group_indices, f"{target}_upper"] = upper_bound
                df.loc[group_indices, f"{target}_residual"] = residuals
                df.loc[group_indices, f"{target}_normalized_residual"] = normalized_residuals
                
        # Drop temporary cyclical time features to keep dataset clean
        df = df.drop(columns=["hour_sin", "hour_cos", "dow_sin", "dow_cos"])
        return df
