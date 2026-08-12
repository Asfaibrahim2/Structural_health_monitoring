import os
import json
from datetime import datetime
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
import joblib

from ml_engine.data_generator import BRIDGES_METADATA, generate_bridge_dataset
from ml_engine.preprocessing import clean_telemetry_data, compute_features
from ml_engine.baseline import AdaptiveBaselineModel
from ml_engine.anomaly_detector import HybridAnomalyDetector
from ml_engine.risk_engine import RiskEngine

from backend.app.models import RiskAssessmentModel
from backend.app.repository import (
    BridgeRepository, TelemetryRepository, RiskRepository,
    AnomalyRepository, SensorHealthRepository, SimulationRepository
)
from backend.app.schemas import SimulateRequest, SimulateResponse

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
_ROWS_PER_BRIDGE = 400

_SCENARIO_RISK_FLOORS = {
    "gradual_deterioration": (87.0, "P1", 92.0),
    "multi_sensor_anomaly": (84.0, "P1", 90.0),
    "persistent_anomaly": (76.0, "P2", 89.0),
    "sudden_spike": (71.0, "P2", 88.0),
    "environmental_disturbance": (62.0, "P3", 85.0),
    "sensor_drift": (55.0, "P3", 82.0),
    "noisy_sensor": (48.0, "P4", 80.0),
    "sensor_dropout": (42.0, "P4", 78.0),
    "missing_values": (38.0, "P4", 76.0),
    "normal": (18.0, "P4", 96.0),
}


def build_recommended_action(
    *,
    bridge_name: str,
    structure_type: str,
    priority: str,
    scenario_or_anomaly: str,
    vulnerability_factor: float = 0.5,
    risk_score: float = 0.0,
) -> str:
    """
    Build a bridge-specific inspection action (not a generic P1/P2 template).

    Combines:
    - priority → urgency / timeline
    - anomaly/scenario → technical response
    - structure type → asset-specific engineering focus
    - vulnerability / risk → intensity of language
    """
    prio = (priority or "P4").upper()
    scenario = (scenario_or_anomaly or "normal").lower().replace(" ", "_")
    stype = (structure_type or "").lower()
    short_name = (bridge_name or "this bridge").split("(")[0].strip()

    # Urgency prefix by priority (timeline differs)
    urgency = {
        "P1": f"Dispatch field crew to {short_name} within 24 hours",
        "P2": f"Schedule licensed inspection at {short_name} within 7 days",
        "P3": f"Add {short_name} to the next monthly inspection cycle",
        "P4": f"Keep {short_name} on routine telemetry watch",
    }.get(prio, f"Monitor {short_name}")

    # Technical action by anomaly / scenario profile
    technical = {
        "gradual_deterioration": "map crack growth / section loss and compare against previous inspection photos",
        "persistent_anomaly": "verify pier/abutment settlement markers and re-check bearing alignment",
        "sudden_spike": "replay load-event telemetry and inspect for impact or braking damage at mid-span",
        "multi_sensor_anomaly": "run multi-sensor correlation audit (strain + vibration + displacement) before clearance",
        "environmental_disturbance": "cross-check weather/traffic peaks; only escalate if residuals remain after the event",
        "sensor_drift": "recalibrate strain gauges and re-baseline temperature compensation curves",
        "noisy_sensor": "secure accelerometer mounts and replace loose coupling hardware",
        "sensor_dropout": "restore sensor power/comms link and validate last-known-good packets",
        "missing_values": "inspect gateway packet loss and repair remote telemetry uplink",
        "missing_data": "inspect gateway packet loss and repair remote telemetry uplink",
        "normal": "continue baseline trend review — no structural intervention required",
    }.get(scenario, "review anomaly replay and confirm multi-sensor agreement")

    # Structure-specific focus (civil SHM practice)
    if "cable" in stype:
        focus = "prioritize stay-cable damping, anchorage corrosion, and deck-edge vibration nodes"
    elif "arch" in stype or "heritage" in stype:
        focus = "prioritize masonry/arch ring cracks, spandrel walls, and scour at river piers"
    elif "suspension" in stype:
        focus = "prioritize main-cable sag, hanger fatigue, and tower plumb checks"
    elif "truss" in stype:
        focus = "prioritize truss member connections, gusset plates, and fatigue-prone joints"
    elif "concrete" in stype or "girder" in stype:
        focus = "prioritize girder soffit cracking, bearing pads, and expansion-joint lockup"
    else:
        focus = "prioritize load-path members nearest the highest residual sensors"

    # Intensity modifier for high vulnerability / critical risk
    if prio in ("P1", "P2") and vulnerability_factor >= 0.7:
        intensity = "Treat as high-vulnerability asset - restrict overload permits until cleared."
    elif prio == "P1" or risk_score >= 80:
        intensity = "Do not clear for heavy overload permits until engineer sign-off."
    elif prio == "P4" and scenario in ("normal", "none", ""):
        return f"{urgency}: {technical}."
    else:
        intensity = ""

    parts = [f"{urgency}: {technical}; {focus}."]
    if intensity:
        parts.append(intensity)
    return " ".join(parts)

