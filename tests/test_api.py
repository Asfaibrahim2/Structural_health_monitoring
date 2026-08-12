import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database" in data
    assert "version" in data

def test_get_bridges(client):
    response = client.get("/api/bridges")
    assert response.status_code == 200
    bridges = response.json()
    assert isinstance(bridges, list)
    assert len(bridges) > 0
    b = bridges[0]
    assert "bridge_id" in b
    assert "bridge_name" in b
    assert "latest_risk_score" in b

def test_get_single_bridge(client):
    response = client.get("/api/bridges/TS-STR-001")
    assert response.status_code == 200
    b = response.json()
    assert b["bridge_id"] == "TS-STR-001"
    
    res_404 = client.get("/api/bridges/TS-STR-999")
    assert res_404.status_code == 404

def test_get_bridge_latest(client):
    response = client.get("/api/bridges/TS-STR-001/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["bridge_id"] == "TS-STR-001"

def test_get_timeseries(client):
    response = client.get("/api/bridges/TS-STR-001/timeseries?limit=10")
    assert response.status_code == 200
    readings = response.json()
    assert isinstance(readings, list)

def test_get_events(client):
    response = client.get("/api/bridges/TS-STR-001/events")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)

def test_get_inspection_queue(client):
    response = client.get("/api/inspection-queue")
    assert response.status_code == 200
    queue = response.json()
    assert isinstance(queue, list)
    if len(queue) > 0:
        assert queue[0]["inspection_priority"] in ["P1", "P2", "P3", "P4"]

def test_get_sensors_health(client):
    response = client.get("/api/sensors/health")
    assert response.status_code == 200
    healths = response.json()
    assert isinstance(healths, list)

def test_post_data_generate(client):
    payload = {"random_seed": 42, "days": 5, "bridge_count": 5}
    response = client.post("/api/data/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["total_bridges"] == 5

def test_post_analyze(client):
    payload = {"bridge_id": "TS-STR-001"}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"

def test_post_simulate(client):
    payload = {
        "bridge_id": "TS-STR-001",
        "scenario_name": "Test Surge",
        "temperature_c": 35.0,
        "traffic_load_percent": 90.0,
        "rainfall_mm": 5.0,
        "maintenance_delay_days": 10.0,
        "seed": 42
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["bridge_id"] == "TS-STR-001"
    assert "simulated_values" in data
    assert "risk_score" in data["simulated_values"]
    assert "disclaimer" in data
    assert "Model-based" in data["disclaimer"]

def test_post_replay(client):
    payload = {"bridge_id": "TS-STR-001", "speed_multiplier": 2.0}
    response = client.post("/api/replay", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["playback_status"] == "active"

def test_post_reports_generate(client):
    payload = {"bridge_id": "TS-STR-001", "title": "Unit Test Inspection Report"}
    response = client.post("/api/reports/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["bridge_id"] == "TS-STR-001"
    assert "report_html" in data
    assert "<html>" in data["report_html"].lower()

def test_post_assistant_query(client):
    payload = {"query": "What is the structural risk status for Durgam Cheruvu Cable Bridge?", "bridge_id": "TS-STR-001"}
    response = client.post("/api/assistant/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "suggested_actions" in data


def test_download_report_pdf(client):
    # Generate report
    payload = {"bridge_id": "TS-STR-001", "title": "Unit Test PDF Report"}
    gen_response = client.post("/api/reports/generate", json=payload)
    assert gen_response.status_code == 200
    gen_data = gen_response.json()
    report_id = gen_data["report_id"]
    
    # Download PDF
    download_response = client.get(f"/api/reports/{report_id}/download")
    assert download_response.status_code == 200
    assert download_response.headers["content-type"] == "application/pdf"
    
    pdf_bytes = download_response.content
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
