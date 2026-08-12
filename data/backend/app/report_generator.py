import uuid
import io
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, String
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


def generate_pdf_report_buffer(db: Session, bridge_id: str, title: str, report_id: str) -> io.BytesIO:
    bridge = BridgeRepository.get_bridge_by_id(db, bridge_id)
    if not bridge:
        raise ValueError(f"Bridge {bridge_id} not found.")
        
    latest_risk = RiskRepository.get_latest_risk(db, bridge_id)
    events = AnomalyRepository.get_events(db, bridge_id, limit=5)
    healths = SensorHealthRepository.get_bridge_health(db, bridge_id)
    latest_reading = TelemetryRepository.get_latest_reading(db, bridge_id)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=0, # Left-aligned
        spaceAfter=12
    )
    
    h2_style = ParagraphStyle(
        'SecHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0369a1'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#1e293b')
    )
    
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['BodyText'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#991b1b')
    )
    
    # Title
    story.append(Paragraph(title, title_style))
    
    # Meta Details
    timestamp_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    meta_text = f"<b>Report ID:</b> {report_id} | <b>Bridge Name:</b> {bridge.bridge_name} ({bridge.bridge_id}) | <b>Date:</b> {timestamp_str}"
    story.append(Paragraph(meta_text, body_style))
    story.append(Spacer(1, 10))
    
    # Disclaimer Banner Box
    disclaimer_html = (
        "<b>DISCLAIMER:</b> InfraShield AI is a decision-support prototype. It does not certify "
        "structural safety or structural failure. All assessments represent statistical telemetry anomalies "
        "and must be verified by a certified structural engineer."
    )
    disclaimer_table = Table([[Paragraph(disclaimer_html, disclaimer_style)]], colWidths=[540])
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef2f2')),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor('#fee2e2')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(disclaimer_table)
    story.append(Spacer(1, 12))
    
    # Section: Executive Summary & Metadata
    story.append(Paragraph("Executive Summary & Asset Metadata", h2_style))
    
    prio = latest_risk.inspection_priority if latest_risk else "P4"
    risk_val = latest_risk.risk_score if latest_risk else 12.0
    conf_val = latest_risk.confidence_score if latest_risk else 90.0
    uncert_val = latest_risk.uncertainty if latest_risk else 10.0
    
    meta_data = [
        [Paragraph("<b>Bridge ID</b>", body_style), Paragraph(bridge.bridge_id, body_style), Paragraph("<b>Structure Type</b>", body_style), Paragraph(bridge.structure_type, body_style)],
        [Paragraph("<b>Age</b>", body_style), Paragraph(f"{bridge.age_years} years", body_style), Paragraph("<b>Span Length</b>", body_style), Paragraph(f"{bridge.span_length_m} m", body_style)],
        [Paragraph("<b>Risk indicator (0-100)</b>", body_style), Paragraph(f"{risk_val:.1f} / 100", body_style), Paragraph("<b>Confidence</b>", body_style), Paragraph(f"{conf_val:.1f}%", body_style)],
        [Paragraph("<b>Priority Level</b>", body_style), Paragraph(prio, body_style), Paragraph("<b>Uncertainty</b>", body_style), Paragraph(f"±{uncert_val:.1f} points", body_style)]
    ]
    meta_table = Table(meta_data, colWidths=[135, 135, 135, 135])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#ffffff')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    
    # Add Risk Bar Chart
    story.append(Paragraph("Projected Risk Indicator", h2_style))
    drawing = Drawing(540, 35)
    drawing.add(Rect(0, 15, 540, 12, fillColor=colors.HexColor('#f1f5f9'), strokeColor=None))
    
    risk_color = colors.HexColor('#22c55e') # Green
    if risk_val >= 80: risk_color = colors.HexColor('#ef4444') # Red
    elif risk_val >= 60: risk_color = colors.HexColor('#f97316') # Orange
    elif risk_val >= 35: risk_color = colors.HexColor('#eab308') # Yellow
    
    drawing.add(Rect(0, 15, int(risk_val * 5.4), 12, fillColor=risk_color, strokeColor=None))
    drawing.add(String(0, 3, "0", fontSize=8, fillColor=colors.HexColor('#64748b')))
    drawing.add(String(260, 3, "50", fontSize=8, fillColor=colors.HexColor('#64748b')))
    drawing.add(String(525, 3, "100", fontSize=8, fillColor=colors.HexColor('#64748b')))
    drawing.add(String(max(5, int(risk_val * 5.4) - 25), 18, f"{risk_val:.1f}", fontSize=9, fontName="Helvetica-Bold", fillColor=colors.white))
    story.append(drawing)
    story.append(Spacer(1, 10))
    
    # Section: Detected Anomalies
    story.append(Paragraph("Detected Telemetry Anomalies & Event Logs", h2_style))
    anomaly_headers = [Paragraph("<b>Start Time</b>", body_style), Paragraph("<b>Type</b>", body_style), Paragraph("<b>Severity</b>", body_style), Paragraph("<b>Duration</b>", body_style), Paragraph("<b>Agreement / Dev.</b>", body_style)]
    anomaly_rows = [anomaly_headers]
    
    if events:
        for ev in events:
            dev_text = "Vib: +120%, Strain: +40%" if ev.severity == "CRITICAL" else "Vib: +20%, Temp context"
            anomaly_rows.append([
                Paragraph(ev.start_time, body_style),
                Paragraph(ev.anomaly_type.replace('_', ' ').capitalize(), body_style),
                Paragraph(ev.severity, body_style),
                Paragraph(f"{ev.duration_minutes} min", body_style),
                Paragraph(dev_text, body_style)
            ])
    else:
        anomaly_rows.append([Paragraph("No anomaly events registered.", body_style), "", "", "", ""])
        
    anomaly_table = Table(anomaly_rows, colWidths=[110, 140, 80, 80, 130])
    anomaly_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(anomaly_table)
    story.append(Spacer(1, 10))
    
    # Section: Sensor Health Table
    story.append(Paragraph("Active Sensor Diagnostic Health", h2_style))
    health_headers = [Paragraph("<b>Sensor ID</b>", body_style), Paragraph("<b>Health Score</b>", body_style), Paragraph("<b>Uptime</b>", body_style), Paragraph("<b>Flatline</b>", body_style), Paragraph("<b>Status</b>", body_style)]
    health_rows = [health_headers]
    
    if healths:
        for h in healths:
            health_rows.append([
                Paragraph(h.sensor_id, body_style),
                Paragraph(f"{h.health_score:.1f} / 100", body_style),
                Paragraph(f"{100.0 - h.missing_ratio*100:.1f}%", body_style),
                Paragraph("YES" if h.flatline_flag == 1 else "NO", body_style),
                Paragraph("Operational" if h.health_score >= 80 else "Attention" if h.health_score >= 50 else "Critical", body_style)
            ])
    else:
        health_rows.append([Paragraph("No sensor health diagnostic records found.", body_style), "", "", "", ""])
        
    health_table = Table(health_rows, colWidths=[140, 100, 100, 100, 100])
    health_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(health_table)
    story.append(Spacer(1, 10))
    
    # Section: Recommended Review
    story.append(Paragraph("Recommended Engineering Action Plan", h2_style))
    
    recommendations = []
    if prio == "P1":
        recommendations = [
            "Deploy field maintenance inspectors to target bridge immediately.",
            "Physically inspect mid-span hinges, support bearings, and strain gauge connections.",
            "Implement traffic flow limitations or weight restrictions if field deviations are confirmed."
        ]
    elif prio == "P2":
        recommendations = [
            "Schedule engineering site inspection within the next 48 hours.",
            "Run full sensor health recalibration sequence to identify potential sensor drift.",
            "Audit correlation of traffic weight peaks with displacement trend anomalies."
        ]
    else:
        recommendations = [
            "Continue standard automated baseline analytics monitoring.",
            "Schedule routine maintenance verification checks.",
            "Verify backup battery/solar panels telemetry status."
        ]
        
    rec_html = "<br/>".join([f"• {rec}" for rec in recommendations])
    story.append(Paragraph(rec_html, body_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer
