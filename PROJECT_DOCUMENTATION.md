# InfraShield AI — Full Project Documentation & Judge Presentation Guide

**Team upload name format:** `PS## – Team Name`  
**Platform:** Structural Health Monitoring for Telangana Bridges  
**Stack:** Python (FastAPI + ML) · SQLite · Next.js · ESP32 Hardware Prototype

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Project Folder Structure](#3-project-folder-structure)
4. [How Data Is Collected](#4-how-data-is-collected)
5. [AI / ML Pipeline (End-to-End)](#5-ai--ml-pipeline-end-to-end)
6. [Backend Architecture](#6-backend-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Hardware Prototype](#8-hardware-prototype)
9. [How to Run the Project](#9-how-to-run-the-project)
10. [Judge Demo — Step-by-Step Flow](#10-judge-demo--step-by-step-flow)
11. [Round 1 Presentation Script (25 Marks)](#11-round-1-presentation-script-25-marks)
12. [Round 2 Presentation Script (25 Marks)](#12-round-2-presentation-script-25-marks)
13. [Likely Jury Questions & Answers](#13-likely-jury-questions--answers)
14. [Innovation & Feasibility Talking Points](#14-innovation--feasibility-talking-points)
15. [Pre-Evaluation Checklist](#15-pre-evaluation-checklist)

---

## 1. Executive Summary

**InfraShield AI** is an AI-powered structural health monitoring and inspection decision-support platform for bridge infrastructure in Telangana.

It does **not** replace licensed structural engineers. It helps authorities **prioritize inspections**, **detect anomalies early**, and **explain risk** using sensor telemetry, hybrid ML, and an operator dashboard.

### What we built

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Data | Synthetic CSV + ESP32 live sensors | Telemetry ingestion |
| ML Engine | Ridge, MAD, Isolation Forest, Risk Engine | Baseline, anomaly detection, risk scoring |
| Backend | FastAPI + SQLite | API, persistence, reports, assistant |
| Frontend | Next.js 16 + React 19 | Command center, digital twin, demos |
| Hardware | ESP32 + MPU6050 + HC-SR04 | Physical edge prototype |

### Fleet scale (demo)

- **20 Telangana bridges** (real names: Durgam Cheruvu, Naya Pul, etc.)
- **Multiple sensor types:** strain, vibration, displacement, temperature, rainfall, traffic
- **Priority bands:** P1 (urgent) → P4 (normal)
- **Scenario profiles:** gradual deterioration, sudden spike, sensor drift, environmental disturbance

---

## 2. Problem Statement

### Real-world problem

Bridge failures are catastrophic but often **preventable** if deterioration is caught early. Manual inspection is:

- Expensive and slow
- Subjective and inconsistent
- Reactive (damage is found late)

### Our solution

Continuous sensor monitoring + AI that:

1. Learns **normal behavior** per bridge (adaptive baseline)
2. Detects **anomalies** using hybrid statistical + ML methods
3. Computes a **risk score (0–100)** with confidence
4. Ranks bridges in an **inspection queue (P1–P4)**
5. Explains **why** a bridge is flagged (not a black box)
6. Supports **what-if simulation** and **PDF reports** for engineers

### Target users

- Infrastructure departments
- Bridge inspection teams
- Operations / monitoring centers

---

## 3. Project Folder Structure

```
infrastructure/
├── data/                          # Backend + database + datasets
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py            # FastAPI routes (all /api/* endpoints)
│   │   │   ├── services.py        # Seeding, ML pipeline orchestration, simulation
│   │   │   ├── schemas.py         # Pydantic request/response models
│   │   │   ├── database.py        # SQLite connection
│   │   │   ├── models.py          # SQLAlchemy ORM tables
│   │   │   ├── repository.py      # DB access layer
│   │   │   ├── assistant.py       # AI Engineer Assistant (DB retrieval)
│   │   │   ├── forecasting.py     # Trend forecast (regression + smoothing)
│   │   │   └── report_generator.py # HTML + PDF reports
│   │   ├── run_server.py          # Start API on port 8000
│   │   └── requirements.txt
│   ├── generate_dataset.py        # CLI: generate full telemetry CSV
│   ├── raw/                       # bridge_telemetry.csv, metadata JSON
│   └── infrashield.db             # SQLite database (auto-created)
│
├── ml_engine/                     # Core AI/ML logic
│   ├── data_generator.py          # Synthetic Telangana bridge telemetry
│   ├── preprocessing.py           # Cleaning, features, MAD scaling
│   ├── baseline.py                # AdaptiveBaselineModel (Ridge regression)
│   ├── anomaly_detector.py        # HybridAnomalyDetector
│   ├── risk_engine.py             # Multi-factor risk scoring
│   ├── train_model.py             # Train global Isolation Forest
│   ├── validation.py              # Dataset validation
│   └── models/                    # Saved .pkl / .joblib models
│
├── frontend/                      # Next.js dashboard
│   ├── app/                       # Pages (routes)
│   │   ├── page.tsx               # Command Center (home)
│   │   ├── welcome/page.tsx       # Showcase landing page
│   │   ├── sensors/page.tsx       # Digital Twin
│   │   ├── anomalies/             # Anomaly Explorer + replay
│   │   ├── inspection-queue/      # Prioritized queue
│   │   ├── what-if/               # Scenario simulator
│   │   ├── hardware/              # ESP32 live feed
│   │   ├── assistant/             # AI Engineer Assistant
│   │   ├── reports/               # PDF report generation
│   │   └── bridges/               # Fleet + per-bridge detail
│   ├── components/                # UI components (charts, cards, simulator)
│   ├── lib/
│   │   ├── api.ts                 # Central API client
│   │   ├── status.ts              # Priority/status helpers
│   │   └── bridgeHelpers.ts       # Plain-language explanations
│   └── package.json
│
├── hardware/
│   └── esp32_bridge/
│       ├── esp32_bridge.ino       # Firmware (sensors, buzzer, demo modes)
│       └── README.md
│
├── models/                        # Per-bridge Isolation Forest models
├── tests/                         # pytest: API, ML, risk, baseline
└── PROJECT_DOCUMENTATION.md       # This file
```

### What each major part does (one line each)

| Path | Role |
|------|------|
| `data/backend/app/main.py` | Exposes REST + WebSocket API to frontend and hardware |
| `data/backend/app/services.py` | Runs full ML pipeline on startup and seeds DB |
| `ml_engine/data_generator.py` | Creates realistic synthetic sensor data for 20 bridges |
| `ml_engine/anomaly_detector.py` | Hybrid anomaly detection (stats + Isolation Forest) |
| `ml_engine/risk_engine.py` | Converts anomalies into 0–100 risk + P1–P4 priority |
| `frontend/lib/api.ts` | All frontend → backend HTTP calls |
| `frontend/app/page.tsx` | Command Center dashboard |
| `hardware/esp32_bridge/esp32_bridge.ino` | Physical sensor node with buzzer/LED alarm |
| `tests/test_api.py` | Verifies API endpoints work |

---

## 4. How Data Is Collected

### Source A — Synthetic Fleet Data (primary demo)

**File:** `ml_engine/data_generator.py`

- Generates telemetry for **20 bridges** over time
- Uses **Telangana weather patterns** (temperature, rainfall)
- Models **traffic load** by time of day
- Injects **fault scenarios** per bridge:
  - `gradual_deterioration`
  - `sudden_spike`
  - `sensor_drift`
  - `environmental_disturbance`
  - `normal`

**Sensors per reading:**
- Strain (με)
- Vibration (g)
- Displacement (mm)
- Temperature (°C)
- Rainfall (mm)
- Traffic load (vehicles/hour)

**Output files:**
- `data/raw/bridge_telemetry.csv`
- `data/raw/bridge_metadata.json`

**Generate manually:**
```powershell
python data/generate_dataset.py
```

### Source B — Backend Startup Seeding (automatic)

**File:** `data/backend/app/services.py` → `seed_initial_data()`

On API start:
1. Inserts 20 bridge records from `BRIDGES_METADATA`
2. Loads CSV if present, else generates in-memory sample
3. Runs full ML pipeline (see Section 5)
4. Writes results to `data/infrashield.db`

### Source C — ESP32 Hardware (live edge)

**File:** `hardware/esp32_bridge/esp32_bridge.ino`

| Sensor | Measures |
|--------|----------|
| MPU6050 | Vibration (g) |
| HC-SR04 | Displacement (mm) |
| OLED | Local status display |
| LEDs + Buzzer | Local alarm |
| Mode button | Cycle LIVE / NORMAL / WARNING / HIGH_RISK demo |

**Data path:**
```
ESP32 sensors → Serial CSV → POST /api/hardware/telemetry → SQLite → WebSocket → /hardware page
```

**Payload example:**
```json
{
  "bridge_id": "TS-STR-001",
  "vibration_g": 0.021,
  "displacement_mm": 3.4,
  "mode": "LIVE_SENSOR_MODE"
}
```

### Source D — What-If Simulation (on demand)

**Endpoint:** `POST /api/simulate`

User adjusts traffic, rain, temperature, maintenance delay → backend recomputes risk using Isolation Forest + calibration.

---

## 5. AI / ML Pipeline (End-to-End)

```
Raw Telemetry
     │
     ▼
┌─────────────────────────┐
│ 1. PREPROCESSING        │  preprocessing.py
│    - Dedup, impute      │  clean_telemetry_data()
│    - Feature engineering│  compute_features()
│    - MAD robust scaling │  (lags, rolling stats, ROC)
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 2. ADAPTIVE BASELINE    │  baseline.py
│    Ridge regression     │  AdaptiveBaselineModel
│    per bridge           │  Predicts expected strain/vibration/displacement
│    from env variables   │  Residuals = actual - expected
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 3. HYBRID ANOMALY       │  anomaly_detector.py
│    DETECTION            │  HybridAnomalyDetector
│    • MAD Z-score        │  Statistical threshold
│    • Isolation Forest   │  Unsupervised ML on residuals
│    • Temporal persist.  │  Reduces false positives
│    • Anomaly typing     │  sudden_spike, drift, etc.
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 4. RISK ENGINE          │  risk_engine.py
│    Weighted fusion:     │  RiskEngine.compute_risk()
│    • Severity (25%)     │
│    • Persistence (20%)  │
│    • Sensor agreement   │
│    • Trend (10%)        │
│    • Vulnerability      │
│    • Context (5%)       │
│    • Data quality (10%) │
│    → Score 0–100        │
│    → Priority P1–P4     │
│    → Confidence %       │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 5. SCENARIO CALIBRATION │  services._calibrate_risk_row()
│    Floor risk by bridge │  Ensures demo scenarios show realistic alerts
│    scenario profile     │
└───────────┬─────────────┘
            ▼
     SQLite Database
            │
            ▼
     FastAPI → Frontend Dashboard
```

### AI techniques used (for judges)

| Technique | Why we used it |
|-----------|----------------|
| **Ridge Regression** | Learns per-bridge normal behavior; interpretable |
| **MAD (Median Absolute Deviation)** | Robust to outliers vs standard deviation |
| **Isolation Forest** | Finds multivariate anomalies without labels |
| **Hybrid (Stats + ML)** | Catches both spike and subtle drift patterns |
| **Temporal persistence** | Avoids single-point false alarms |
| **Multi-factor risk fusion** | Transparent, weighted scoring — not one black number |
| **Exponential smoothing forecast** | Trend projection with confidence bands |

---

## 6. Backend Architecture

### Key API endpoints

| Endpoint | What it does |
|----------|--------------|
| `GET /api/health` | API + database status |
| `GET /api/bridges` | All 20 bridges with risk summary |
| `GET /api/bridges/{id}/timeseries` | Historical sensor charts |
| `GET /api/bridges/{id}/events` | Anomaly events |
| `GET /api/bridges/{id}/events/{id}/replay` | 6-stage anomaly replay |
| `GET /api/bridges/{id}/forecast` | Risk/sensor trend forecast |
| `GET /api/inspection-queue` | P1–P4 prioritized list |
| `GET /api/sensors/health` | Sensor health flags |
| `POST /api/simulate` | What-if scenario |
| `POST /api/reports/generate` | Engineering report |
| `GET /api/reports/{id}/download` | PDF download |
| `POST /api/assistant/query` | AI Engineer Assistant |
| `POST /api/hardware/telemetry` | ESP32 ingest |
| `WS /api/hardware/ws` | Live hardware broadcast |

### Database tables

| Table | Stores |
|-------|--------|
| `bridges` | Bridge metadata (name, age, location, scenario) |
| `sensor_readings` | Time-series telemetry |
| `baselines` | Learned baseline parameters |
| `anomaly_events` | Detected anomalies with type and severity |
| `risk_assessments` | Risk score, priority, confidence, explanation |
| `sensor_health` | Flatline, noise, missing data flags |
| `simulation_runs` | What-if history |
| `reports` | Generated report records |

### Interactive API docs

After starting backend: **http://localhost:8000/docs**

---

## 7. Frontend Architecture

### Main pages for demo

| URL | Page | Show judges |
|-----|------|-------------|
| `/` | Command Center | Fleet stats, risk chart, top alerts |
| `/inspection-queue` | Inspection Queue | P1–P4 actionable list |
| `/sensors` | Digital Twin | Interactive bridge + sensor health |
| `/anomalies` | Anomaly Explorer | Event replay, deviation charts |
| `/what-if` | What-If Simulator | Traffic/rain/delay sliders |
| `/hardware` | Hardware Bridge | ESP32 live or demo mode |
| `/assistant` | AI Assistant | Natural language Q&A |
| `/reports` | Reports | PDF generation |
| `/welcome` | Showcase landing | First impression (optional) |

### API client

**File:** `frontend/lib/api.ts`  
Base URL: `http://localhost:8000` (configurable via `NEXT_PUBLIC_API_BASE_URL`)

---

## 8. Hardware Prototype

### Components

- **ESP32** microcontroller
- **MPU6050** — vibration/accelerometer
- **HC-SR04** — ultrasonic displacement
- **SSD1306 OLED** — local display
- **3 LEDs + Buzzer** — local alarm
- **Mode button** — cycle operating modes

### Demo modes (no sensors needed)

| Mode | Risk | Use when |
|------|------|----------|
| NORMAL_DEMO | ~12 | Show safe state |
| WARNING_DEMO | ~48 | Show elevated concern |
| HIGH_RISK_DEMO | ~86 | Show critical alarm + buzzer |

### Wiring & firmware

See `hardware/esp32_bridge/README.md`

---

## 9. How to Run the Project

### Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) ESP32 for hardware demo

### Step 1 — Backend

```powershell
cd c:\ai_xdomain\infrastructure
pip install -r data\backend\requirements.txt

# Optional: generate full dataset
python data\generate_dataset.py

# Start API
python data\backend\run_server.py
```

✅ Backend: http://localhost:8000  
✅ API docs: http://localhost:8000/docs  
✅ Health check: http://localhost:8000/api/health

### Step 2 — Frontend

```powershell
cd c:\ai_xdomain\infrastructure\frontend
npm install
npm run dev
```

✅ Dashboard: http://localhost:3000

### Step 3 — Run tests (show judges if asked)

```powershell
cd c:\ai_xdomain\infrastructure
pytest tests\ -v

cd frontend
npm test
```

### Step 4 — Hardware (optional)

1. Flash `hardware/esp32_bridge/esp32_bridge.ino` to ESP32
2. Open `/hardware` in dashboard
3. POST telemetry appears via WebSocket live feed

---

## 10. Judge Demo — Step-by-Step Flow

**Total demo time:** 8–12 minutes (leave time for Q&A)

### Before judges arrive (5 min setup)

- [ ] Backend running (`python data/backend/run_server.py`)
- [ ] Frontend running (`npm run dev`)
- [ ] Browser tab open on `http://localhost:3000`
- [ ] API health shows **API Online** (green badge)
- [ ] ESP32 connected OR hardware page in demo mode
- [ ] Team roles assigned (see below)

### Recommended team roles

| Member | Role during demo |
|--------|------------------|
| Member 1 | Problem + approach (Round 1 style opener) |
| Member 2 | Live dashboard walkthrough |
| Member 3 | ML pipeline + data explanation |
| Member 4 | Hardware + Q&A backup |

---

### DEMO SCRIPT (follow in order)

#### Step 1 — Opening (30 sec)
**Say:**  
*"We built InfraShield AI — an AI-powered structural health monitoring platform for Telangana bridges. It continuously monitors sensor data, detects anomalies, scores risk, and tells inspection teams which bridges need attention first."*

**Show:** Command Center (`/`)

---

#### Step 2 — Fleet Overview (1 min)
**Show:** Horizontal stat cards — Bridges, Normal, Anomalies, P1/P2

**Say:**  
*"We monitor 20 bridges across Telangana. The dashboard shows fleet-wide status at a glance. Right now we have X anomalies and Y bridges in P1/P2 priority."*

**Point to:** Risk overview chart + anomaly status chart

---

#### Step 3 — Inspection Queue (1.5 min)
**Navigate:** `/inspection-queue`

**Say:**  
*"This is the actionable output. AI ranks bridges P1 to P4. P1 means inspect immediately. Each row shows risk score, confidence, and a plain-language reason — not just a number."*

**Click:** Top P1 bridge → show reason and recommended action

---

#### Step 4 — Digital Twin (1.5 min)
**Navigate:** `/sensors`

**Say:**  
*"Each bridge has a digital twin. Sensors are color-coded by health. We track strain, vibration, and displacement. The forecast card projects trends using exponential smoothing."*

**Click:** A sensor node → show detail panel with live values

---

#### Step 5 — Anomaly Explorer (2 min) ⭐ Strongest AI demo
**Navigate:** `/anomalies`

**Say:**  
*"When something goes wrong, we don't just flag it — we explain it. Select a bridge with an active anomaly."*

**Show:**
- Event list with anomaly type (sudden_spike, gradual_deterioration, etc.)
- **Replay** — 6 stages: baseline → deviation → persistence → sensor agreement → risk increase → inspection recommendation
- Deviation statistics vs baseline

**Say:**  
*"This hybrid approach combines statistical MAD Z-scores with Isolation Forest ML, plus temporal persistence to reduce false alarms."*

---

#### Step 6 — What-If Simulator (1.5 min)
**Navigate:** `/what-if`

**Say:**  
*"Engineers can simulate scenarios: increase traffic, add rainfall, delay maintenance. The system recalculates risk and shows which evidence factors changed."*

**Demo:** Move traffic slider up → show risk increase and affected sensors

---

#### Step 7 — AI Engineer Assistant (1 min)
**Navigate:** `/assistant`

**Ask live:**  
- *"Which bridge needs inspection first?"*
- *"Why is [bridge name] high risk?"*
- *"What sensors contributed to the anomaly?"*

**Say:**  
*"Answers are grounded in our database — real risk assessments and anomaly events, not hallucinated."*

---

#### Step 8 — Reports (30 sec)
**Navigate:** `/reports`

**Say:**  
*"One-click engineering inspection report. Downloadable PDF for field teams."*

**Click:** Generate report → download PDF

---

#### Step 9 — Hardware Prototype (1.5 min) ⭐ Physical demo
**Navigate:** `/hardware`

**Say:**  
*"We built a physical ESP32 edge node with vibration and displacement sensors. When vibration exceeds threshold, local buzzer fires and data streams to the dashboard via WebSocket."*

**Demo options:**
- **Live:** Show real sensor readings
- **Demo mode:** Press ESP32 button → cycle NORMAL → WARNING → HIGH_RISK → show buzzer + dashboard update

---

#### Step 10 — Closing (30 sec)
**Say:**  
*"InfraShield AI is decision-support, not a safety certification. It helps authorities inspect the right bridge at the right time, with explainable AI. We're ready for your questions."*

---

## 11. Round 1 Presentation Script (25 Marks)

**Time:** ~11:00 AM | **Total: 25 marks**

### A. Problem Understanding & Analysis — 10 Marks (3–4 min)

**Cover these points:**

1. **Problem:** Bridge infrastructure in Telangana needs continuous monitoring; manual inspection is slow and reactive
2. **Stakeholders:** Infrastructure dept, inspection engineers, operations center
3. **Data available:** Strain, vibration, displacement, temperature, rainfall, traffic
4. **Pain points:**
   - Late detection of deterioration
   - No fleet-wide prioritization
   - Hard to explain why a bridge is risky
5. **Our scope:** Decision-support for inspection prioritization (not replacement of licensed engineers)
6. **Success metric:** Early anomaly detection + ranked inspection queue with explainable risk

**One-liner for judges:**  
*"We analyzed the gap between raw sensor data and actionable inspection decisions, and designed a system that closes that gap."*

---

### B. AI Approach & Solution Design — 10 Marks (3–4 min)

**Use the pipeline diagram from Section 5. Explain each stage:**

| Stage | Method | Judge-friendly explanation |
|-------|--------|---------------------------|
| Baseline | Ridge regression | "Learn what's normal for each bridge given weather and traffic" |
| Anomaly | MAD + Isolation Forest | "Flag when sensors deviate from normal — both spikes and subtle drift" |
| Persistence | Time-window logic | "Don't alarm on one bad reading — require sustained deviation" |
| Risk | Weighted 7-factor fusion | "Combine severity, persistence, sensor agreement into one score" |
| Priority | P1–P4 thresholds | "Translate score into inspection urgency" |
| Explainability | risk_explanation field | "Every alert has a human-readable reason" |

**Architecture diagram to draw on board if asked:**
```
Sensors → Preprocessing → Baseline → Anomaly Detection → Risk Engine → Dashboard
                                              ↓
                                    Inspection Queue + Reports
```

---

### C. Innovation & Feasibility — 5 Marks (2 min)

**Innovation:**
- Hybrid statistical + ML (not just one method)
- Per-bridge adaptive baselines (not one global threshold)
- 6-stage anomaly replay for explainability
- Digital twin + hardware edge node in one platform
- What-if simulation for planning

**Feasibility:**
- Uses open-source stack (Python, FastAPI, Next.js, scikit-learn)
- SQLite → can scale to PostgreSQL + cloud
- ESP32 proves edge deployment is affordable (~₹500–1000 node)
- Synthetic data allows demo without waiting for real sensor deployment
- API-first design — integrates with existing govt systems

**Honest limitation (shows maturity):**  
*"This is a hackathon prototype with synthetic data. Production would need calibrated sensors on real structures and engineer validation."*

---

## 12. Round 2 Presentation Script (25 Marks)

**Time:** ~2:00 PM | **Total: 25 marks**

### A. Implementation & Functionality — 10 Marks

**Show working features (live demo — use Section 10 script):**

| Feature | URL | Proves |
|---------|-----|--------|
| Command Center | `/` | Full fleet works |
| Inspection Queue | `/inspection-queue` | End-to-end pipeline output |
| Anomaly Replay | `/anomalies` | AI detection works |
| What-If | `/what-if` | Interactive simulation |
| Reports | `/reports` | PDF export works |
| Hardware | `/hardware` | Physical integration |
| API | `/docs` | Backend is real, not mockup |

**Mention tests:** `pytest tests/ -v` — API, anomaly, risk, baseline all tested

---

### B. AI Performance & Effectiveness — 10 Marks

**Talking points:**

1. **Hybrid detection catches multiple failure modes:**
   - `sudden_spike` → MAD Z-score fires fast
   - `gradual_deterioration` → Isolation Forest + trend features
   - `sensor_drift` → Baseline residual grows over time

2. **False positive reduction:** Temporal persistence requires sustained deviation

3. **Risk scoring is transparent:**
   - 7 weighted factors (show weights from `risk_engine.py`)
   - Confidence score reflects data quality

4. **Scenario calibration:** Demo bridges have injected faults that produce realistic alerts

5. **Validation:** `tests/test_anomaly.py` runs detector on mock scenarios

**If asked for metrics:**  
*"On our synthetic validation set, the hybrid detector identifies all injected scenario types. Production would need labeled field data for precision/recall tuning."*

---

### C. Demo, Presentation & Team Response — 5 Marks

**Tips:**
- All team members speak at least once
- Don't read slides — drive the live app
- When a judge asks a question, answer directly then offer to show it in the app
- If something breaks: show API docs or explain architecture calmly
- Know your disclaimers: decision-support only, not safety certification

---

## 13. Likely Jury Questions & Answers

| Question | Answer |
|----------|--------|
| Is this real data? | Synthetic data modeled on Telangana weather/traffic patterns; ESP32 provides real sensor path |
| Why not just use thresholds? | Static thresholds fail across bridges — we use per-bridge adaptive baselines |
| Why Isolation Forest? | Unsupervised — works without labeled failure data; catches multivariate patterns |
| How do you reduce false alarms? | Temporal persistence + multi-sensor agreement + data quality factor |
| Can this scale? | Yes — API-first, SQLite → PostgreSQL, edge nodes per bridge |
| What if a sensor fails? | Sensor health module flags flatline, noise, missing data |
| Is the AI assistant ChatGPT? | No — retrieval from our SQLite DB; answers grounded in actual risk data |
| What's the cost? | ESP32 node ~₹500–1000; software is open-source stack |
| Who uses this? | Infrastructure monitoring center → inspection teams |
| Legal/safety liability? | Clearly labeled decision-support; requires licensed engineer sign-off |

---

## 14. Innovation & Feasibility Talking Points

### Why this is innovative

1. **Fleet + edge + explainability** in one platform
2. **Anomaly replay** — judges can see *how* AI reached its conclusion
3. **What-if planning** — not just monitoring, but decision support
4. **Telangana-specific** — real bridge names, local weather patterns
5. **Hardware proof** — not just slides; physical buzzer when risk is high

### Why this is feasible

1. Affordable sensors (ESP32, MPU6050)
2. Standard ML (scikit-learn — no GPU needed)
3. Web dashboard accessible from any browser
4. Incremental deployment: start with 1 bridge, expand fleet
5. Clear upgrade path: synthetic → real sensors → cloud

---

## 15. Pre-Evaluation Checklist

### Technical

- [ ] `python data/backend/run_server.py` — backend up
- [ ] `npm run dev` in frontend — dashboard up
- [ ] http://localhost:8000/api/health returns healthy
- [ ] Dashboard loads with bridge data (not empty)
- [ ] At least one P1/P2 bridge visible in inspection queue
- [ ] Anomaly replay works on one bridge
- [ ] PDF report downloads
- [ ] `pytest tests/ -v` passes (run once before eval)

### Presentation

- [ ] Team knows who speaks which section
- [ ] Demo script practiced (8–12 min)
- [ ] Backup: screenshots if live demo fails
- [ ] API docs tab ready (http://localhost:8000/docs)
- [ ] Hardware charged / demo mode tested

### Upload (Google Drive)

- [ ] Folder named: `PS## – Team Name`
- [ ] Includes: full code, this documentation, README
- [ ] Optional: 2–3 min demo video
- [ ] Team leader verified correct problem number

---

## Quick Reference Card (print for team)

```
START:
  Backend:  python data/backend/run_server.py
  Frontend: cd frontend && npm run dev

URLS:
  Dashboard:  http://localhost:3000
  API Docs:   http://localhost:8000/docs
  Health:     http://localhost:8000/api/health

DEMO ORDER:
  1. Command Center (/)
  2. Inspection Queue
  3. Digital Twin (/sensors)
  4. Anomaly Replay (/anomalies)  ← strongest AI
  5. What-If (/what-if)
  6. Assistant (/assistant)
  7. Reports (/reports)
  8. Hardware (/hardware)         ← physical wow

KEY LINE:
  "Decision-support for inspection prioritization —
   not a replacement for licensed structural engineers."
```

---

*Good luck to the team. Be punctual, be prepared, demonstrate with confidence.*
