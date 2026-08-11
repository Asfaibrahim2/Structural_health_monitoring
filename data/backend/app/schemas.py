from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

# Health check
class HealthCheckResponse(BaseModel):
    status: str
    version: str
    database: str
    timestamp: str

# Bridge schemas
class BridgeBase(BaseModel):
    bridge_id: str
    bridge_name: str
    structure_type: str
    construction_year: int
    age_years: int
    span_length_m: float
    vulnerability_factor: float
    sensor_count: int
    scenario_type: str

class BridgeSummary(BridgeBase):
    latest_risk_score: Optional[float] = 0.0
    latest_inspection_priority: Optional[str] = "P4"
    active_anomaly_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Telemetry / Sensor Reading
class SensorReadingBase(BaseModel):
    bridge_id: str
    sensor_id: str
    timestamp: str
    strain_microstrain: Optional[float] = None
    vibration_g: Optional[float] = None
    displacement_mm: Optional[float] = None
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    rainfall_mm: Optional[float] = None
    traffic_load_percent: Optional[float] = None
    wind_speed_mps: Optional[float] = None
    scenario: str
    ground_truth_anomaly: int

    class Config:
        from_attributes = True

# Risk Assessment
class RiskAssessmentSchema(BaseModel):
    bridge_id: str
    timestamp: str
    risk_score: float
    uncertainty: float
    confidence_score: float
    inspection_priority: str
    severity_score: float
    persistence_score: float
    sensor_agreement_score: float
    trend_score: float
    asset_vulnerability_score: float
    context_score: float
    data_quality_score: float
    risk_explanation: str

    class Config:
        from_attributes = True

# Combined Latest Reading
class BridgeLatestState(BaseModel):
    bridge_id: str
    latest_reading: Optional[SensorReadingBase] = None
    latest_risk: Optional[RiskAssessmentSchema] = None

# Anomaly Event
class AnomalyEventSchema(BaseModel):
    id: int
    bridge_id: str
    start_time: str
    end_time: Optional[str] = None
    anomaly_type: str
    severity: str
    duration_minutes: int
    description: str
    status: str

    class Config:
        from_attributes = True

# Inspection Queue Item
class InspectionQueueItem(BaseModel):
    bridge_id: str
    bridge_name: str
    structure_type: str
    inspection_priority: str
    risk_score: float
    uncertainty: float
    active_anomaly_type: Optional[str] = "None"
    vulnerability_factor: float

# Sensor Health
class SensorHealthSchema(BaseModel):
    bridge_id: str
    sensor_id: str
    missing_ratio: float
    flatline_flag: int
    noise_flag: int
    drift_score: float
    health_score: float
    last_seen: str

    class Config:
        from_attributes = True

# Simulation Request & Response
class SimulateRequest(BaseModel):
    bridge_id: str
    scenario_name: str = Field(default="custom_what_if", description="Scenario name or description")
    temperature_c: Optional[float] = Field(default=28.0, ge=-10.0, le=60.0)
    traffic_load_percent: Optional[float] = Field(default=50.0, ge=0.0, le=200.0)
    rainfall_mm: Optional[float] = Field(default=0.0, ge=0.0, le=50.0)
    maintenance_delay_days: Optional[float] = Field(default=0.0, ge=0.0, le=365.0)
    seed: Optional[int] = 42

class SimulateResponse(BaseModel):
    bridge_id: str
    timestamp: str
    disclaimer: str = "Model-based scenario evaluation, not certified engineering prediction."
    current_values: Dict[str, Any]
    simulated_values: Dict[str, Any]
    delta_values: Dict[str, Any]
    affected_evidence: List[str]
    explanation: str

# Data Generation Request & Response
class DataGenRequest(BaseModel):
    random_seed: Optional[int] = 42
    days: Optional[int] = Field(default=30, ge=1, le=90)
    bridge_count: Optional[int] = Field(default=20, ge=1, le=50)

class DataGenResponse(BaseModel):
    status: str
    total_bridges: int
    total_rows: int
    message: str

# Replay Request & Response
class ReplayRequest(BaseModel):
    bridge_id: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    speed_multiplier: Optional[float] = Field(default=1.0, ge=0.1, le=10.0)

class ReplayResponse(BaseModel):
    bridge_id: str
    playback_status: str
    total_frames: int
    current_frame_timestamp: str

# Analysis Request & Response
class AnalyzeRequest(BaseModel):
    bridge_id: str
    train_start: Optional[str] = "2026-08-01 00:00:00"
    train_end: Optional[str] = "2026-08-14 23:59:00"

class AnalyzeResponse(BaseModel):
    bridge_id: str
    status: str
    anomalies_detected: int
    highest_risk_score: float
    highest_priority: str
    processed_rows: int

# Report Request & Response
class ReportRequest(BaseModel):
    bridge_id: str
    title: Optional[str] = "Structural Health Decision Support Report"

class ReportResponse(BaseModel):
    report_id: str
    bridge_id: str
    title: str
    generated_at: str
    inspection_priority: str
    summary_text: str
    report_html: str

# Assistant Query Request & Response
class AssistantQueryRequest(BaseModel):
    query: str
    bridge_id: Optional[str] = None

class AssistantQueryResponse(BaseModel):
    query: str
    answer: str
    data_sources_used: List[str]
    suggested_actions: List[str]
