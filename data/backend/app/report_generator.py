import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.repository import BridgeRepository, RiskRepository, AnomalyRepository, TelemetryRepository, SensorHealthRepository, ReportRepository

def generate_engineer_report(db: Session, bridge_id: str, title: str = "Structural Health Decision Support Report") -> Dict[str, Any]:
    """
    Generates a formal structural engineering inspection report HTML for a bridge.
    """
    bridge = BridgeRepository.get_bridge_by_id(db, bridge_id)
    if not bridge:
        raise ValueError(f"Bridge {bridge_id} not found.")
        
    latest_risk = RiskRepository.get_latest_risk(db, bridge_id)
    latest_reading = TelemetryRepository.get_latest_reading(db, bridge_id)
    events = AnomalyRepository.get_events(db, bridge_id, limit=10)
    healths = SensorHealthRepository.get_bridge_health(db, bridge_id)
    
    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    prio = latest_risk.inspection_priority if latest_risk else "P4"
    risk_val = latest_risk.risk_score if latest_risk else 0.0
    uncert_val = latest_risk.uncertainty if latest_risk else 0.0
    conf_val = latest_risk.confidence_score if latest_risk else 100.0
    expl_val = latest_risk.risk_explanation if latest_risk else "No active risk calculation."
    
    summary_text = (
        f"Structural health assessment report for '{bridge.bridge_name}' ({bridge.bridge_id}). "
        f"Assessed Priority: {prio} (Risk Score: {risk_val:.1f}/100, Uncertainty: ±{uncert_val:.1f}%). "
        f"Asset Type: {bridge.structure_type}, Age: {bridge.age_years} years. "
        f"Recommendation: {'Immediate emergency inspection required.' if prio == 'P1' else 'Scheduled routine monitoring.'}"
    )
    
    # Render HTML template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{title} - {bridge.bridge_name}</title>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; background-color: #f8fafc; }}
            .header {{ border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 30px; }}
            .header h1 {{ margin: 0; color: #0f172a; font-size: 24px; }}
            .header .meta {{ color: #64748b; font-size: 14px; margin-top: 5px; }}
            .badge {{ display: inline-block; padding: 6px 12px; font-weight: bold; border-radius: 4px; color: white; }}
            .badge-P1 {{ background-color: #ef4444; }}
            .badge-P2 {{ background-color: #f97316; }}
            .badge-P3 {{ background-color: #eab308; }}
            .badge-P4 {{ background-color: #22c55e; }}
            .section {{ background: white; border-radius: 8px; padding: 20px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
            .section h2 {{ margin-top: 0; font-size: 18px; color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
            th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #cbd5e1; font-size: 14px; }}
            th {{ background-color: #f1f5f9; color: #334155; }}
            .rule-box {{ background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin-top: 15px; font-size: 13px; color: #1e40af; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>InfraShield AI - Structural Health Inspection Report</h1>
            <div class="meta">Report ID: {report_id} | Bridge: {bridge.bridge_name} ({bridge.bridge_id}) | Date: {timestamp_str}</div>
        </div>

        <div class="section">
            <h2>Executive Summary</h2>
            <p><strong>Inspection Priority:</strong> <span class="badge badge-{prio}">{prio} ({'Immediate Inspection' if prio=='P1' else 'Scheduled' if prio=='P2' else 'Routine' if prio=='P3' else 'Normal'})</span></p>
            <p><strong>Calculated Risk Score:</strong> {risk_val:.1f} / 100 (Uncertainty: ±{uncert_val:.1f}%, Confidence: {conf_val:.1f}%)</p>
            <p><strong>Asset Metadata:</strong> Type: {bridge.structure_type} | Built: {bridge.construction_year} (Age: {bridge.age_years} yrs) | Span: {bridge.span_length_m}m | Vulnerability: {bridge.vulnerability_factor*100:.1f}%</p>
            <div class="rule-box">
                <strong>Mandatory Safety Guideline:</strong> InfraShield AI detects unusual behavior and recommends inspection priorities. It never declares an asset definitively safe or unsafe without field engineering confirmation.
            </div>
        </div>

        <div class="section">
            <h2>Risk Formula Component Breakdown</h2>
            <p>{expl_val}</p>
        </div>

        <div class="section">
            <h2>Active Anomaly Events ({len(events)})</h2>
            <table>
                <thead>
                    <tr>
                        <th>Start Time</th>
                        <th>Type</th>
                        <th>Severity</th>
                        <th>Duration (min)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    if events:
        for ev in events:
            html_content += f"""
                    <tr>
                        <td>{ev.start_time}</td>
                        <td>{ev.anomaly_type}</td>
                        <td>{ev.severity}</td>
                        <td>{ev.duration_minutes}</td>
                        <td>{ev.status}</td>
                    </tr>
            """
    else:
        html_content += "<tr><td colspan='5'>No anomaly events logged.</td></tr>"
        
    html_content += """
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Sensor Health Status</h2>
            <table>
                <thead>
                    <tr>
                        <th>Sensor ID</th>
                        <th>Missing Ratio</th>
                        <th>Flatline</th>
                        <th>Drift Score</th>
                        <th>Health Score</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    if healths:
        for h in healths:
            html_content += f"""
                    <tr>
                        <td>{h.sensor_id}</td>
                        <td>{h.missing_ratio*100:.1f}%</td>
                        <td>{'YES' if h.flatline_flag==1 else 'NO'}</td>
                        <td>{h.drift_score:.2f}</td>
                        <td>{h.health_score:.1f} / 100</td>
                    </tr>
            """
    else:
        html_content += "<tr><td colspan='5'>No sensor health records logged.</td></tr>"

    html_content += """
                </tbody>
            </table>
        </div>
    </body>
    </html>
    """
    
    report_data = {
        "id": report_id,
        "bridge_id": bridge_id,
        "title": title,
        "generated_at": timestamp_str,
        "inspection_priority": prio,
        "summary_text": summary_text,
        "report_html": html_content
    }
    
    ReportRepository.create_report(db, report_data)
    return report_data
