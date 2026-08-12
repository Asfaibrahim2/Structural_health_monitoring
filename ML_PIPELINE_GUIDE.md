# InfraShield AI — Dataset, Training & ML Pipeline Guide

This document explains **where the data lives**, **how models are trained**, **which AI/ML concepts are used**, and **how to walk the code step by step**.

---

## 1. Big Picture (30-second version)

```
1. GENERATE synthetic sensor data for 20 Telangana bridges
2. CLEAN + FEATURE ENGINEER the time series
3. TRAIN adaptive baselines (Ridge) per bridge
4. TRAIN Isolation Forest on residuals (anomaly detection)
5. SCORE risk with a weighted fusion engine (P1–P4)
6. STORE results in SQLite → show on dashboard
```

**Important:** This is mostly **synthetic training data** (physics-inspired simulation), plus optional **live ESP32** readings. It is decision-support, not certified structural engineering software.

---

## 2. Where Is the Dataset?

### Primary CSV (main dataset)

| Item | Path |
|------|------|
| **File** | `ml_engine/data/bridges_telemetry.csv` |
| **Rows** | ~**864,000** (20 bridges × 43,200 minutes each) |
| **Time span** | 2026-08-01 → 2026-08-30, **1 sample per minute** |
| **Bridges** | 20 Telangana structures (`TS-STR-001` … `TS-STR-020`) |

### Columns in the CSV

| Column | Meaning |
|--------|---------|
| `timestamp` | Sample time |
| `bridge_id` | e.g. `TS-STR-001` |
| `strain_microstrain` | Structural strain (με) |
| `vibration_g` | Vibration acceleration (g) |
| `displacement_mm` | Deck displacement (mm) |
| `temperature_c` | Ambient temperature |
| `humidity_percent` | Humidity |
| `rainfall_mm` | Rain |
| `traffic_load_percent` | Traffic load % |
| `wind_speed_mps` | Wind speed |
| `sensor_id` | Sensor node id |
| `scenario` | Injected scenario type |
| `ground_truth_anomaly` | `0` = normal, `1` = known anomaly (for training/eval) |

### How the dataset is generated

| File | Role |
|------|------|
| `ml_engine/data_generator.py` | Core simulator |
| `ml_engine/generate_dataset.py` | CLI helper |
| `data/generate_dataset.py` | Project-level generator (writes `data/raw/…`) |

Bridge catalog + scenario types live in `BRIDGES_METADATA` inside `data_generator.py`:

```python
# ml_engine/data_generator.py
BRIDGES_METADATA = [
    {
        "bridge_id": "TS-STR-001",
        "bridge_name": "Durgam Cheruvu Cable Bridge",
        "scenario_type": "gradual_deterioration",
        ...
    },
    ...
]
```

**Scenario types injected into data:**
- `normal`
- `gradual_deterioration`
- `sudden_spike`
- `persistent_anomaly`
- `sensor_drift`
- `noisy_sensor`
- `sensor_dropout`
- `environmental_disturbance`
- `missing_values`

### Generate / regenerate the dataset

```powershell
cd c:\ai_xdomain\infrastructure
python data\generate_dataset.py
# OR
python ml_engine\generate_dataset.py
```

### Other data stores

| Store | Path | Purpose |
|-------|------|---------|
| SQLite DB | `data/infrashield.db` | Runtime app data (readings, risk, events) |
| Per-bridge IF models | `models/iforest_TS-STR-*.joblib` | Saved Isolation Forest |
| MAD params | `models/params_TS-STR-*.joblib` | Median/MAD scaling params |
| Global IF model | `ml_engine/models/isolation_forest.pkl` | Used by what-if simulator |
| Live hardware | ESP32 → `POST /api/hardware/telemetry` | Real edge readings (optional) |

---

## 3. Where & How Is the Data Trained?

There are **three training/fitting paths** in this project.

### Path A — Offline global Isolation Forest (manual script)

**File:** `ml_engine/train_model.py`

```powershell
python ml_engine\train_model.py
```

**What it does:**
1. Loads `ml_engine/data/bridges_telemetry.csv`
2. Samples ~3,000+ recent rows per bridge
3. Trains **one global** `IsolationForest` on raw sensor features
4. Saves → `ml_engine/models/isolation_forest.pkl`

