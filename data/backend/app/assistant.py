# assistant.py
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.repository import BridgeRepository, RiskRepository, AnomalyRepository, TelemetryRepository, SensorHealthRepository
from backend.app.models import SensorReadingModel, RiskAssessmentModel, AnomalyEventModel, SensorHealthModel, SimulationRunModel

class AIEngineerAssistant:
    """
    AI Engineer Assistant for InfraShield AI.
    Queries the project database and synthesizes domain-expert structural health responses.
    Strictly follows a retrieval-first design.
    """
    def __init__(self, db: Session):
        self.db = db

    def query(self, user_query: str, bridge_id: Optional[str] = None) -> Dict[str, Any]:
        user_query_lower = user_query.lower()
        data_sources = []
        suggested_actions = []
        
        # 1. Map query to allowed questions
        matched_question = None
        if any(k in user_query_lower for k in ["prioritized", "priority", "why prioritised", "why is this bridge flagged", "what should i do next", "breakdown"]):
            matched_question = "Why was this bridge prioritized?"
        elif any(k in user_query_lower for k in ["sensors", "contributed", "contributing", "which sensors"]):
            matched_question = "Which sensors contributed?"
        elif any(k in user_query_lower for k in ["what happened", "anomaly", "anomalies", "active anomalies"]):
            matched_question = "What happened during the anomaly?"
        elif any(k in user_query_lower for k in ["inspected first", "inspect first", "which bridge should be"]):
            matched_question = "Which bridge should be inspected first?"
        elif any(k in user_query_lower for k in ["sensor-health", "sensor health", "sensor status"]):
            matched_question = "What is the sensor-health status?"
        elif any(k in user_query_lower for k in ["simulated", "simulation", "what would happen", "scenario"]):
            matched_question = "What would happen under a simulated scenario?"

        if not matched_question:
            return {
                "query": user_query,
                "answer": "Query not supported. The Engineer Assistant currently supports the following inquiries:\n"
                          "1. Why was this bridge prioritized?\n"
                          "2. Which sensors contributed?\n"
                          "3. What happened during the anomaly?\n"
                          "4. Which bridge should be inspected first?\n"
                          "5. What is the sensor-health status?\n"
                          "6. What would happen under a simulated scenario?",
                "data_sources_used": [],
                "suggested_actions": ["Ask an allowed structural query"]
            }

        # 2. Retrieve Database Records
        target_bridge_id = bridge_id or "TS-STR-001"
        bridge = BridgeRepository.get_bridge_by_id(self.db, target_bridge_id)
        latest_risk = RiskRepository.get_latest_risk(self.db, target_bridge_id)
        events = AnomalyRepository.get_events(self.db, target_bridge_id, limit=1)
        healths = SensorHealthRepository.get_bridge_health(self.db, target_bridge_id)

        data_sources.append("SQLite: bridges")
        if latest_risk: data_sources.append("SQLite: risk_assessments")
        if events: data_sources.append("SQLite: anomaly_events")
        if healths: data_sources.append("SQLite: sensor_healths")

        # Compile contributing sensors from risk parameters
        contributing_sensors = []
        if latest_risk:
            if latest_risk.severity_score > 40:
                contributing_sensors.append("MPU6050 Vibration sensor")
            if latest_risk.persistence_score > 40:
                contributing_sensors.append("Strain gauge transducer")
            if latest_risk.trend_score > 40:
                contributing_sensors.append("Displacement laser sensor")
        if not contributing_sensors:
            contributing_sensors.append("None detected")

        # Build structured evidence object
        evidence = {
            "bridge_id": bridge.bridge_id if bridge else None,
            "bridge_name": bridge.bridge_name if bridge else None,
            "risk_score": latest_risk.risk_score if latest_risk else None,
            "confidence_score": latest_risk.confidence_score if latest_risk else None,
            "uncertainty": latest_risk.uncertainty if latest_risk else None,
            "priority": latest_risk.inspection_priority if latest_risk else None,
            "anomaly_type": events[0].anomaly_type if events else None,
            "start_time": events[0].start_time if events else None,
            "end_time": events[0].end_time if events else None,
            "contributing_sensors": contributing_sensors,
            "time_window": f"{events[0].start_time} - {events[0].end_time or 'Ongoing'}" if events else "All-Time Baseline"
        }

        # Format mandatory metadata prefix
        metadata_prefix = (
            f"=== RETRIEVED EVIDENCE SNAPSHOT ===\n"
            f"• Bridge ID: {evidence['bridge_id'] or 'N/A'}\n"
            f"• Time Window: {evidence['time_window']}\n"
            f"• Risk Score: {f'{evidence['risk_score']:.1f}/100' if evidence['risk_score'] is not None else 'N/A'}\n"
            f"• Confidence Score: {f'{evidence['confidence_score']:.1f}%' if evidence['confidence_score'] is not None else 'N/A'}\n"
            f"• Uncertainty Score: {f'±{evidence['uncertainty']:.1f}' if evidence['uncertainty'] is not None else 'N/A'}\n"
            f"• Contributing Sensors: {', '.join(evidence['contributing_sensors'])}\n"
            f"===================================\n\n"
        )

        # 3. Generate Answer strictly from evidence
        answer_body = ""

        if matched_question == "Why was this bridge prioritized?":
            if not bridge or not latest_risk:
                answer_body = "Evidence is insufficient. No risk assessment records are available in the database for this bridge."
            else:
                answer_body = (
                    f"Prioritization Answer: Bridge '{bridge.bridge_name}' ({bridge.bridge_id}) is prioritized with "
                    f"an inspection rating of {latest_risk.inspection_priority} and a risk indicator score of {latest_risk.risk_score:.1f}/100. "
                    f"This classification is derived from telemetry deviations flagged on: {', '.join(contributing_sensors)}. "
                    f"Note: This is a prioritization recommendation and does not certify structural safety or confirm structural damage."
                )
                suggested_actions.extend(["Deploy engineer to verify sensor connections", "Schedule bridge inspection"])

        elif matched_question == "Which sensors contributed?":
            if not latest_risk or not contributing_sensors or contributing_sensors == ["None detected"]:
                answer_body = "Evidence is insufficient. No sensor deviation markers are present in the latest risk evaluation."
            else:
                answer_body = (
                    f"Sensors Contribution Answer: The latest risk assessment suggests that the following sensors contributed "
                    f"to the risk score variance: {', '.join(contributing_sensors)}. "
                    f"Note: These deviations are registered based on statistical boundaries and do not confirm physical damage."
                )
                suggested_actions.append("Calibrate contributing sensor baselines")

        elif matched_question == "What happened during the anomaly?":
            if not events:
                answer_body = "Evidence is insufficient. No anomaly events were logged in the database for this bridge."
            else:
                event = events[0]
                answer_body = (
                    f"Anomaly Event Answer: A '{event.anomaly_type.replace('_', ' ')}' event was registered during the window "
                    f"{evidence['time_window']} with severity level '{event.severity}'. "
                    f"Sensors logged transient deviations from historical baseline parameters. "
                    f"Note: These signals indicate statistical variance and do not confirm structural failure or certify safety status."
                )
                suggested_actions.append("Replay the anomaly event stages to audit deviations")

        elif matched_question == "Which bridge should be inspected first?":
            all_bridges = BridgeRepository.get_all_bridges(self.db)
            highest_bridge = None
            highest_risk_score = -1.0
            highest_assessment = None
            
            for b in all_bridges:
                r = RiskRepository.get_latest_risk(self.db, b.bridge_id)
                if r and r.risk_score > highest_risk_score:
                    highest_risk_score = r.risk_score
                    highest_bridge = b
                    highest_assessment = r
                    
            if not highest_bridge or not highest_assessment:
                answer_body = "Evidence is insufficient. No active risk assessments were found in the database to compare fleet priority."
            else:
                # Update prefix metadata for this specific global query
                metadata_prefix = (
                    f"=== RETRIEVED FLEET EVIDENCE ===\n"
                    f"• Highest Risk Bridge ID: {highest_bridge.bridge_id} ({highest_bridge.bridge_name})\n"
                    f"• Recommended Priority: {highest_assessment.inspection_priority}\n"
                    f"• Risk Score: {highest_assessment.risk_score:.1f}/100\n"
                    f"• Confidence Score: {highest_assessment.confidence_score:.1f}%\n"
                    f"• Uncertainty Score: {highest_assessment.uncertainty:.1f}\n"
                    f"• Contributing Sensors: MPU6050 Vibration, Strain Gauges\n"
                    f"=================================\n\n"
                )
                answer_body = (
                    f"Inspection Recommendation Answer: Bridge '{highest_bridge.bridge_name}' ({highest_bridge.bridge_id}) "
                    f"recommends inspection first with a top risk score of {highest_assessment.risk_score:.1f}/100 and priority {highest_assessment.inspection_priority}. "
                    f"This prioritization is based on comparing the latest risk calculations across all monitored fleet bridges. "
                    f"Note: This priority rating is a decision-support guide and does not certify safety status or confirm damage."
                )
                suggested_actions.append(f"Dispatch maintenance crew to {highest_bridge.bridge_name}")

        elif matched_question == "What is the sensor-health status?":
            if not healths:
                answer_body = "Evidence is insufficient. No sensor health data records are registered in the database for this bridge."
            else:
                h_details = ", ".join([f"{h.sensor_id}: {h.status} (Health: {h.health_score:.0f}%, Errors: {h.flatline_count})" for h in healths])
                answer_body = (
                    f"Sensor Health Answer: Retained diagnostics report the following sensor states: {h_details}. "
                    f"Note: These numbers detail sensor communication uptime and flatline indicators; they do not certify structural safety."
                )
                suggested_actions.append("Check sensor battery levels and connections")

        elif matched_question == "What would happen under a simulated scenario?":
            latest_sim = self.db.query(SimulationRunModel).filter(
                SimulationRunModel.bridge_id == target_bridge_id
            ).order_by(desc(SimulationRunModel.timestamp)).first()
            
            if not latest_sim:
                answer_body = "Evidence is insufficient. No recent simulation run record was found in the database. Please run a simulated what-if model first."
            else:
                answer_body = (
                    f"Simulation Projection Answer: Under simulation '{latest_sim.scenario_name}' "
                    f"(factors: Traffic multiplier {latest_sim.traffic_load_multiplier}x, Rainfall multiplier {latest_sim.rainfall_multiplier}x), "
                    f"the projected risk indicator score is estimated at {latest_sim.risk_score_after:.1f}/100 compared to the baseline score of {latest_sim.risk_score_before:.1f}/100. "
                    f"Note: This is a mathematical simulation model for planning and does not certify structural safety or confirm physical damage."
                )
                suggested_actions.append("Compare simulation results with baseline trends")

        return {
            "query": user_query,
            "answer": metadata_prefix + answer_body,
            "data_sources_used": data_sources,
            "suggested_actions": suggested_actions
        }