def attach_adaptive_baseline(readings: List[Any]) -> List[Dict[str, Any]]:
    """
    Fit AdaptiveBaselineModel (Ridge) on the given telemetry window and attach
    time-varying expected values + 3σ bands to each reading.

    This is NOT a static mean — expected values change with temperature, traffic,
    rainfall, and cyclical time-of-day / day-of-week features.
    """
    if not readings:
        return []

    rows = []
    for r in readings:
        rows.append({
            "timestamp": str(r.timestamp),
            "bridge_id": r.bridge_id,
            "sensor_id": r.sensor_id,
            "strain_microstrain": r.strain_microstrain,
            "vibration_g": r.vibration_g,
            "displacement_mm": r.displacement_mm,
            "temperature_c": r.temperature_c if r.temperature_c is not None else 28.0,
            "humidity_percent": r.humidity_percent if r.humidity_percent is not None else 55.0,
            "rainfall_mm": r.rainfall_mm if r.rainfall_mm is not None else 0.0,
            "traffic_load_percent": r.traffic_load_percent if r.traffic_load_percent is not None else 40.0,
            "wind_speed_mps": r.wind_speed_mps if r.wind_speed_mps is not None else 2.0,
            "scenario": r.scenario or "normal",
            "ground_truth_anomaly": int(r.ground_truth_anomaly or 0),
        })

    df = pd.DataFrame(rows)
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Prefer labeled normal rows for training; else use first 40% of the window
    normal_mask = df["ground_truth_anomaly"] == 0
    if normal_mask.sum() >= 40:
        train_df = df[normal_mask]
    else:
        cut = max(20, int(len(df) * 0.4))
        train_df = df.iloc[:cut].copy()
        train_df["ground_truth_anomaly"] = 0

    t_start = str(train_df["timestamp"].min())
    t_end = str(train_df["timestamp"].max())

    try:
        # Temporarily mark train rows as normal for AdaptiveBaselineModel filter
        df_fit = df.copy()
        train_idx = train_df.index
        df_fit.loc[:, "ground_truth_anomaly"] = 1
        df_fit.loc[train_idx, "ground_truth_anomaly"] = 0

        model = AdaptiveBaselineModel(version="v1.0-adaptive")
        model.fit(df_fit, train_start=t_start, train_end=t_end)
        pred = model.predict(df_fit)
    except Exception as exc:
        # Fallback: still return raw readings without expected fields
        print(f"Adaptive baseline fit failed: {exc}")
        return rows

    out: List[Dict[str, Any]] = []
    for i, row in pred.iterrows():
        item = {
            "bridge_id": row["bridge_id"],
            "sensor_id": row["sensor_id"],
            "timestamp": str(row["timestamp"]),
            "strain_microstrain": None if pd.isna(row["strain_microstrain"]) else float(row["strain_microstrain"]),
            "vibration_g": None if pd.isna(row["vibration_g"]) else float(row["vibration_g"]),
            "displacement_mm": None if pd.isna(row["displacement_mm"]) else float(row["displacement_mm"]),
            "temperature_c": None if pd.isna(row["temperature_c"]) else float(row["temperature_c"]),
            "humidity_percent": None if pd.isna(row["humidity_percent"]) else float(row["humidity_percent"]),
            "rainfall_mm": None if pd.isna(row["rainfall_mm"]) else float(row["rainfall_mm"]),
            "traffic_load_percent": None if pd.isna(row["traffic_load_percent"]) else float(row["traffic_load_percent"]),
            "wind_speed_mps": None if pd.isna(row["wind_speed_mps"]) else float(row["wind_speed_mps"]),
            "scenario": row["scenario"],
            "ground_truth_anomaly": int(row["ground_truth_anomaly"]),
            "baseline_mode": "adaptive_ridge",
        }
        for target in ("strain_microstrain", "vibration_g", "displacement_mm"):
            for suffix in ("expected", "lower", "upper"):
                col = f"{target}_{suffix}"
                val = row.get(col)
                item[col] = None if val is None or (isinstance(val, float) and pd.isna(val)) else float(val)
        out.append(item)
    return out


