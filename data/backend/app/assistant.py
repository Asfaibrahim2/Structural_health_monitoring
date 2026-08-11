import json
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from backend.app.repository import BridgeRepository, RiskRepository, AnomalyRepository, TelemetryRepository, SensorHealthRepository

class AIEngineerAssistant:
    """
    AI Engineer Assistant for InfraShield AI.
    Queries the project database and synthesizes domain-expert structural health responses.
    Does NOT execute arbitrary code.
    """
    def __init__(self, db: Session):
        self.db = db

    def query(self, user_query: str, bridge_id: Optional[str] = None) -> Dict[str, Any]:
        user_query_lower = user_query.lower()
        data_sources = []
        suggested_actions = []
        
        # 1. Fetch target bridge or all bridges
        if bridge_id:
            bridge = BridgeRepository.get_bridge_by_id(self.db, bridge_id)
            bridges = [bridge] if bridge else []
        else:
            bridges = BridgeRepository.get_all_bridges(self.db)
            
        data_sources.append("SQLite: bridges")
        
        # If querying specific bridge or general risk
        if bridge_id and bridges:
            b = bridges[0]
            latest_risk = RiskRepository.get_latest_risk(self.db, b.bridge_id)
            latest_reading = TelemetryRepository.get_latest_reading(self.db, b.bridge_id)
            events = AnomalyRepository.get_events(self.db, b.bridge_id, limit=5)
            healths = SensorHealthRepository.get_bridge_health(self.db, b.bridge_id)
            
            data_sources.extend(["SQLite: risk_assessments", "SQLite: sensor_readings", "SQLite: anomaly_events", "SQLite: sensor_health"])
            
            risk_val = latest_risk.risk_score if latest_risk else 0.0
            prio_val = latest_risk.inspection_priority if latest_risk else "P4"
            expl_val = latest_risk.risk_explanation if latest_risk else "No active risk calculation."
            
            anom_desc = ", ".join([e.anomaly_type for e in events]) if events else "None"
            
            answer_parts = [
                f"=== Structural Health Audit for '{b.bridge_name}' ({b.bridge_id}) ===",
                f"• Structure Type: {b.structure_type} (Age: {b.age_years} years, Span: {b.span_length_m}m)",
                f"• Vulnerability Rating: {b.vulnerability_factor*100:.1f}%",
                f"• Current Risk Indicator: {risk_val:.1f}/100 (Priority: {prio_val})",
                f"• Explanation: {expl_val}",
                f"• Recent Flagged Anomaly Scenarios: {anom_desc}"
            ]
            
            if latest_reading:
                answer_parts.append(
                    f"• Latest Telemetry Snapshot ({latest_reading.timestamp}): "
                    f"Strain: {latest_reading.strain_microstrain:.1f} µε, "
                    f"Vibration: {latest_reading.vibration_g:.3f}g, "
                    f"Displacement: {latest_reading.displacement_mm:.1f}mm, "
                    f"Temp: {latest_reading.temperature_c:.1f}°C, "
                    f"Traffic Load: {latest_reading.traffic_load_percent:.1f}%"
                )
                
            if prio_val == "P1":
                suggested_actions.extend([
                    "Schedule immediate emergency physical inspection (P1 Priority)",
                    "Inspect mid-span support bearings and main load-bearing joints",
                    "Review recent high traffic/wind correlation logs"
                ])
            elif prio_val == "P2":
                suggested_actions.extend([
                    "Schedule priority maintenance inspection within 48 hours",
                    "Calibrate strain gauge sensors to rule out sensor drift"
                ])
            else:
                suggested_actions.extend([
                    "Continue automated baseline telemetry monitoring",
                    "Perform routine maintenance cycle"
                ])
                
            return {
                "query": user_query,
                "answer": "\n".join(answer_parts),
                "data_sources_used": data_sources,
                "suggested_actions": suggested_actions
            }

        # General System Query across all bridges
        p1_bridges = []
        p2_bridges = []
        
        for b in bridges:
            risk = RiskRepository.get_latest_risk(self.db, b.bridge_id)
            if risk:
                if risk.inspection_priority == "P1":
                    p1_bridges.append((b.bridge_name, risk.risk_score))
                elif risk.inspection_priority == "P2":
                    p2_bridges.append((b.bridge_name, risk.risk_score))
                    
        answer_parts = [
            f"=== InfraShield AI Fleet Health Overview ({len(bridges)} Telangana Structures Monitored) ===",
            f"• Emergency P1 Priority Structures ({len(p1_bridges)}): " + (", ".join([f"{name} ({score:.1f})" for name, score in p1_bridges]) if p1_bridges else "None"),
            f"• Scheduled P2 Priority Structures ({len(p2_bridges)}): " + (", ".join([f"{name} ({score:.1f})" for name, score in p2_bridges]) if p2_bridges else "None"),
            "• Overall System Status: All physical parameters are being evaluated against adaptive regression baselines."
        ]
        
        if p1_bridges:
            suggested_actions.append(f"Deploy field inspection team to top P1 asset: {p1_bridges[0][0]}")
        suggested_actions.append("Generate fleet summary report")
        
        return {
            "query": user_query,
            "answer": "\n".join(answer_parts),
            "data_sources_used": data_sources,
            "suggested_actions": suggested_actions
        }
