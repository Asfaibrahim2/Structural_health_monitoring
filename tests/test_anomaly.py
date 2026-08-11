import pytest
import numpy as np
import pandas as pd
from ml_engine.preprocessing import clean_telemetry_data, compute_features
from ml_engine.baseline import AdaptiveBaselineModel
from ml_engine.anomaly_detector import HybridAnomalyDetector

def generate_mock_bridge_stream(scenario_type: str, n_steps: int = 150) -> pd.DataFrame:
    """Helper to generate a mock telemetry stream for a specific scenario."""
    timestamps = pd.date_range(start="2026-08-01 00:00:00", periods=n_steps, freq="min")
    
    # Baseline normal values
    temp = 25.0 + 3.0 * np.sin(np.arange(n_steps) * 2 * np.pi / 60.0)
    traffic = np.random.uniform(20, 60, n_steps)
    
    strain = 50.0 - 1.2 * (temp - 25.0) + 0.15 * traffic + np.random.normal(0, 0.2, n_steps)
    vibration = 0.01 + 0.04 * (traffic / 100.0) + np.random.normal(0, 0.001, n_steps)
    disp = 10.0 + 0.05 * (temp - 25.0) - 1.5 * (traffic / 100.0) + np.random.normal(0, 0.05, n_steps)
    
    # Default outputs
    humidity = np.random.uniform(60, 80, n_steps)
    rainfall = np.zeros(n_steps)
    wind = np.random.uniform(1, 4, n_steps)
    gt = np.zeros(n_steps, dtype=int)
    
    # Apply Scenarios
    if scenario_type == "sudden_spike":
        # Spike at step 100
        strain[100] += 150.0
        vibration[100] += 0.90
        disp[100] -= 25.0
        gt[100] = 1
        
    elif scenario_type == "persistent_anomaly":
        # Structural shift at step 80
        strain[80:] += 30.0
        disp[80:] -= 7.0
        gt[80:] = 1
        
    elif scenario_type == "gradual_deterioration":
        # Slow linear drift starting at step 50
        steps = np.arange(n_steps - 50)
        strain[50:] += 45.0 * (steps / len(steps))
        disp[50:] -= 10.0 * (steps / len(steps))
        gt[75:] = 1 # Flags anomaly halfway through deterioration
        
    elif scenario_type == "environmental_disturbance":
        # Severe storm from step 80 to 110
        wind[80:110] = 25.0
        vibration[80:110] += 0.25
        disp[80:110] += np.random.normal(0, 2.0, 30)
        gt[80:110] = 1
        
    elif scenario_type == "sensor_drift":
        # Strain sensor drift starting at step 40
        steps = np.arange(n_steps - 40)
        strain[40:] += 0.8 * steps
        gt[80:] = 1 # Flags once drift is significant
        
    elif scenario_type == "missing_data":
        # Missing values from step 90 to 100
        strain[90:100] = np.nan
        vibration[90:100] = np.nan
        disp[90:100] = np.nan
        # Missing data is mapped as data fault, not marked as true physical alert
    
    df = pd.DataFrame({
        "timestamp": timestamps,
        "bridge_id": "TS-MOCK-001",
        "strain_microstrain": strain,
        "vibration_g": vibration,
        "displacement_mm": disp,
        "temperature_c": temp,
        "humidity_percent": humidity,
        "rainfall_mm": rainfall,
        "traffic_load_percent": traffic,
        "wind_speed_mps": wind,
        "sensor_id": "TS-MOCK-001_NODE_A",
        "scenario": scenario_type,
        "ground_truth_anomaly": gt
    })
    return df

def test_anomaly_sudden_spikes():
    """Verify quick impulse spikes are captured and labeled."""
    df = generate_mock_bridge_stream("sudden_spike", n_steps=120)
    
    # Pipeline execution
    df_cleaned = clean_telemetry_data(df)
    df_features = compute_features(df_cleaned)
    
    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_features, train_start="2026-08-01 00:00:00", train_end="2026-08-01 01:20:00")
    df_residuals = baseline.predict(df_features)
    
    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_residuals)
    df_results = detector.run_detection_pipeline(df_residuals)
    
    # Assert spike index (100) is flagged
    spike_row = df_results.iloc[100]
    assert spike_row["anomaly_label"] == 1
    assert spike_row["anomaly_type"] == "sudden_spike"
    assert "vibration_g" in spike_row["contributing_sensors"]

