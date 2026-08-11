import os
import json
from datetime import datetime
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session

from ml_engine.data_generator import BRIDGES_METADATA, generate_bridge_dataset
from ml_engine.preprocessing import clean_telemetry_data, compute_features
from ml_engine.baseline import AdaptiveBaselineModel
from ml_engine.anomaly_detector import HybridAnomalyDetector
import os
import joblib

# Global Isolation Forest model (loaded once at startup)
_ISOLATION_MODEL = None

def _load_isolation_forest_model():
    """Load the trained IsolationForest model from ml_engine/models directory.
    Returns the model instance or raises FileNotFoundError.
    """
    global _ISOLATION_MODEL
    if _ISOLATION_MODEL is None:
        model_path = os.path.join("c:/ai_xdomain/infrastructure/ml_engine/models", "isolation_forest.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"IsolationForest model not found at {model_path}")
        _ISOLATION_MODEL = joblib.load(model_path)
    return _ISOLATION_MODEL
from ml_engine.risk_engine import RiskEngine

from backend.app.repository import (
    BridgeRepository, TelemetryRepository, RiskRepository, 
    AnomalyRepository, SensorHealthRepository, SimulationRepository
)
from backend.app.schemas import SimulateRequest, SimulateResponse

def seed_initial_data(db: Session):
    """
    On FastAPI startup, seeds the SQLite database with the 20 bridge metadata records
    and processes telemetry data if the database is empty.
    """
    existing_bridges = BridgeRepository.get_all_bridges(db)
    if len(existing_bridges) > 0:
        return # Database already seeded
        
    print("Seeding SQLite database with 20 Telangana bridge structures...")
    current_year = 2026
    
    # 1. Seed Bridges
    for b in BRIDGES_METADATA:
        b_data = {
            "bridge_id": b["bridge_id"],
            "bridge_name": b["bridge_name"],
            "structure_type": b["structure_type"],
            "construction_year": b["construction_year"],
            "age_years": current_year - b["construction_year"],
            "span_length_m": b["span_length_m"],
            "vulnerability_factor": b["vulnerability_factor"],
            "sensor_count": b["sensor_count"],
            "scenario_type": b["scenario_type"]
        }
        BridgeRepository.create_or_update_bridge(db, b_data)
        
    # 2. Check if processed/raw CSV exists to populate initial readings
    raw_csv = "c:/ai_xdomain/infrastructure/data/raw/bridge_telemetry.csv"
    if os.path.exists(raw_csv):
        print("Populating initial database telemetry from raw CSV (sampling latest timestamps per bridge)...")
        # Load a sample (e.g. last 100 rows per bridge to keep DB initial load super fast)
        df_raw = pd.read_csv(raw_csv)
        
        # Take last 50 readings per bridge
        sampled_dfs = []
        for b_id, group in df_raw.groupby("bridge_id"):
            sampled_dfs.append(group.tail(50))
            
        df_sample = pd.concat(sampled_dfs, ignore_index=True)
        
        # Convert to dictionary mappings for bulk insert
        readings_list = df_sample.to_dict(orient="records")
        TelemetryRepository.bulk_insert_readings(db, readings_list)
        
        # Process baseline and risk for sample
        df_cleaned = clean_telemetry_data(df_sample)
        df_feat = compute_features(df_cleaned)
        
        # Fit baseline on first half of sample
        t_start = str(df_feat["timestamp"].min())
        t_end = str(df_feat["timestamp"].max())
        
        baseline = AdaptiveBaselineModel(version="v1.0")
        try:
            baseline.fit(df_feat, train_start=t_start, train_end=t_end)
            df_res = baseline.predict(df_feat)
            
            detector = HybridAnomalyDetector()
            detector.fit_ml_detector(df_res)
            df_det = detector.run_detection_pipeline(df_res)
            
            risk_eng = RiskEngine()
            
            for b_id, group in df_det.groupby("bridge_id"):
                meta = next((b for b in BRIDGES_METADATA if b["bridge_id"] == b_id), {})
                df_risk = risk_eng.compute_risk(group, meta)
                
                # Save latest risk assessment
                latest_row = df_risk.iloc[-1]
                risk_data = {
                    "bridge_id": b_id,
                    "timestamp": str(latest_row["timestamp"]),
                    "risk_score": float(latest_row["risk_score"]),
                    "uncertainty": float(latest_row["uncertainty"]),
                    "confidence_score": float(latest_row["confidence_score"]),
                    "inspection_priority": str(latest_row["inspection_priority"]),
                    "severity_score": float(latest_row["severity_score"]),
                    "persistence_score": float(latest_row["persistence_score"]),
                    "sensor_agreement_score": float(latest_row["sensor_agreement_score"]),
                    "trend_score": float(latest_row["trend_score"]),
                    "asset_vulnerability_score": float(latest_row["asset_vulnerability_score"]),
                    "context_score": float(latest_row["context_score"]),
                    "data_quality_score": float(latest_row["data_quality_score"]),
                    "risk_explanation": str(latest_row["risk_explanation"])
                }
                RiskRepository.create_risk_assessment(db, risk_data)
                
                # Save Sensor Health
                for sensor_type in ["strain_microstrain", "vibration_g", "displacement_mm"]:
                    health_data = {
                        "bridge_id": b_id,
                        "sensor_id": f"{b_id}_NODE_A",
                        "missing_ratio": float(latest_row.get(f"{sensor_type}_was_missing", 0)),
                        "flatline_flag": int(latest_row.get(f"{sensor_type}_flatline_flag", 0)),
                        "noise_flag": 0,
                        "drift_score": 0.0,
                        "health_score": float(latest_row.get(f"{sensor_type}_health_score", 100.0)),
                        "last_seen": str(latest_row["timestamp"])
                    }
                    SensorHealthRepository.create_or_update_health(db, health_data)
                    
                # Save Anomaly Events if active
                anom_type = str(latest_row["anomaly_type"])
                if anom_type != "normal":
                    event_data = {
                        "bridge_id": b_id,
                        "start_time": str(latest_row.get("anomaly_start", latest_row["timestamp"])),
                        "end_time": str(latest_row.get("anomaly_end", "")),
                        "anomaly_type": anom_type,
                        "severity": "CRITICAL" if latest_row["inspection_priority"] in ["P1", "P2"] else "WARNING",
                        "duration_minutes": int(latest_row.get("duration_minutes", 15)),
                        "description": f"Automated alert: {anom_type} detected.",
                        "status": "OPEN"
                    }
                    AnomalyRepository.create_event(db, event_data)
        except Exception as e:
            print(f"Warning during baseline seeding: {e}")
            
    print("Database seeding completed.")

def run_simulation(db: Session, req: SimulateRequest) -> SimulateResponse:
    """
    Executes a deterministic what-if scenario simulation without retraining the baseline model.
    Modifies traffic, rainfall, temperature, and maintenance delay parameters against latest readings,
    recomputes expected values, residuals, risk scores, priority, confidence, and uncertainty,
    stores the run in SQLite, and returns current, simulated, and delta values with explicit disclaimer labels.
    """
    bridge = BridgeRepository.get_bridge_by_id(db, req.bridge_id)
    if not bridge:
        raise ValueError(f"Bridge {req.bridge_id} not found.")
        
    latest_reading = TelemetryRepository.get_latest_reading(db, req.bridge_id)
    latest_risk = RiskRepository.get_latest_risk(db, req.bridge_id)
    
    # Baseline defaults if latest reading is missing
    orig_strain = latest_reading.strain_microstrain if latest_reading and latest_reading.strain_microstrain is not None else 48.5
    orig_vib = latest_reading.vibration_g if latest_reading and latest_reading.vibration_g is not None else 0.012
    orig_disp = latest_reading.displacement_mm if latest_reading and latest_reading.displacement_mm is not None else 10.1
    orig_temp = latest_reading.temperature_c if latest_reading and latest_reading.temperature_c is not None else 28.0
    orig_rain = latest_reading.rainfall_mm if latest_reading and latest_reading.rainfall_mm is not None else 0.0
    orig_traffic = latest_reading.traffic_load_percent if latest_reading and latest_reading.traffic_load_percent is not None else 45.0
    
    orig_risk = latest_risk.risk_score if latest_risk else 18.5
    orig_prio = latest_risk.inspection_priority if latest_risk else "P4"
    orig_conf = latest_risk.confidence_score if latest_risk else 98.0
    orig_uncert = latest_risk.uncertainty if latest_risk else 2.0
    
    current_values = {
        "strain_microstrain": float(orig_strain),
        "vibration_g": float(orig_vib),
        "displacement_mm": float(orig_disp),
        "temperature_c": float(orig_temp),
        "rainfall_mm": float(orig_rain),
        "traffic_load_percent": float(orig_traffic),
        "maintenance_delay_days": 0.0,
        "risk_score": float(orig_risk),
        "inspection_priority": orig_prio,
        "confidence_score": float(orig_conf),
        "uncertainty": float(orig_uncert)
    }
    
    # Apply parameter deltas without retraining
    new_temp = req.temperature_c if req.temperature_c is not None else orig_temp
    new_traffic = req.traffic_load_percent if req.traffic_load_percent is not None else orig_traffic
    new_rain = req.rainfall_mm if req.rainfall_mm is not None else orig_rain
    maint_days = req.maintenance_delay_days if req.maintenance_delay_days is not None else 0.0
    
    temp_diff = new_temp - orig_temp
    traffic_diff = new_traffic - orig_traffic
    rain_diff = new_rain - orig_rain
    
    # Recompute expected structural metrics using pre-trained physical baseline responses
    sim_strain = orig_strain - 1.2 * temp_diff + 0.25 * traffic_diff + 0.4 * maint_days
    sim_vib = max(0.001, orig_vib + 0.0003 * traffic_diff + 0.008 * rain_diff)
    sim_disp = orig_disp + 0.06 * temp_diff - 0.02 * traffic_diff + 0.08 * maint_days
    
    # Compute simulated Z-score residual severity
    strain_residual_z = abs(sim_strain - 48.5) / 5.0
    vib_residual_z = abs(sim_vib - 0.012) / 0.01
    disp_residual_z = abs(sim_disp - 10.1) / 1.0
    
    max_z = max(strain_residual_z, vib_residual_z, disp_residual_z)
    severity_score = min(100.0, (max_z / 6.0) * 100.0)
    
    # Context score (traffic + rain/temp extreme)
    context_score = min(100.0, (new_traffic / 100.0) * 50.0 + (new_rain / 10.0) * 30.0 + (abs(new_temp - 25.0) / 20.0) * 20.0)
    
    # Maintenance delay adds cumulative trend degradation
    trend_score = min(100.0, (maint_days / 90.0) * 80.0)
    
    # Transparent Risk Formula
    sim_risk = min(100.0, (
        0.25 * severity_score +
        0.20 * (50.0 if max_z > 2.5 else 0.0) +
        0.20 * (66.7 if max_z > 2.5 else 0.0) +
        0.10 * trend_score +
        0.10 * (bridge.vulnerability_factor * 100.0) +
        0.05 * context_score +
        0.10 * 100.0
    ))
    
    if sim_risk >= 80.0:
        sim_prio = "P1"
    elif sim_risk >= 60.0:
        sim_prio = "P2"
    elif sim_risk >= 35.0:
        sim_prio = "P3"
    else:
        sim_prio = "P4"
        
    # Uncertainty increases as maintenance delay or extreme rainfall grows
    sim_uncert = min(50.0, orig_uncert + 0.12 * maint_days + 0.5 * new_rain)
    sim_conf = max(50.0, 100.0 - sim_uncert)
    
    # Compute global Isolation Forest anomaly score using the trained model
    _model = _load_isolation_forest_model()
    # Feature vector: [strain, vibration, displacement, temperature, humidity_placeholder, rainfall, traffic, wind_speed_placeholder]
    X_feat = np.array([[sim_strain, sim_vib, sim_disp, new_temp, 0.0, new_rain, new_traffic, 0.0]])
    dec = _model.decision_function(X_feat)[0]
    global_iso_score = float(np.clip((0.15 - dec) / 0.3, 0.0, 1.0))

    simulated_values = {
        "strain_microstrain": float(sim_strain),
        "vibration_g": float(sim_vib),
        "displacement_mm": float(sim_disp),
        "temperature_c": float(new_temp),
        "rainfall_mm": float(new_rain),
        "traffic_load_percent": float(new_traffic),
        "maintenance_delay_days": float(maint_days),
        "risk_score": float(sim_risk),
        "inspection_priority": sim_prio,
        "confidence_score": float(sim_conf),
        "uncertainty": float(sim_uncert),
        "global_isolation_score": global_iso_score
    }
    
    delta_values = {
        "strain_microstrain_delta": float(sim_strain - orig_strain),
        "vibration_g_delta": float(sim_vib - orig_vib),
        "displacement_mm_delta": float(sim_disp - orig_disp),
        "risk_score_delta": float(sim_risk - orig_risk),
        "confidence_score_delta": float(sim_conf - orig_conf),
        "uncertainty_delta": float(sim_uncert - orig_uncert)
    }
    
    affected_evidence = []
    if abs(sim_strain - orig_strain) > 5.0:
        affected_evidence.append(f"Microstrain shifted by {sim_strain - orig_strain:+.1f} µε due to thermal/traffic load.")
    if abs(sim_vib - orig_vib) > 0.005:
        affected_evidence.append(f"Vibration shifted by {sim_vib - orig_vib:+.3f}g under rainfall/traffic conditions.")
    if abs(sim_disp - orig_disp) > 1.0:
        affected_evidence.append(f"Structural displacement shifted by {sim_disp - orig_disp:+.1f}mm.")
    if maint_days > 0:
        affected_evidence.append(f"Maintenance deferred by {maint_days:.0f} days, compounding trend risk by +{(maint_days/90.0)*80.0:.1f}%.")
        
    if not affected_evidence:
        affected_evidence.append("All structural parameter shifts remain within historical tolerance limits.")
        
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    expl = (
        f"Model-Based Scenario for '{bridge.bridge_name}': Traffic={new_traffic}%, Rain={new_rain}mm, "
        f"Temp={new_temp}°C, Maintenance Delay={maint_days} days. "
        f"Simulated Risk: {sim_risk:.1f} ({sim_prio}). Risk Delta: {sim_risk - orig_risk:+.1f} points."
    )
    
    # Store run log in SQLite simulation_runs
    sim_data = {
        "bridge_id": req.bridge_id,
        "scenario_name": req.scenario_name,
        "parameters_json": json.dumps(req.model_dump()),
        "result_risk_score": float(sim_risk),
        "result_priority": sim_prio
    }
    SimulationRepository.create_simulation_run(db, sim_data)
    
    return SimulateResponse(
        bridge_id=req.bridge_id,
        timestamp=now_str,
        disclaimer="Model-based scenario evaluation, not certified engineering prediction.",
        current_values=current_values,
        simulated_values=simulated_values,
        delta_values=delta_values,
        affected_evidence=affected_evidence,
        explanation=expl
    )
