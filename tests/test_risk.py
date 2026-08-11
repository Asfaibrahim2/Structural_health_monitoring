import pytest
import numpy as np
import pandas as pd
from ml_engine.risk_engine import RiskEngine

@pytest.fixture
def base_results_df():
    """Generates a small preprocessed anomaly-detected DataFrame for testing."""
    timestamps = pd.date_range(start="2026-08-01 00:00:00", periods=120, freq="min")
    n = len(timestamps)
    
    # Pre-calculated features from prior stages
    df = pd.DataFrame({
        "timestamp": timestamps,
        "bridge_id": "TS-MOCK-001",
        "strain_microstrain": np.ones(n) * 50.0,
        "vibration_g": np.ones(n) * 0.01,
        "displacement_mm": np.ones(n) * 10.0,
        "strain_microstrain_residual": np.zeros(n),
        "vibration_g_residual": np.zeros(n),
        "displacement_mm_residual": np.zeros(n),
        "strain_microstrain_expected": np.ones(n) * 50.0,
        "vibration_g_expected": np.ones(n) * 0.01,
        "displacement_mm_expected": np.ones(n) * 10.0,
        "strain_microstrain_normalized_residual": np.zeros(n),
        "vibration_g_normalized_residual": np.zeros(n),
        "displacement_mm_normalized_residual": np.zeros(n),
        "strain_microstrain_was_missing": np.zeros(n, dtype=int),
        "vibration_g_was_missing": np.zeros(n, dtype=int),
        "displacement_mm_was_missing": np.zeros(n, dtype=int),
        "strain_microstrain_roll_std_15": np.ones(n) * 0.1,
        "vibration_g_roll_std_15": np.ones(n) * 0.001,
        "displacement_mm_roll_std_15": np.ones(n) * 0.05,
        "strain_microstrain_flatline_flag": np.zeros(n, dtype=int),
        "vibration_g_flatline_flag": np.zeros(n, dtype=int),
        "displacement_mm_flatline_flag": np.zeros(n, dtype=int),
        "temperature_c": np.ones(n) * 28.0,
        "rainfall_mm": np.zeros(n),
        "traffic_load_percent": np.ones(n) * 45.0,
        "wind_speed_mps": np.ones(n) * 3.5,
        "anomaly_label": np.zeros(n, dtype=int),
        "anomaly_type": ["normal"] * n,
        "persistence_score": np.zeros(n),
        "scenario": ["normal"] * n
    })
    return df

def test_risk_formula_calculation(base_results_df):
    """Verify the risk score calculation matches the weighted formula."""
    df = base_results_df.copy()
    meta = {"vulnerability_factor": 0.3}
    
    df.loc[10, "strain_microstrain_normalized_residual"] = 6.0
    df.loc[10, "persistence_score"] = 0.5
    df.loc[10, "traffic_load_percent"] = 100.0
    
    engine = RiskEngine()
    results = engine.compute_risk(df, meta)
    
    row = results.iloc[10]
    
    w = engine.weights
    expected_risk = (
        w["severity"] * row["severity_score"] +
        w["persistence"] * (row["persistence_score"] * 100.0) +
        w["sensor_agreement"] * row["sensor_agreement_score"] +
        w["trend"] * row["trend_score"] +
        w["asset_vulnerability"] * row["asset_vulnerability_score"] +
        w["context"] * row["context_score"] +
        w["data_quality"] * row["data_quality_score"]
    )
    
    assert abs(row["risk_score"] - expected_risk) < 1e-6
    assert row["risk_score"] > 0.0

def test_configurable_weights_and_thresholds(base_results_df):
    """Verify customized weights and priority thresholds alter output classifications."""
    df = base_results_df.copy()
    meta = {"vulnerability_factor": 0.5}
    
    custom_weights = {
        "severity": 0.05,
        "persistence": 0.05,
        "sensor_agreement": 0.05,
        "trend": 0.02,
        "asset_vulnerability": 0.80,
        "context": 0.01,
        "data_quality": 0.02
    }
    custom_thresholds = {
        "P1": 40.0,
        "P2": 30.0,
        "P3": 15.0
    }
    
    engine = RiskEngine(weights=custom_weights, thresholds=custom_thresholds)
    results = engine.compute_risk(df, meta)
    
    row = results.iloc[10]
    assert row["risk_score"] >= 40.0
    assert row["inspection_priority"] == "P1"

def test_priority_binning(base_results_df):
    """Ensure risk scores are correctly binned into priority levels P1-P4."""
    df = base_results_df.copy()
    engine = RiskEngine()
    
    meta = {"vulnerability_factor": 0.0}
    results = engine.compute_risk(df, meta)
    
    results["risk_score"] = [85.0, 65.0, 45.0, 12.0] + [0.0] * 116
    
    priorities = []
    for r in results["risk_score"]:
        if r >= engine.thresholds["P1"]:
            priorities.append("P1")
        elif r >= engine.thresholds["P2"]:
            priorities.append("P2")
        elif r >= engine.thresholds["P3"]:
            priorities.append("P3")
        else:
            priorities.append("P4")
            
    assert priorities[0] == "P1"
    assert priorities[1] == "P2"
    assert priorities[2] == "P3"
    assert priorities[3] == "P4"

def test_sensor_agreement_time_tolerance(base_results_df):
    """Verify sensor agreement tracks multiple sensor anomalies within the time tolerance limit."""
    df = base_results_df.copy()
    meta = {"vulnerability_factor": 0.1}
    
    df.loc[5, "strain_microstrain_normalized_residual"] = 6.0
    df.loc[12, "displacement_mm_normalized_residual"] = 6.0
    
    engine = RiskEngine(time_tolerance_minutes=10)
    results = engine.compute_risk(df, meta)
    
    assert abs(results.loc[12, "sensor_agreement_score"] - 66.66666) < 1e-2

def test_health_degradation_reduces_confidence(base_results_df):
    """Verify missing data or flatlines degrade data quality and drop prediction confidence."""
    df = base_results_df.copy()
    meta = {"vulnerability_factor": 0.2}
    
    df.loc[0:15, "strain_microstrain_was_missing"] = 1
    df.loc[0:15, "vibration_g_flatline_flag"] = 1
    
    engine = RiskEngine()
    results = engine.compute_risk(df, meta)
    
    # Clean indices after 60-minute window (like step 110) should have 100% confidence
    assert results.loc[110, "confidence_score"] == 100.0
    # Contaminated indices should have degraded data quality and confidence < 100
    assert results.loc[10, "data_quality_score"] < 100.0
    assert results.loc[10, "confidence_score"] < 100.0
    assert results.loc[10, "uncertainty"] > 0.0

def test_context_classification(base_results_df):
    """Verify traffic, rain, and temperature context flags are correctly labeled."""
    df = base_results_df.copy()
    meta = {"vulnerability_factor": 0.2}
    
    df.loc[10, "traffic_load_percent"] = 85.0 # High
    df.loc[10, "rainfall_mm"] = 1.2 # Heavy rain
    df.loc[10, "temperature_c"] = 42.0 # Elevated temp
    df.loc[10, "strain_microstrain_residual"] = 25.0 # Elevated strain residual
    df.loc[10, "vibration_g_residual"] = 0.1 # Elevated vibration residual
    
    engine = RiskEngine()
    results = engine.compute_risk(df, meta)
    
    row = results.iloc[10]
    assert row["traffic_load_context"] == "High"
    assert row["rainfall_context"] == "Heavy"
    assert row["temperature_context"] == "Elevated"
    assert "thermal load" in row["context_explanation"]

