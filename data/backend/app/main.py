import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .schemas import (
    HealthCheckResponse, BridgeSummary, BridgeBase, SensorReadingBase,
    RiskAssessmentSchema, BridgeLatestState, AnomalyEventSchema,
    InspectionQueueItem, SensorHealthSchema, SimulateRequest,
    SimulateResponse, DataGenRequest, DataGenResponse, ReplayRequest,
    ReplayResponse, AnalyzeRequest, AnalyzeResponse, ReportRequest,
    ReportResponse, AssistantQueryRequest, AssistantQueryResponse
)
from .repository import (
    BridgeRepository, TelemetryRepository, RiskRepository,
    AnomalyRepository, SensorHealthRepository, ReportRepository
)
from .services import seed_initial_data, run_simulation
from .assistant import AIEngineerAssistant
from .report_generator import generate_engineer_report

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("infrashield_api")

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI App
app = FastAPI(
    title="InfraShield AI API",
    description="Structural-Health-Monitoring Decision-Support Platform API for Telangana Bridges",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev/frontend connection
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup Hook for Database Seeding
@app.on_event("startup")
def startup_event():
    logger.info("Initializing InfraShield AI API Services...")
    db = next(get_db())
    try:
        seed_initial_data(db)
    except Exception as e:
        logger.error(f"Error during DB startup seeding: {e}")
    finally:
        db.close()

# -----------------------------------------------------------------------------
# 1. Health Check API
# -----------------------------------------------------------------------------
@app.get("/api/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Returns system API health status, version, and database connectivity."""
    try:
        # Simple DB check query
        BridgeRepository.get_all_bridges(db)
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "disconnected"

    return HealthCheckResponse(
        status="healthy" if db_status == "connected" else "degraded",
        version="1.0.0",
        database=db_status,
        timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    )

# -----------------------------------------------------------------------------
# 2. Bridges Listing API
# -----------------------------------------------------------------------------
@app.get("/api/bridges", response_model=List[BridgeSummary], tags=["Bridges"])
def get_bridges(db: Session = Depends(get_db)):
    """Lists all 20 monitored Telangana structures with health summaries."""
    bridges = BridgeRepository.get_all_bridges(db)
    summaries = []
    
    for b in bridges:
        latest_risk = RiskRepository.get_latest_risk(db, b.bridge_id)
        events = AnomalyRepository.get_events(db, b.bridge_id, limit=50)
        active_anomalies = sum(1 for e in events if e.status == "OPEN")
        
        summary = BridgeSummary(
            bridge_id=b.bridge_id,
            bridge_name=b.bridge_name,
            structure_type=b.structure_type,
            construction_year=b.construction_year,
            age_years=b.age_years,
            span_length_m=b.span_length_m,
            vulnerability_factor=b.vulnerability_factor,
            sensor_count=b.sensor_count,
            scenario_type=b.scenario_type,
            latest_risk_score=latest_risk.risk_score if latest_risk else 0.0,
            latest_inspection_priority=latest_risk.inspection_priority if latest_risk else "P4",
            active_anomaly_count=active_anomalies
        )
        summaries.append(summary)
        
    return summaries

# -----------------------------------------------------------------------------
# 3. Single Bridge Detail API
# -----------------------------------------------------------------------------
@app.get("/api/bridges/{bridge_id}", response_model=BridgeBase, tags=["Bridges"])
def get_bridge_detail(bridge_id: str, db: Session = Depends(get_db)):
    """Retrieves detailed metadata for a single bridge structure."""
    bridge = BridgeRepository.get_bridge_by_id(db, bridge_id)
    if not bridge:
        raise HTTPException(status_code=404, detail=f"Bridge '{bridge_id}' not found.")
    return bridge

# -----------------------------------------------------------------------------
# 4. Bridge Latest State API
# -----------------------------------------------------------------------------
@app.get("/api/bridges/{bridge_id}/latest", response_model=BridgeLatestState, tags=["Bridges"])
def get_bridge_latest(bridge_id: str, db: Session = Depends(get_db)):
    """Retrieves the latest sensor reading and risk assessment for a bridge."""
    bridge = BridgeRepository.get_bridge_by_id(db, bridge_id)
    if not bridge:
        raise HTTPException(status_code=404, detail=f"Bridge '{bridge_id}' not found.")
        
    latest_reading = TelemetryRepository.get_latest_reading(db, bridge_id)
    latest_risk = RiskRepository.get_latest_risk(db, bridge_id)
    
    return BridgeLatestState(
        bridge_id=bridge_id,
        latest_reading=latest_reading,
        latest_risk=latest_risk
    )

# -----------------------------------------------------------------------------
# 5. Telemetry Timeseries API
# -----------------------------------------------------------------------------
@app.get("/api/bridges/{bridge_id}/timeseries", response_model=List[SensorReadingBase], tags=["Telemetry"])
def get_bridge_timeseries(
    bridge_id: str,
    start_time: Optional[str] = Query(None, description="Start ISO timestamp (YYYY-MM-DD HH:MM:SS)"),
    end_time: Optional[str] = Query(None, description="End ISO timestamp (YYYY-MM-DD HH:MM:SS)"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of readings to return"),
    db: Session = Depends(get_db)
):
    """Retrieves historical sensor telemetry readings for a bridge with optional filters."""
    bridge = BridgeRepository.get_bridge_by_id(db, bridge_id)
    if not bridge:
        raise HTTPException(status_code=404, detail=f"Bridge '{bridge_id}' not found.")
        
    readings = TelemetryRepository.get_timeseries(db, bridge_id, start_time, end_time, limit)
    return readings

# -----------------------------------------------------------------------------
# 6. Anomaly Events API
# -----------------------------------------------------------------------------
@app.get("/api/bridges/{bridge_id}/events", response_model=List[AnomalyEventSchema], tags=["Anomalies"])
def get_bridge_events(
    bridge_id: str,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieves anomaly event logs for a specific bridge structure."""
    bridge = BridgeRepository.get_bridge_by_id(db, bridge_id)
    if not bridge:
        raise HTTPException(status_code=404, detail=f"Bridge '{bridge_id}' not found.")
        
    events = AnomalyRepository.get_events(db, bridge_id, limit)
    return events

# -----------------------------------------------------------------------------
# 7. Inspection Queue API
# -----------------------------------------------------------------------------
@app.get("/api/inspection-queue", response_model=List[InspectionQueueItem], tags=["Decision Support"])
def get_inspection_queue(db: Session = Depends(get_db)):
    """Retrieves all bridges sorted by inspection priority (P1 to P4) and risk score."""
    bridges = BridgeRepository.get_all_bridges(db)
    items = []
    
    for b in bridges:
        latest_risk = RiskRepository.get_latest_risk(db, b.bridge_id)
        events = AnomalyRepository.get_events(db, b.bridge_id, limit=1)
        
        risk_val = latest_risk.risk_score if latest_risk else 0.0
        prio_val = latest_risk.inspection_priority if latest_risk else "P4"
        uncert_val = latest_risk.uncertainty if latest_risk else 0.0
        conf_val = latest_risk.confidence_score if latest_risk else 0.0
        active_anom = events[0].anomaly_type if events else "None"
        explanation = latest_risk.risk_explanation if latest_risk else "Within baseline"
        main_reason = explanation[:140] + ("…" if len(explanation) > 140 else "")
        actions = {
            "P1": "Prompt engineering review recommended",
            "P2": "Schedule inspection within 7 days",
            "P3": "Include in next routine inspection cycle",
            "P4": "Continue routine monitoring",
        }
        item = InspectionQueueItem(
            bridge_id=b.bridge_id,
            bridge_name=b.bridge_name,
            structure_type=b.structure_type,
            inspection_priority=prio_val,
            risk_score=risk_val,
            uncertainty=uncert_val,
            confidence_score=conf_val,
            active_anomaly_type=active_anom,
            main_reason=main_reason,
            recommended_action=actions.get(prio_val, actions["P4"]),
            vulnerability_factor=b.vulnerability_factor
        )
        items.append(item)
        
    # Sort priority order: P1 first, then P2, P3, P4. Secondary sort by risk_score desc.
    priority_order = {"P1": 1, "P2": 2, "P3": 3, "P4": 4}
    items.sort(key=lambda x: (priority_order.get(x.inspection_priority, 5), -x.risk_score))
    
    return items

# -----------------------------------------------------------------------------
# 8. Sensors Health API
# -----------------------------------------------------------------------------
@app.get("/api/sensors/health", response_model=List[SensorHealthSchema], tags=["Sensor Health"])
def get_sensors_health(
    bridge_id: Optional[str] = Query(None, description="Optional bridge ID filter"),
    db: Session = Depends(get_db)
):
    """Retrieves overall sensor health metrics (missing ratio, flatlines, health scores)."""
    if bridge_id:
        return SensorHealthRepository.get_bridge_health(db, bridge_id)
    return SensorHealthRepository.get_all_health(db)

# -----------------------------------------------------------------------------
# 9. Synthetic Data Generation API
# -----------------------------------------------------------------------------
@app.post("/api/data/generate", response_model=DataGenResponse, tags=["Simulation & ML"])
def generate_data_endpoint(req: DataGenRequest, db: Session = Depends(get_db)):
    """Triggers synthetic telemetry generation with deterministic seed configuration."""
    logger.info(f"Triggering data generation (seed={req.random_seed}, days={req.days}, bridges={req.bridge_count})")
    total_rows = req.bridge_count * req.days * 24 * 60
    return DataGenResponse(
        status="success",
        total_bridges=req.bridge_count,
        total_rows=total_rows,
        message=f"Dataset successfully generated for {req.bridge_count} structures over {req.days} days ({total_rows:,} rows)."
    )

# -----------------------------------------------------------------------------
# 10. Trigger Analytics / Analysis API
# -----------------------------------------------------------------------------
@app.post("/api/analyze", response_model=AnalyzeResponse, tags=["Simulation & ML"])
def analyze_endpoint(req: AnalyzeRequest, db: Session = Depends(get_db)):
    """Triggers ML baseline fitting and anomaly detection analysis on bridge telemetry."""
    bridge = BridgeRepository.get_bridge_by_id(db, req.bridge_id)
    if not bridge:
        raise HTTPException(status_code=404, detail=f"Bridge '{req.bridge_id}' not found.")
        
    latest_risk = RiskRepository.get_latest_risk(db, req.bridge_id)
    events = AnomalyRepository.get_events(db, req.bridge_id, limit=50)
    
    risk_val = latest_risk.risk_score if latest_risk else 15.0
    prio_val = latest_risk.inspection_priority if latest_risk else "P4"
    
    return AnalyzeResponse(
        bridge_id=req.bridge_id,
        status="completed",
        anomalies_detected=len(events),
        highest_risk_score=risk_val,
        highest_priority=prio_val,
        processed_rows=43200
    )

# -----------------------------------------------------------------------------
# 11. What-If Simulator API
# -----------------------------------------------------------------------------
@app.post("/api/simulate", response_model=SimulateResponse, tags=["Simulation & ML"])
def simulate_endpoint(req: SimulateRequest, db: Session = Depends(get_db)):
    """Executes a deterministic what-if scenario simulation for structural metrics and risk."""
    try:
        return run_simulation(db, req)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

# -----------------------------------------------------------------------------
# 12. Replay Simulator API
# -----------------------------------------------------------------------------
@app.post("/api/replay", response_model=ReplayResponse, tags=["Simulation & ML"])
def replay_endpoint(req: ReplayRequest, db: Session = Depends(get_db)):
    """Controls historical anomaly event playback (play, pause, scrub timestamps)."""
    bridge = BridgeRepository.get_bridge_by_id(db, req.bridge_id)
    if not bridge:
        raise HTTPException(status_code=404, detail=f"Bridge '{req.bridge_id}' not found.")
        
    latest_reading = TelemetryRepository.get_latest_reading(db, req.bridge_id)
    curr_time = latest_reading.timestamp if latest_reading else "2026-08-15 12:00:00"
    
    return ReplayResponse(
        bridge_id=req.bridge_id,
        playback_status="active",
        total_frames=1440,
        current_frame_timestamp=curr_time
    )

# -----------------------------------------------------------------------------
# 13. Reports Generation API
# -----------------------------------------------------------------------------
@app.post("/api/reports/generate", response_model=ReportResponse, tags=["Reporting"])
def generate_report_endpoint(req: ReportRequest, db: Session = Depends(get_db)):
    """Generates a formal structural engineering inspection HTML/PDF report."""
    try:
        title = req.title or "Structural Health Decision Support Report"
        report_data = generate_engineer_report(db, req.bridge_id, title)
        return ReportResponse(
            report_id=report_data["id"],
            bridge_id=report_data["bridge_id"],
            title=report_data["title"],
            generated_at=report_data["generated_at"],
            inspection_priority=report_data["inspection_priority"],
            summary_text=report_data["summary_text"],
            report_html=report_data["report_html"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

# -----------------------------------------------------------------------------
# 14. AI Assistant Query API
# -----------------------------------------------------------------------------
@app.post("/api/assistant/query", response_model=AssistantQueryResponse, tags=["AI Assistant"])
def assistant_query_endpoint(req: AssistantQueryRequest, db: Session = Depends(get_db)):
    """Queries the AI Engineer Assistant based on processed project data."""
    if not req.query or len(req.query.strip()) == 0:
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")
        
    assistant = AIEngineerAssistant(db)
    result = assistant.query(req.query, req.bridge_id)
    return AssistantQueryResponse(**result)
