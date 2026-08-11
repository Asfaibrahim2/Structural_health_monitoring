from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class BridgeModel(Base):
    __tablename__ = "bridges"

    bridge_id = Column(String, primary_key=True, index=True)
    bridge_name = Column(String, nullable=False)
    structure_type = Column(String, nullable=False)
    construction_year = Column(Integer, nullable=False)
    age_years = Column(Integer, nullable=False)
    span_length_m = Column(Float, nullable=False)
    vulnerability_factor = Column(Float, nullable=False)
    sensor_count = Column(Integer, nullable=False)
    scenario_type = Column(String, nullable=False)

    # Relationships
    readings = relationship("SensorReadingModel", back_populates="bridge", cascade="all, delete-orphan")
    baselines = relationship("BaselineModel", back_populates="bridge", cascade="all, delete-orphan")
    anomaly_events = relationship("AnomalyEventModel", back_populates="bridge", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessmentModel", back_populates="bridge", cascade="all, delete-orphan")
    sensor_healths = relationship("SensorHealthModel", back_populates="bridge", cascade="all, delete-orphan")
    simulation_runs = relationship("SimulationRunModel", back_populates="bridge", cascade="all, delete-orphan")
    reports = relationship("ReportModel", back_populates="bridge", cascade="all, delete-orphan")


class SensorReadingModel(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bridge_id = Column(String, ForeignKey("bridges.bridge_id"), index=True, nullable=False)
    sensor_id = Column(String, index=True, nullable=False)
    timestamp = Column(String, index=True, nullable=False)
    strain_microstrain = Column(Float, nullable=True)
    vibration_g = Column(Float, nullable=True)
    displacement_mm = Column(Float, nullable=True)
    temperature_c = Column(Float, nullable=True)
    humidity_percent = Column(Float, nullable=True)
    rainfall_mm = Column(Float, nullable=True)
    traffic_load_percent = Column(Float, nullable=True)
    wind_speed_mps = Column(Float, nullable=True)
    scenario = Column(String, nullable=False)
    ground_truth_anomaly = Column(Integer, nullable=False)

    bridge = relationship("BridgeModel", back_populates="readings")


class BaselineModel(Base):
    __tablename__ = "baselines"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bridge_id = Column(String, ForeignKey("bridges.bridge_id"), index=True, nullable=False)
    version = Column(String, nullable=False)
    train_start = Column(String, nullable=False)
    train_end = Column(String, nullable=False)
    coefficients_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    bridge = relationship("BridgeModel", back_populates="baselines")


class AnomalyEventModel(Base):
    __tablename__ = "anomaly_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bridge_id = Column(String, ForeignKey("bridges.bridge_id"), index=True, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=True)
    anomaly_type = Column(String, nullable=False)
    severity = Column(String, nullable=False) # e.g. WARNING, CRITICAL
    duration_minutes = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, nullable=False) # OPEN, RESOLVED

    bridge = relationship("BridgeModel", back_populates="anomaly_events")


class RiskAssessmentModel(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bridge_id = Column(String, ForeignKey("bridges.bridge_id"), index=True, nullable=False)
    timestamp = Column(String, index=True, nullable=False)
    risk_score = Column(Float, nullable=False)
    uncertainty = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    inspection_priority = Column(String, nullable=False) # P1, P2, P3, P4
    severity_score = Column(Float, nullable=False)
    persistence_score = Column(Float, nullable=False)
    sensor_agreement_score = Column(Float, nullable=False)
    trend_score = Column(Float, nullable=False)
    asset_vulnerability_score = Column(Float, nullable=False)
    context_score = Column(Float, nullable=False)
    data_quality_score = Column(Float, nullable=False)
    risk_explanation = Column(Text, nullable=False)

    bridge = relationship("BridgeModel", back_populates="risk_assessments")


class SensorHealthModel(Base):
    __tablename__ = "sensor_health"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bridge_id = Column(String, ForeignKey("bridges.bridge_id"), index=True, nullable=False)
    sensor_id = Column(String, nullable=False)
    missing_ratio = Column(Float, nullable=False)
    flatline_flag = Column(Integer, nullable=False)
    noise_flag = Column(Integer, nullable=False)
    drift_score = Column(Float, nullable=False)
    health_score = Column(Float, nullable=False)
    last_seen = Column(String, nullable=False)

    bridge = relationship("BridgeModel", back_populates="sensor_healths")


class SimulationRunModel(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bridge_id = Column(String, ForeignKey("bridges.bridge_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    scenario_name = Column(String, nullable=False)
    parameters_json = Column(Text, nullable=False)
    result_risk_score = Column(Float, nullable=False)
    result_priority = Column(String, nullable=False)

    bridge = relationship("BridgeModel", back_populates="simulation_runs")


class ReportModel(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    bridge_id = Column(String, ForeignKey("bridges.bridge_id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    generated_at = Column(String, nullable=False)
    inspection_priority = Column(String, nullable=False)
    summary_text = Column(Text, nullable=False)
    report_html = Column(Text, nullable=False)

    bridge = relationship("BridgeModel", back_populates="reports")