**Features used:**

```python
FEATURE_COLS = [
    "strain_microstrain", "vibration_g", "displacement_mm",
    "temperature_c", "humidity_percent", "rainfall_mm",
    "traffic_load_percent", "wind_speed_mps",
]
```

**Hyperparameters:**
- `n_estimators=300`
- `contamination=0.04`
- `random_state=42`

**Used for:** What-If simulation scoring (`services.run_simulation`).

---

### Path B — Runtime pipeline on API startup (main production path)

**File:** `data/backend/app/services.py` → `_process_and_seed_dataframe()`

When you run:

```powershell
python data\backend\run_server.py
```

FastAPI calls `seed_initial_data()` which:

1. Seeds 20 bridges from `BRIDGES_METADATA`
2. Loads CSV sample (or generates in-memory if CSV missing)
3. Runs the full ML pipeline below
4. Writes results into `data/infrashield.db`

#### Step-by-step code flow

```
CSV / synthetic sample
        │
        ▼
clean_telemetry_data()          # ml_engine/preprocessing.py
        │
        ▼
compute_features()              # lags, rolling stats, ROC
        │
        ▼
AdaptiveBaselineModel.fit()     # ml_engine/baseline.py  (Ridge)
AdaptiveBaselineModel.predict() # residuals = actual - expected
        │
        ▼
HybridAnomalyDetector.fit_ml_detector()   # Isolation Forest per bridge
HybridAnomalyDetector.run_detection_pipeline()
        │
        ▼
RiskEngine.compute_risk()       # ml_engine/risk_engine.py
        │
        ▼
SQLite: readings, risk_assessments, anomaly_events, sensor_health
```

**Exact orchestration code:**

```python
# data/backend/app/services.py  (_process_and_seed_dataframe)

df_cleaned = clean_telemetry_data(df_sample)
df_feat = compute_features(df_cleaned)

baseline = AdaptiveBaselineModel(version="v1.0")
baseline.fit(df_feat, train_start=t_start, train_end=t_end)
df_res = baseline.predict(df_feat)

detector = HybridAnomalyDetector()
detector.fit_ml_detector(df_res)           # TRAIN Isolation Forests
df_det = detector.run_detection_pipeline(df_res)

risk_eng = RiskEngine()
df_risk = risk_eng.compute_risk(group, meta)
```

---

### Path C — Per-bridge Isolation Forest training details

**File:** `ml_engine/anomaly_detector.py` → `fit_ml_detector()`

```python
# Train ONLY on normal rows (ground_truth_anomaly == 0)
normal_train = df_train[df_train["ground_truth_anomaly"] == 0]

# Features = residuals from baseline (not raw sensors)
residual_cols = [
    "strain_microstrain_residual",
    "vibration_g_residual",
    "displacement_mm_residual",
]

# Scale with median / MAD (robust)
# Then fit IsolationForest(n_estimators=100, contamination=0.01)

# Save:
# models/bridge_detectors/iforest_{bridge_id}.joblib
# models/bridge_detectors/params_{bridge_id}.joblib
```

**Why residuals?**  
Raw vibration rises with traffic. Residuals remove expected environmental effects, so anomalies mean “unexpected for this weather/traffic,” not just “busy road.”

---

## 4. AI / ML Concepts Used (explainable for judges)