def test_anomaly_persistent():
    """Verify permanent baseline shifts trigger long alarms and persistent tags."""
    df = generate_mock_bridge_stream("persistent_anomaly", n_steps=150)
    
    df_cleaned = clean_telemetry_data(df)
    df_features = compute_features(df_cleaned)
    
    # Train baseline on pre-anomaly normal data (first 70 minutes)
    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_features, train_start="2026-08-01 00:00:00", train_end="2026-08-01 01:10:00")
    df_residuals = baseline.predict(df_features)
    
    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_residuals)
    df_results = detector.run_detection_pipeline(df_residuals)
    
    # Assert that once anomaly sets in, label remains active and flags persistent
    assert df_results.loc[85, "anomaly_label"] == 1
    assert df_results.loc[85, "anomaly_type"] == "persistent_anomaly"
    # Persistence score should grow
    assert df_results.loc[120, "persistence_score"] > 0.5

def test_anomaly_gradual_deterioration():
    """Verify slow concrete concrete creep is isolated."""
    df = generate_mock_bridge_stream("gradual_deterioration", n_steps=150)
    
    df_cleaned = clean_telemetry_data(df)
    df_features = compute_features(df_cleaned)
    
    # Fit baseline on early normal data
    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_features, train_start="2026-08-01 00:00:00", train_end="2026-08-01 00:45:00")
    df_residuals = baseline.predict(df_features)
    
    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_residuals)
    df_results = detector.run_detection_pipeline(df_residuals)
    
    # Later stages of deterioration must be flagged as gradual_deterioration
    assert df_results.loc[140, "anomaly_label"] == 1
    assert df_results.loc[140, "anomaly_type"] == "gradual_deterioration"

def test_normal_environmental_changes_and_storm():
    """Verify standard diurnal cycles do not alert, but heavy storms do."""
    df = generate_mock_bridge_stream("environmental_disturbance", n_steps=150)
    
    df_cleaned = clean_telemetry_data(df)
    df_features = compute_features(df_cleaned)
    
    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_features, train_start="2026-08-01 00:00:00", train_end="2026-08-01 01:10:00")
    df_residuals = baseline.predict(df_features)
    
    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_residuals)
    df_results = detector.run_detection_pipeline(df_residuals)
    
    # Prior to step 80 (normal diurnal cycle): should have no alarms
    assert df_results.loc[5, "anomaly_label"] == 0
    
    # Storm block (80 to 110): should alert with environmental disturbance
    assert df_results.loc[90, "anomaly_label"] == 1
    assert df_results.loc[90, "anomaly_type"] == "environmental_disturbance"

def test_anomaly_sensor_drift():
    """Verify that linear sensor drift is successfully flagged."""
    df = generate_mock_bridge_stream("sensor_drift", n_steps=120)
    
    df_cleaned = clean_telemetry_data(df)
    df_features = compute_features(df_cleaned)
    
    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_features, train_start="2026-08-01 00:00:00", train_end="2026-08-01 00:35:00")
    df_residuals = baseline.predict(df_features)
    
    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_residuals)
    df_results = detector.run_detection_pipeline(df_residuals)
    
    # Later stages of drift should alert as sensor_drift
    assert df_results.loc[100, "anomaly_label"] == 1
    assert df_results.loc[100, "anomaly_type"] == "sensor_drift"

def test_anomaly_missing_data():
    """Verify NaNs in streaming telemetry are handled and classified as missing data."""
    df = generate_mock_bridge_stream("missing_data", n_steps=120)
    
    # During cleaning, NaNs are imputed but logged
    df_cleaned = clean_telemetry_data(df)
    df_features = compute_features(df_cleaned)
    
    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_features, train_start="2026-08-01 00:00:00", train_end="2026-08-01 01:00:00")
    df_residuals = baseline.predict(df_features)
    
    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_residuals)
    df_results = detector.run_detection_pipeline(df_residuals)
    
    # Imputed rows should have missing data alerts
    assert df_results.loc[95, "anomaly_label"] == 1
    assert df_results.loc[95, "anomaly_type"] == "missing_data"
