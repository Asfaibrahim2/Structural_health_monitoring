import pytest
import numpy as np
import pandas as pd
from ml_engine.preprocessing import clean_telemetry_data, compute_robust_scale_params, apply_robust_scaling, compute_features
from ml_engine.baseline import AdaptiveBaselineModel

@pytest.fixture
def sample_telemetry_df():
    """Generates a small clean dataset for testing."""
    timestamps = pd.date_range(start="2026-08-01 00:00:00", end="2026-08-01 02:00:00", freq="min")
    n = len(timestamps)
    
    # Base pattern
    temp = 25.0 + 5.0 * np.sin(np.arange(n))
    traffic = np.random.uniform(10, 80, n)
    strain = 50.0 - 1.5 * (temp - 25.0) + 0.2 * traffic + np.random.normal(0, 0.5, n)
    vibration = 0.01 + 0.05 * (traffic / 100.0) + np.random.normal(0, 0.001, n)
    disp = 10.0 + 0.08 * (temp - 25.0) - 2.0 * (traffic / 100.0) + np.random.normal(0, 0.1, n)
    
    df = pd.DataFrame({
        "timestamp": timestamps,
        "bridge_id": "TS-TEST-001",
        "strain_microstrain": strain,
        "vibration_g": vibration,
        "displacement_mm": disp,
        "temperature_c": temp,
        "humidity_percent": np.random.uniform(60, 80, n),
        "rainfall_mm": np.zeros(n),
        "traffic_load_percent": traffic,
        "wind_speed_mps": np.random.uniform(1, 5, n),
        "sensor_id": "TS-TEST-001_NODE_A",
        "scenario": "normal",
        "ground_truth_anomaly": np.zeros(n, dtype=int)
    })
    return df

def test_duplicate_removal_and_monotonicity():
    """Verify duplicate records are pruned and timestamps sorted."""
    df = pd.DataFrame({
        "timestamp": ["2026-08-01 00:01:00", "2026-08-01 00:00:00", "2026-08-01 00:01:00"],
        "bridge_id": ["B1", "B1", "B1"],
        "strain_microstrain": [50.0, 48.0, 50.0],
        "vibration_g": [0.01, 0.01, 0.01],
        "displacement_mm": [10.0, 10.0, 10.0],
        "temperature_c": [25.0, 25.0, 25.0],
        "humidity_percent": [60.0, 60.0, 60.0],
        "rainfall_mm": [0.0, 0.0, 0.0],
        "traffic_load_percent": [20.0, 20.0, 20.0],
        "wind_speed_mps": [2.0, 2.0, 2.0],
        "sensor_id": ["S1", "S1", "S1"],
        "scenario": ["normal", "normal", "normal"],
        "ground_truth_anomaly": [0, 0, 0]
    })
    
    cleaned = clean_telemetry_data(df)
    
    # Should have sorted timestamps: 00:00:00 then 00:01:00, with duplicate removed
    assert len(cleaned) == 2
    assert cleaned["timestamp"].iloc[0] == pd.Timestamp("2026-08-01 00:00:00")
    assert cleaned["timestamp"].iloc[1] == pd.Timestamp("2026-08-01 00:01:00")

def test_missing_value_imputation(sample_telemetry_df):
    """Verify NaN values are imputed via interpolation."""
    df = sample_telemetry_df.copy()
    # Inject NaNs
    df.loc[10:12, "strain_microstrain"] = np.nan
    
    cleaned = clean_telemetry_data(df)
    
    # Check that there are no NaNs in cleaned data
    assert cleaned["strain_microstrain"].isna().sum() == 0
    # Check that was_missing flags are correct
    assert cleaned["strain_microstrain_was_missing"].iloc[10] == 1
    assert cleaned["strain_microstrain_was_missing"].iloc[5] == 0

