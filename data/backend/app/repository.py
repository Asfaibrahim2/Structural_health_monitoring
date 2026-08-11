from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional, Dict, Any
from backend.app.models import (
    BridgeModel, SensorReadingModel, BaselineModel, 
    AnomalyEventModel, RiskAssessmentModel, SensorHealthModel, 
    SimulationRunModel, ReportModel
)

class BridgeRepository:
    @staticmethod
    def get_all_bridges(db: Session) -> List[BridgeModel]:
        return db.query(BridgeModel).all()

    @staticmethod
    def get_bridge_by_id(db: Session, bridge_id: str) -> Optional[BridgeModel]:
        return db.query(BridgeModel).filter(BridgeModel.bridge_id == bridge_id).first()

    @staticmethod
    def create_or_update_bridge(db: Session, bridge_data: Dict[str, Any]) -> BridgeModel:
        existing = db.query(BridgeModel).filter(BridgeModel.bridge_id == bridge_data["bridge_id"]).first()
        if existing:
            for k, v in bridge_data.items():
                setattr(existing, k, v)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            bridge = BridgeModel(**bridge_data)
            db.add(bridge)
            db.commit()
            db.refresh(bridge)
            return bridge


class TelemetryRepository:
    @staticmethod
    def get_latest_reading(db: Session, bridge_id: str) -> Optional[SensorReadingModel]:
        return db.query(SensorReadingModel)\
                 .filter(SensorReadingModel.bridge_id == bridge_id)\
                 .order_by(desc(SensorReadingModel.timestamp))\
                 .first()

    @staticmethod
    def get_timeseries(
        db: Session, 
        bridge_id: str, 
        start_time: Optional[str] = None, 
        end_time: Optional[str] = None, 
        limit: int = 100
    ) -> List[SensorReadingModel]:
        query = db.query(SensorReadingModel).filter(SensorReadingModel.bridge_id == bridge_id)
        if start_time:
            query = query.filter(SensorReadingModel.timestamp >= start_time)
        if end_time:
            query = query.filter(SensorReadingModel.timestamp <= end_time)
        return query.order_by(SensorReadingModel.timestamp).limit(limit).all()

    @staticmethod
    def bulk_insert_readings(db: Session, readings: List[Dict[str, Any]]):
        db.bulk_insert_mappings(SensorReadingModel, readings)
        db.commit()


class RiskRepository:
    @staticmethod
    def get_latest_risk(db: Session, bridge_id: str) -> Optional[RiskAssessmentModel]:
        return db.query(RiskAssessmentModel)\
                 .filter(RiskAssessmentModel.bridge_id == bridge_id)\
                 .order_by(desc(RiskAssessmentModel.timestamp))\
                 .first()

    @staticmethod
    def get_risk_history(db: Session, bridge_id: str, limit: int = 100) -> List[RiskAssessmentModel]:
        return db.query(RiskAssessmentModel)\
                 .filter(RiskAssessmentModel.bridge_id == bridge_id)\
                 .order_by(desc(RiskAssessmentModel.timestamp))\
                 .limit(limit)\
                 .all()

    @staticmethod
    def create_risk_assessment(db: Session, risk_data: Dict[str, Any]) -> RiskAssessmentModel:
        risk = RiskAssessmentModel(**risk_data)
        db.add(risk)
        db.commit()
        db.refresh(risk)
        return risk


class AnomalyRepository:
    @staticmethod
    def get_events(db: Session, bridge_id: str, limit: int = 50) -> List[AnomalyEventModel]:
        return db.query(AnomalyEventModel)\
                 .filter(AnomalyEventModel.bridge_id == bridge_id)\
                 .order_by(desc(AnomalyEventModel.start_time))\
                 .limit(limit)\
                 .all()

    @staticmethod
    def create_event(db: Session, event_data: Dict[str, Any]) -> AnomalyEventModel:
        event = AnomalyEventModel(**event_data)
        db.add(event)
        db.commit()
        db.refresh(event)
        return event


class SensorHealthRepository:
    @staticmethod
    def get_all_health(db: Session) -> List[SensorHealthModel]:
        return db.query(SensorHealthModel).all()

    @staticmethod
    def get_bridge_health(db: Session, bridge_id: str) -> List[SensorHealthModel]:
        return db.query(SensorHealthModel).filter(SensorHealthModel.bridge_id == bridge_id).all()

    @staticmethod
    def create_or_update_health(db: Session, health_data: Dict[str, Any]) -> SensorHealthModel:
        existing = db.query(SensorHealthModel)\
                     .filter(SensorHealthModel.bridge_id == health_data["bridge_id"])\
                     .filter(SensorHealthModel.sensor_id == health_data["sensor_id"])\
                     .first()
        if existing:
            for k, v in health_data.items():
                setattr(existing, k, v)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            health = SensorHealthModel(**health_data)
            db.add(health)
            db.commit()
            db.refresh(health)
            return health


class ReportRepository:
    @staticmethod
    def create_report(db: Session, report_data: Dict[str, Any]) -> ReportModel:
        report = ReportModel(**report_data)
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def get_report_by_id(db: Session, report_id: str) -> Optional[ReportModel]:
        return db.query(ReportModel).filter(ReportModel.id == report_id).first()


class SimulationRepository:
    @staticmethod
    def create_simulation_run(db: Session, sim_data: Dict[str, Any]) -> SimulationRunModel:
        sim = SimulationRunModel(**sim_data)
        db.add(sim)
        db.commit()
        db.refresh(sim)
        return sim