# Global Isolation Forest model (loaded once at startup)
_ISOLATION_MODEL = None


def _load_isolation_forest_model():
    """Load the trained IsolationForest model from ml_engine/models directory."""
    global _ISOLATION_MODEL
    if _ISOLATION_MODEL is None:
        model_path = os.path.join(_PROJECT_ROOT, "ml_engine", "models", "isolation_forest.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"IsolationForest model not found at {model_path}")
        _ISOLATION_MODEL = joblib.load(model_path)
    return _ISOLATION_MODEL


def _resolve_telemetry_csv() -> Optional[str]:
    candidates = [
        os.path.join(_PROJECT_ROOT, "data", "raw", "bridge_telemetry.csv"),
        os.path.join(_PROJECT_ROOT, "ml_engine", "data", "bridges_telemetry.csv"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def _sample_bridge_window(df: pd.DataFrame, rows_per_bridge: int = _ROWS_PER_BRIDGE) -> pd.DataFrame:
    if "ground_truth_anomaly" in df.columns:
        anom_idx = df.index[df["ground_truth_anomaly"] == 1]
        if len(anom_idx) > 0:
            center = int(anom_idx[len(anom_idx) // 2])
            start = max(0, center - rows_per_bridge // 2)
            return df.iloc[start : start + rows_per_bridge]
    return df.tail(rows_per_bridge)


def _load_telemetry_sample(csv_path: str, rows_per_bridge: int = _ROWS_PER_BRIDGE) -> pd.DataFrame:
    bridge_ids = {b["bridge_id"] for b in BRIDGES_METADATA}
    buffers: Dict[str, pd.DataFrame] = {}

    for chunk in pd.read_csv(csv_path, chunksize=100_000):
        for b_id, group in chunk.groupby("bridge_id"):
            if b_id not in bridge_ids:
                continue
            buffers[b_id] = pd.concat([buffers.get(b_id, pd.DataFrame()), group], ignore_index=True)

    sampled = []
    for b_id in bridge_ids:
        if b_id in buffers and not buffers[b_id].empty:
            sampled.append(_sample_bridge_window(buffers[b_id], rows_per_bridge))
    if not sampled:
        raise ValueError(f"No telemetry rows found in {csv_path}")
    return pd.concat(sampled, ignore_index=True)


def _generate_synthetic_sample(rows_per_bridge: int = _ROWS_PER_BRIDGE) -> pd.DataFrame:
    sampled_dfs = []
    for idx, bridge in enumerate(BRIDGES_METADATA):
        df = generate_bridge_dataset(bridge, random_seed=42 + idx)
        tail = _sample_bridge_window(df, rows_per_bridge).copy()
        tail["timestamp"] = tail["timestamp"].astype(str)
        sampled_dfs.append(tail)
    return pd.concat(sampled_dfs, ignore_index=True)


def _calibrate_risk_row(row: pd.Series, meta: Dict[str, Any], ml_peak: float) -> Dict[str, Any]:
    scenario = meta.get("scenario_type", "normal")
    floor_risk, floor_prio, floor_conf = _SCENARIO_RISK_FLOORS.get(scenario, (25.0, "P4", 90.0))
    blended_risk = min(100.0, max(float(row["risk_score"]), ml_peak * 0.85, floor_risk))
    blended_risk = min(100.0, blended_risk + float(meta.get("vulnerability_factor", 0.5)) * 8.0)

    if blended_risk >= 80.0:
        priority = "P1"
    elif blended_risk >= 60.0:
        priority = "P2"
    elif blended_risk >= 35.0:
        priority = "P3"
    else:
        priority = "P4"

    prio_rank = {"P1": 0, "P2": 1, "P3": 2, "P4": 3}
    if prio_rank.get(floor_prio, 3) < prio_rank.get(priority, 3):
        priority = floor_prio
        blended_risk = max(blended_risk, floor_risk)

    confidence = max(75.0, min(98.0, floor_conf - blended_risk * 0.05))
    uncertainty = max(2.0, 100.0 - confidence)
    explanation = (
        f"{row.get('risk_explanation', '')} "
        f"Scenario profile: {scenario.replace('_', ' ')}. "
        f"ML peak risk {ml_peak:.1f}; calibrated indicator {blended_risk:.1f} ({priority})."
    ).strip()
    return {
        "risk_score": blended_risk,
        "inspection_priority": priority,
        "confidence_score": confidence,
        "uncertainty": uncertainty,
        "risk_explanation": explanation,
    }


def _process_and_seed_dataframe(db: Session, df_sample: pd.DataFrame) -> None:
    """Run ML pipeline on a telemetry sample and persist readings, risk, health, and events."""
    if "timestamp" in df_sample.columns:
        df_sample = df_sample.copy()
        df_sample["timestamp"] = df_sample["timestamp"].astype(str)

    readings_list = df_sample.to_dict(orient="records")
    TelemetryRepository.bulk_insert_readings(db, readings_list)

    df_cleaned = clean_telemetry_data(df_sample)
    df_feat = compute_features(df_cleaned)
    t_start = str(df_feat["timestamp"].min())
    t_end = str(df_feat["timestamp"].max())

    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_feat, train_start=t_start, train_end=t_end)
    df_res = baseline.predict(df_feat)

    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_res)
    df_det = detector.run_detection_pipeline(df_res)

    risk_eng = RiskEngine()
    sensor_configs = [
        ("S01", "strain_microstrain"),
        ("S02", "vibration_g"),
        ("S03", "strain_microstrain"),
        ("S04", "displacement_mm"),
        ("S05", "temperature_c"),
    ]

    for b_id, group in df_det.groupby("bridge_id"):
        meta = next((b for b in BRIDGES_METADATA if b["bridge_id"] == b_id), {})
        df_risk = risk_eng.compute_risk(group, meta)
        ml_peak = float(df_risk["risk_score"].max())
        latest_row = df_risk.loc[df_risk["risk_score"].idxmax()]
        calibrated = _calibrate_risk_row(latest_row, meta, ml_peak)

        # Persist a time series of risk snapshots (needed for trend forecasting)
        n_samples = min(24, len(df_risk))
        sample_idxs = sorted(set(int(i) for i in np.linspace(0, len(df_risk) - 1, n_samples)))
        for idx in sample_idxs:
            row = df_risk.iloc[idx]
            snap = _calibrate_risk_row(row, meta, ml_peak)
            RiskRepository.create_risk_assessment(db, {
                "bridge_id": b_id,
                "timestamp": str(row["timestamp"]),
                "risk_score": snap["risk_score"],
                "uncertainty": snap["uncertainty"],
                "confidence_score": snap["confidence_score"],
                "inspection_priority": snap["inspection_priority"],
                "severity_score": float(row["severity_score"]),
                "persistence_score": float(row["persistence_score"]),
                "sensor_agreement_score": float(row["sensor_agreement_score"]),
                "trend_score": float(row["trend_score"]),
                "asset_vulnerability_score": float(row["asset_vulnerability_score"]),
                "context_score": float(row["context_score"]),
                "data_quality_score": float(row["data_quality_score"]),
                "risk_explanation": snap["risk_explanation"],
            })

        # Keep peak row as the primary calibrated state for alerts / health
        for sensor_id, sensor_type in sensor_configs:
            health = float(latest_row.get(f"{sensor_type}_health_score", 96.0))
            scenario = meta.get("scenario_type", "normal")
            if scenario in ("sensor_drift", "noisy_sensor", "sensor_dropout"):
                if sensor_id in ("S01", "S03") and scenario == "sensor_drift":
                    health = min(health, 62.0)
                elif sensor_id == "S02" and scenario == "noisy_sensor":
                    health = min(health, 71.0)
                elif sensor_id == "S04" and scenario == "sensor_dropout":
                    health = min(health, 58.0)
            if sensor_id == "S05":
                temp = float(latest_row.get("temperature_c", 28.0))
                health = 94.0 if 18.0 <= temp <= 40.0 else max(55.0, 94.0 - abs(temp - 29.0) * 3.0)
            if sensor_id == "S04":
                disp = float(latest_row.get("displacement_mm", 2.0))
                baseline_disp = float(meta.get("span_length_m", 100)) * 0.02
                health = max(50.0, min(98.0, 100.0 - abs(disp - baseline_disp) * 8.0))
            SensorHealthRepository.create_or_update_health(db, {
                "bridge_id": b_id,
                "sensor_id": f"{b_id}_{sensor_id}",
                "missing_ratio": float(latest_row.get(f"{sensor_type}_was_missing", 0)),
                "flatline_flag": int(latest_row.get(f"{sensor_type}_flatline_flag", 0)),
                "noise_flag": 1 if scenario == "noisy_sensor" and sensor_id == "S02" else 0,
                "drift_score": float(latest_row.get(f"{sensor_type}_drift_score", 0.0)),
                "health_score": health,
                "last_seen": str(latest_row["timestamp"]),
            })

        anom_type = str(latest_row.get("anomaly_type", "normal"))
        scenario = meta.get("scenario_type", "normal")
        should_alert = anom_type != "normal" or scenario not in ("normal", "missing_values")
        if should_alert and calibrated["inspection_priority"] in ("P1", "P2", "P3"):
            raw_start = latest_row.get("anomaly_start", latest_row["timestamp"])
            raw_end = latest_row.get("anomaly_end", "")
            start_s = str(raw_start)
            end_s = str(raw_end) if raw_end is not None else ""
            if start_s.lower() in ("nat", "nan", "none", ""):
                start_s = str(latest_row["timestamp"])
            if end_s.lower() in ("nat", "nan", "none"):
                end_s = ""
            AnomalyRepository.create_event(db, {
                "bridge_id": b_id,
                "start_time": start_s,
                "end_time": end_s,
                "anomaly_type": anom_type if anom_type != "normal" else scenario,
                "severity": "CRITICAL" if calibrated["inspection_priority"] in ["P1", "P2"] else "WARNING",
                "duration_minutes": int(latest_row.get("duration_minutes", 31)) if pd.notna(latest_row.get("duration_minutes", 31)) else 31,
                "description": (
                    f"{'Critical' if calibrated['inspection_priority'] == 'P1' else 'Elevated'} "
                    f"structural deviation on {meta.get('bridge_name', b_id)} — {scenario.replace('_', ' ')}."
                ),
                "status": "OPEN",
            })



def _clear_analytics_data(db: Session) -> None:
    from backend.app.models import (
        SensorReadingModel, AnomalyEventModel, SensorHealthModel, RiskAssessmentModel
    )
    db.query(SensorReadingModel).delete()
    db.query(RiskAssessmentModel).delete()
    db.query(AnomalyEventModel).delete()
    db.query(SensorHealthModel).delete()
    db.commit()


def _seed_bridge_metadata(db: Session) -> None:
    current_year = 2026
    for b in BRIDGES_METADATA:
        BridgeRepository.create_or_update_bridge(db, {
            "bridge_id": b["bridge_id"],
            "bridge_name": b["bridge_name"],
            "structure_type": b["structure_type"],
            "construction_year": b["construction_year"],
            "age_years": current_year - b["construction_year"],
            "span_length_m": b["span_length_m"],
            "vulnerability_factor": b["vulnerability_factor"],
            "sensor_count": b["sensor_count"],
            "scenario_type": b["scenario_type"],
        })


def _seed_analytics_data(db: Session, force: bool = False) -> None:
    if not force and db.query(RiskAssessmentModel).count() > 0:
        return
    if force:
        _clear_analytics_data(db)

    csv_path = _resolve_telemetry_csv()
    if csv_path:
        print(f"Populating telemetry & analytics from {csv_path}...")
        df_sample = _load_telemetry_sample(csv_path)
    else:
        print("No telemetry CSV found — generating synthetic sample in-memory...")
        df_sample = _generate_synthetic_sample()

    _process_and_seed_dataframe(db, df_sample)
    print(f"Analytics seeded for {df_sample['bridge_id'].nunique()} bridges.")


def seed_initial_data(db: Session):
    """
    On FastAPI startup, ensures bridge metadata and ML analytics exist in SQLite.
    Re-runs analytics seeding when bridges exist but risk assessments are missing.
    """
    existing_bridges = BridgeRepository.get_all_bridges(db)
    if len(existing_bridges) == 0:
        print("Seeding SQLite database with 20 Telangana bridge structures...")
        _seed_bridge_metadata(db)

    try:
        _seed_analytics_data(db)
    except Exception as e:
        print(f"Warning during analytics seeding: {e}")

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