| # | Concept | Where in code | Simple explanation |
|---|---------|---------------|--------------------|
| 1 | **Synthetic data generation** | `data_generator.py` | Physics-inspired simulation of sensors + fault injection |
| 2 | **Feature engineering** | `preprocessing.py` | Lags, rolling means, rate-of-change, flatline flags |
| 3 | **Cyclical time features** | `baseline.py` | `sin/cos` of hour & weekday (no midnight discontinuity) |
| 4 | **Ridge regression** | `AdaptiveBaselineModel` | Learns “normal” strain/vib/disp from temp, traffic, rain |
| 5 | **Residual analysis** | baseline `predict()` | `residual = actual − predicted` |
| 6 | **Robust statistics (MAD)** | preprocessing + detector | Median Absolute Deviation — outlier-resistant Z-scores |
| 7 | **Isolation Forest** | `anomaly_detector.py`, `train_model.py` | Unsupervised anomaly detection (no labeled failures needed at inference) |
| 8 | **Hybrid detection** | `HybridAnomalyDetector` | Statistical **OR** ML alert + temporal persistence |
| 9 | **Temporal persistence** | detector state trackers | Require sustained alerts → fewer false alarms |
| 10 | **Anomaly typing** | detector heuristics | sudden_spike, gradual_deterioration, sensor_drift, … |
| 11 | **Multi-factor risk fusion** | `RiskEngine` | Weighted score → 0–100 + P1–P4 |
| 12 | **Sensor health scoring** | `RiskEngine.compute_sensor_health` | Missing/flatline/noise/drift flags |
| 13 | **Trend forecasting** | `data/backend/app/forecasting.py` | Linear regression + exponential smoothing |
| 14 | **Retrieval assistant** | `assistant.py` | Keyword QA over DB (not generative LLM) |

### Risk score weights (transparent AI)

```python
# ml_engine/risk_engine.py
weights = {
    "severity": 0.25,
    "persistence": 0.20,
    "sensor_agreement": 0.20,
    "trend": 0.10,
    "asset_vulnerability": 0.10,
    "context": 0.05,
    "data_quality": 0.10,
}
```

### Priority bands

| Priority | Risk score | Meaning |
|----------|------------|---------|
| **P1** | ≥ 80 | Inspect immediately |
| **P2** | ≥ 60 | Inspect soon |
| **P3** | ≥ 35 | Monitor closely |
| **P4** | < 35 | Normal / routine |

---

## 5. Folder Map — What Each File Does

```
infrastructure/
│
├── ml_engine/                          ← AI/ML core
│   ├── data_generator.py               ← CREATE dataset (20 bridges)
│   ├── generate_dataset.py             ← CLI to export CSV
│   ├── preprocessing.py                ← CLEAN + FEATURES
│   ├── baseline.py                     ← TRAIN Ridge baselines
│   ├── anomaly_detector.py             ← TRAIN + RUN Isolation Forest hybrid
│   ├── risk_engine.py                  ← SCORE risk / priority
│   ├── train_model.py                  ← TRAIN global IF for what-if
│   ├── validation.py                   ← Dataset checks
│   ├── data/
│   │   └── bridges_telemetry.csv       ← ★ MAIN DATASET (~864k rows)
│   └── models/
│       └── isolation_forest.pkl        ← Global IF model
│
├── models/                             ← Per-bridge saved IF models
│   ├── iforest_TS-STR-*.joblib
│   └── params_TS-STR-*.joblib
│
├── data/
│   ├── backend/app/
│   │   ├── services.py                 ← Orchestrates full ML pipeline
│   │   ├── main.py                     ← FastAPI endpoints
│   │   ├── forecasting.py              ← Trend forecasts
│   │   ├── assistant.py                ← DB-backed Q&A
│   │   └── report_generator.py         ← PDF reports
│   ├── generate_dataset.py             ← Alternate dataset export
│   └── infrashield.db                  ← Runtime SQLite
│
├── frontend/                           ← Dashboard (consumes API results)
├── hardware/esp32_bridge/              ← Optional live sensor node
└── tests/                              ← pytest for API + ML
```

---

## 6. Step-by-Step Learning Path (read code in this order)

### Step 1 — Understand the data
1. Open `ml_engine/data_generator.py`
2. Read `BRIDGES_METADATA`
3. Read `generate_bridge_dataset()`
4. Open a few rows of `ml_engine/data/bridges_telemetry.csv`

**Ask yourself:** What sensors exist? What does `ground_truth_anomaly` mean?

### Step 2 — Preprocessing
1. Open `ml_engine/preprocessing.py`
2. Read `clean_telemetry_data()`
3. Read `compute_features()`

**Ask yourself:** Why do we keep extreme outliers (anomaly signatures)?

### Step 3 — Baseline (supervised regression)
1. Open `ml_engine/baseline.py`
2. Read `AdaptiveBaselineModel.fit()` — trains **only on normal rows**
3. Read `predict()` — creates residuals

