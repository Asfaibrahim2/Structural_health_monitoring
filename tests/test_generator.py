import pytest
import numpy as np
import pandas as pd
import os
import json
from ml_engine.data_generator import (
    BRIDGES_METADATA,
    generate_bridge_dataset,
    get_telangana_weather,
    get_traffic_load,
    generate_baseline_telemetry
)
from ml_engine.validation import validate_telemetry_dataset

def test_bridges_metadata_structure():
    """Ensure bridges metadata holds all required properties."""
    for bridge in BRIDGES_METADATA:
        assert "bridge_id" in bridge
        assert "bridge_name" in bridge
        assert "structure_type" in bridge
        assert "construction_year" in bridge
        assert "span_length_m" in bridge
        assert "vulnerability_factor" in bridge
        assert "sensor_count" in bridge
        assert "scenario_type" in bridge
        
        # Values must be physically plausible
        assert bridge["vulnerability_factor"] >= 0.0 and bridge["vulnerability_factor"] <= 1.0
        assert bridge["sensor_count"] >= 4

def test_deterministic_generation():
    """Ensure using the same random seed produces identical telemetry."""
    meta = BRIDGES_METADATA[0]
    
    df1 = generate_bridge_dataset(meta, random_seed=100)
    df2 = generate_bridge_dataset(meta, random_seed=100)
    
    pd.testing.assert_frame_equal(df1, df2)

def test_weather_ranges():
    """Verify generated weather metrics match Telangana monsoon bounds."""
    timestamps = pd.date_range(start="2026-08-01 00:00:00", end="2026-08-05 23:59:00", freq="min")
    temp, hum, wind, rain = get_telangana_weather(timestamps, random_seed=42)
    
    # Assert physical ranges
    assert temp.min() >= 15.0 and temp.max() <= 45.0
    assert hum.min() >= 35.0 and hum.max() <= 100.0
    assert wind.min() >= 0.0 and wind.max() <= 45.0
    assert rain.min() >= 0.0

def test_traffic_load_types():
    """Verify traffic loading matches specific structural schedules."""
    timestamps = pd.date_range(start="2026-08-01 00:00:00", end="2026-08-02 23:59:00", freq="min")
    
    # Commuter Bridge (diurnal double peak)
    bridge_traffic = get_traffic_load(timestamps, "Cable-stayed Bridge", random_seed=42)
    assert bridge_traffic.min() >= 0.0 and bridge_traffic.max() <= 100.0
    
    # Metro Viaduct (periodic trains, flat zero at night)
    metro_timestamps = pd.date_range(start="2026-08-01 01:00:00", end="2026-08-01 04:00:00", freq="min")
    metro_traffic = get_traffic_load(metro_timestamps, "Metro Viaduct", random_seed=42)
    # At 1 AM - 4 AM, no commercial trains run. Crossings should be 0 except for maintenance at 2:30.
    # Main check: values are generally close to 0 except at 02:30.
    crossing_count = np.sum(metro_traffic > 5.0)
    assert crossing_count <= 5 # Maintenance train only

def test_sudden_spike_scenario():
    """Ensure sudden spike scenario creates a transient deviation and decays."""
    # TS-STR-005 Gachibowli Flyover is configured with sudden_spike scenario
    meta = next(b for b in BRIDGES_METADATA if b["bridge_id"] == "TS-STR-005")
    df = generate_bridge_dataset(meta, random_seed=42)
    
    # Spike should happen on Day 15, at 10:15 AM
    spike_time = pd.Timestamp("2026-08-15 10:15:00")
    spike_row = df[df["timestamp"] == spike_time].iloc[0]
    
    # Ground truth should be 1
    assert spike_row["ground_truth_anomaly"] == 1
    assert spike_row["scenario"] == "sudden_spike"
    
    # Values should be extreme compared to baseline bounds
    assert spike_row["vibration_g"] > 0.8
    assert spike_row["displacement_mm"] < 0.0 # sag

def test_sensor_dropout_scenario():
    """Verify that sensor dropout forces flatline zero outputs."""
    # TS-STR-009 Bapu Ghat Steel Bridge has sensor_dropout
    meta = next(b for b in BRIDGES_METADATA if b["bridge_id"] == "TS-STR-009")
    df = generate_bridge_dataset(meta, random_seed=42)
    
    # Dropout happens on Day 14 at 08:00 AM through Day 18 at 08:00 AM
    dropout_time = pd.Timestamp("2026-08-15 12:00:00")
    dropout_row = df[df["timestamp"] == dropout_time].iloc[0]
    
    assert dropout_row["ground_truth_anomaly"] == 1
    assert dropout_row["scenario"] == "sensor_dropout"
    assert dropout_row["vibration_g"] == 0.0

def test_sensor_drift_scenario():
    """Verify that sensor drift introduces a slow linear shift."""
    # TS-STR-008 Gachibowli Metro Viaduct has sensor_drift
    meta = next(b for b in BRIDGES_METADATA if b["bridge_id"] == "TS-STR-008")
    df = generate_bridge_dataset(meta, random_seed=42)
    
    # Drift starts on Day 12. Let's compare strain on Day 11 vs Day 25 at midnight
    val_day11 = df[df["timestamp"] == pd.Timestamp("2026-08-11 00:00:00")]["strain_microstrain"].values[0]
    val_day25 = df[df["timestamp"] == pd.Timestamp("2026-08-25 00:00:00")]["strain_microstrain"].values[0]
    
    # Since temperature at midnight is similar, drift will make Day 25 significantly higher
    # Drift rate is 1.5 microstrain per day, so 13 days of drift is ~19.5 microstrain
    assert (val_day25 - val_day11) > 10.0