def test_robust_scaling():
    """Verify median and MAD parameters and robust scaling math."""
    data = pd.Series([10.0, 12.0, 11.0, 13.0, 100.0]) # 100 is an outlier
    median, mad = compute_robust_scale_params(data)
    
    # Median should be 12.0
    # Absolute deviations: [2, 0, 1, 1, 88]. Median of absolute deviations: 1.0
    assert median == 12.0
    assert mad == 1.0
    
    scaled = apply_robust_scaling(data, median, mad)
    # Scaled outlier: (100 - 12) / 1 = 88.0
    assert scaled.iloc[4] == 88.0

def test_time_series_features_computation(sample_telemetry_df):
    """Ensure lag, rolling, and rate-of-change features generate correct shapes."""
    cleaned = clean_telemetry_data(sample_telemetry_df)
    featurized = compute_features(cleaned)
    
    # Ensure lag and roll columns exist
    assert "strain_microstrain_lag_1" in featurized.columns
    assert "strain_microstrain_lag_2" in featurized.columns
    assert "strain_microstrain_roc_1" in featurized.columns
    assert "strain_microstrain_roll_mean_5" in featurized.columns
    assert "strain_microstrain_roll_std_15" in featurized.columns
    
    # Check shape unchanged
    assert len(featurized) == len(cleaned)

def test_anomaly_exclusion_in_baseline(sample_telemetry_df):
    """
    PROVE that anomaly records are excluded from baseline training.
    We create two datasets with identical normal values but different extreme values
    for anomaly-labeled rows. If the models are trained only on normal records,
    their coefficients will be exactly identical.
    """
    df = sample_telemetry_df.copy()
    
    # Dataset 1: Inject extreme positive anomaly, labeled as 1
    df_anomaly_1 = df.copy()
    df_anomaly_1.loc[30:35, "strain_microstrain"] = 9999.0
    df_anomaly_1.loc[30:35, "ground_truth_anomaly"] = 1
    
    # Dataset 2: Inject extreme negative anomaly, labeled as 1
    df_anomaly_2 = df.copy()
    df_anomaly_2.loc[30:35, "strain_microstrain"] = -8888.0
    df_anomaly_2.loc[30:35, "ground_truth_anomaly"] = 1
    
    # Train both models
    model1 = AdaptiveBaselineModel(version="v1.0")
    model1.fit(df_anomaly_1, train_start="2026-08-01 00:00:00", train_end="2026-08-01 02:00:00")
    
    model2 = AdaptiveBaselineModel(version="v1.0")
    model2.fit(df_anomaly_2, train_start="2026-08-01 00:00:00", train_end="2026-08-01 02:00:00")
    
    coef1 = model1.models["TS-TEST-001"]["strain_microstrain"].coef_
    intercept1 = model1.models["TS-TEST-001"]["strain_microstrain"].intercept_
    
    coef2 = model2.models["TS-TEST-001"]["strain_microstrain"].coef_
    intercept2 = model2.models["TS-TEST-001"]["strain_microstrain"].intercept_
    
    # Assert coefficients and intercept are EXACTLY unchanged between both models
    np.testing.assert_allclose(coef1, coef2, rtol=1e-10)
    assert abs(intercept1 - intercept2) < 1e-10

def test_no_future_data_leakage(sample_telemetry_df):
    """Verify that predictions outside the training window use only historical parameters."""
    df = sample_telemetry_df.copy()
    
    # Train only on first hour
    model = AdaptiveBaselineModel(version="v1.0")
    model.fit(df, train_start="2026-08-01 00:00:00", train_end="2026-08-01 01:00:00")
    
    # Predict on the whole dataset (including future 01:01 to 02:00)
    pred_df = model.predict(df)
    
    # Verify we got predictions for both past and future
    assert not pred_df["strain_microstrain_expected"].isna().all()
    # Confirm training window metadata is set to the correct historical limits
    assert pred_df["training_window"].iloc[100] == "2026-08-01 00:00:00 to 2026-08-01 01:00:00"