**Ask yourself:** Why train one model per bridge?

### Step 4 — Anomaly detection (unsupervised ML)
1. Open `ml_engine/anomaly_detector.py`
2. Read `fit_ml_detector()` — Isolation Forest on residuals
3. Read `detect_statistical_anomalies()` — MAD Z-score
4. Read `run_detection_pipeline()` — hybrid merge + typing

**Ask yourself:** Why hybrid (stats + ML) instead of only Isolation Forest?

### Step 5 — Risk decision support
1. Open `ml_engine/risk_engine.py`
2. Read weights + `compute_risk()`
3. See how P1–P4 is assigned

### Step 6 — Backend glue
1. Open `data/backend/app/services.py`
2. Follow `_process_and_seed_dataframe()` top to bottom
3. Open `data/backend/app/main.py` — see `/api/bridges`, `/api/inspection-queue`

### Step 7 — Frontend consumption
1. `frontend/lib/api.ts` — API client
2. `frontend/app/page.tsx` — Command Center
3. `frontend/app/anomalies/` — Event replay (shows ML stages)
4. `frontend/app/what-if/` — Uses global Isolation Forest

### Step 8 — Validate
```powershell
pytest tests\test_anomaly.py tests\test_risk.py tests\test_baseline.py -v
```

---

## 7. Training Commands Cheat Sheet

```powershell
# 1) Generate / refresh full CSV dataset
python data\generate_dataset.py

# 2) Train global Isolation Forest (what-if)
python ml_engine\train_model.py

# 3) Start API → auto-runs Path B pipeline + seeds DB
python data\backend\run_server.py

# 4) Start dashboard
cd frontend
npm run dev
```

---

## 8. End-to-End Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  DATASET CREATION                                           │
│  data_generator.py → bridges_telemetry.csv (864k rows)      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  OFFLINE TRAIN (optional)                                   │
│  train_model.py → isolation_forest.pkl                      │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  RUNTIME TRAIN + INFERENCE (API startup)                    │
│  services._process_and_seed_dataframe()                     │
│                                                             │
│  preprocessing → Ridge baseline → Hybrid IF → RiskEngine    │
│  saves iforest_*.joblib + writes SQLite                     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  FASTAPI → FRONTEND                                         │
│  Inspection queue, anomaly replay, digital twin, reports    │
└─────────────────────────────────────────────────────────────┘
                           ▲
┌──────────────────────────┴──────────────────────────────────┐
│  OPTIONAL LIVE EDGE                                         │
│  ESP32 → POST /api/hardware/telemetry → WebSocket dashboard │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. How to Explain This to Judges (1-minute script)

> “Our dataset is a **synthetic Telangana bridge telemetry CSV** with 20 bridges and about 864,000 minute-level samples, including injected fault scenarios.  
> On startup we **clean the data**, train **per-bridge Ridge baselines** to learn normal behavior under weather and traffic, then train **Isolation Forests on residuals**.  
> We combine that with **robust MAD statistics** and **temporal persistence** for hybrid anomaly detection.  
> Finally a **transparent weighted risk engine** converts evidence into a 0–100 score and **P1–P4 inspection priorities**.  
> The dashboard shows the results; the ESP32 proves a real edge sensor path. This is **decision-support**, not a safety certification.”

---

## 10. Quick FAQ

**Q: Is this real sensor data?**  
A: Primary fleet data is **synthetic**. ESP32 can send **real** vibration/displacement. Labels (`ground_truth_anomaly`) exist because we inject scenarios.

**Q: Where does training happen automatically?**  
A: In `services._process_and_seed_dataframe()` when the FastAPI server starts.

**Q: Where are trained models saved?**  
A: Per-bridge: `models/iforest_*.joblib`. Global: `ml_engine/models/isolation_forest.pkl`.

**Q: Which sklearn models?**  
A: `Ridge` (baseline) and `IsolationForest` (anomaly).

**Q: Deep learning / neural nets?**  
A: Not used. Classical ML is intentional — explainable, fast, no GPU needed for a hackathon demo.

---

*Related docs: `PROJECT_DOCUMENTATION.md` (judge presentation + demo script).*
