# InfraShield AI — Formulas & Scientific Concepts

This document lists **every major formula** used for baseline modeling, anomaly detection, sensor health, risk scoring, calibration, and forecasting.

**Source of truth in code:**
- `ml_engine/preprocessing.py`
- `ml_engine/baseline.py`
- `ml_engine/anomaly_detector.py`
- `ml_engine/risk_engine.py`
- `data/backend/app/services.py` (`_calibrate_risk_row`)
- `data/backend/app/forecasting.py`

---

## Table of Contents

1. [Notation & Units](#1-notation--units)
2. [Time Features](#2-time-features)
3. [Rolling / Lag Features](#3-rolling--lag-features)
4. [Adaptive Baseline (Ridge Regression)](#4-adaptive-baseline-ridge-regression)
5. [Residuals & Control Bounds](#5-residuals--control-bounds)
6. [Robust Statistics (Median & MAD)](#6-robust-statistics-median--mad)
7. [Statistical Anomaly Score](#7-statistical-anomaly-score)
8. [Isolation Forest Score](#8-isolation-forest-score)
9. [Hybrid Alert & Persistence](#9-hybrid-alert--persistence)
10. [Sensor Health & Data Quality](#10-sensor-health--data-quality)
11. [Risk Component Scores](#11-risk-component-scores)
12. [Master Risk Formula](#12-master-risk-formula)
13. [Priority Classification (P1–P4)](#13-priority-classification-p1p4)
14. [Calibration / Blending](#14-calibration--blending)
15. [Forecasting Formulas](#15-forecasting-formulas)
16. [Parameter Glossary](#16-parameter-glossary)
17. [Worked Example](#17-worked-example)

---

## 1. Notation & Units

### Structural sensor inputs (measured)

| Symbol | Code column | Unit | Physical meaning |
|--------|-------------|------|------------------|
| \(S\) | `strain_microstrain` | με | Tensile/compressive strain in structural members |
| \(V\) | `vibration_g` | g | Acceleration from traffic / dynamic load |
| \(D\) | `displacement_mm` | mm | Vertical deck deflection / sag |
| \(T\) | `temperature_c` | °C | Ambient temperature (thermal expansion driver) |
| \(H\) | `humidity_percent` | % | Relative humidity |
| \(R\) | `rainfall_mm` | mm | Rain intensity |
| \(L\) | `traffic_load_percent` | % | Relative traffic load on the span |
| \(W\) | `wind_speed_mps` | m/s | Wind speed |

### Why these sensors?

Bridge response is a **coupled thermo-mechanical system**:
- Temperature changes length → strain
- Traffic mass changes deflection → displacement + vibration
- Rain/wind add environmental excitation and noise

So we never threshold raw \(S,V,D\) alone. We first predict **expected** values under current weather/traffic, then analyze **unexpected** residuals.

---

## 2. Time Features

**File:** `ml_engine/baseline.py` → `_engineer_time_features()`

### Why cyclical encoding?

Hour 23 and hour 0 are adjacent in real life, but numerically far apart (23 vs 0). Using \(\sin/\cos\) maps time onto a circle so midnight is continuous.

\[
\begin{aligned}
h &= \text{hour} + \frac{\text{minute}}{60} \\
\text{hour\_sin} &= \sin\!\left(\frac{2\pi h}{24}\right) \\
\text{hour\_cos} &= \cos\!\left(\frac{2\pi h}{24}\right)
\end{aligned}
\]

\[
\begin{aligned}
d &= \text{day of week (0=Mon … 6=Sun)} \\
\text{dow\_sin} &= \sin\!\left(\frac{2\pi d}{7}\right) \\
\text{dow\_cos} &= \cos\!\left(\frac{2\pi d}{7}\right)
\end{aligned}
\]

**Science:** Diurnal thermal cycles and weekly traffic patterns dominate civil SHM baselines.

---

## 3. Rolling / Lag Features

**File:** `ml_engine/preprocessing.py` → `compute_features()`

For each target \(x \in \{S,V,D\}\):

| Feature | Formula | Why |
|---------|---------|-----|
| Lag-1 | \(x_{t-1}\) | Short-term memory |
| Lag-2 | \(x_{t-2}\) | Smooths one-step noise |
| Rate of change | \(\mathrm{ROC}_t = x_t - x_{t-1}\) | Detects sudden spikes |
| Rolling mean (5) | \(\bar{x}^{(5)}_t = \frac{1}{5}\sum_{i=0}^{4} x_{t-i}\) | Local trend |
| Rolling mean (15) | \(\bar{x}^{(15)}_t\) | Longer smoothing |
| Rolling std (15) | \(\sigma^{(15)}_t\) | Noise / flatline detection |
| Flatline flag | \(1\) if \(\sigma^{(15)}_t < 10^{-9}\) | Sensor stuck / dropout |

**Science:** Structural anomalies often appear as **changes in dynamics** (rate, variance), not only absolute level.

---

## 4. Adaptive Baseline (Ridge Regression)

**File:** `ml_engine/baseline.py` → `AdaptiveBaselineModel`

### Model

For each bridge \(b\) and each target \(y \in \{S,V,D\}\):

\[
\hat{y}_t = \beta_0 + \boldsymbol{\beta}^\top \mathbf{x}_t
\]

where

\[
\mathbf{x}_t = \big[
T_t,\; L_t,\; R_t,\;
\text{hour\_sin}_t,\; \text{hour\_cos}_t,\;
\text{dow\_sin}_t,\; \text{dow\_cos}_t
\big]
\]

### Training objective (Ridge)

\[
\min_{\boldsymbol{\beta}} \;
\sum_i \big(y_i - \beta_0 - \boldsymbol{\beta}^\top \mathbf{x}_i\big)^2
+ \alpha \|\boldsymbol{\beta}\|_2^2
\]

with \(\alpha = 1.0\) (code: `Ridge(alpha=1.0)`).

### Training rules (critical)

1. Train **per bridge** (different stiffness, age, span).
2. Train **only on normal rows** (`ground_truth_anomaly == 0`) so faults do not enter “normal.”
3. Use a historical time window \([t_{\text{start}}, t_{\text{end}}]\).

### Why Ridge?

Ordinary least squares can overfit correlated weather features. L2 penalty shrinks coefficients → more stable expected values for SHM.

### Inputs / Outputs

| Type | Name | Description |
|------|------|-------------|
| Input | \(T,L,R\) + time features | Environmental drivers |
| Input | \(y\) actual sensor | Strain / vib / disp |
| Output | \(\hat{y}\) (`*_expected`) | Expected healthy response |
| Output | \(\sigma_{\text{res}}\) | Std of training residuals |

---

## 5. Residuals & Control Bounds

**File:** `baseline.py` → `predict()`

### Residual (unexpected response)

\[
r_t = y_t - \hat{y}_t
\]

| Code | Meaning |
|------|---------|
| `strain_microstrain_residual` | Unexpected strain |
| `vibration_g_residual` | Unexpected vibration |
| `displacement_mm_residual` | Unexpected deflection |

### Normalized residual (sigma units)

\[
z^{\text{base}}_t = \frac{r_t}{\sigma_{\text{res}}}
\]

### 3σ control chart bounds

\[
\begin{aligned}
y^{\text{lower}}_t &= \hat{y}_t - 3\sigma_{\text{res}} \\
y^{\text{upper}}_t &= \hat{y}_t + 3\sigma_{\text{res}}
\end{aligned}
\]

**Science:** Classical Statistical Process Control (SPC). Points outside \(\pm 3\sigma\) are rare under a healthy Gaussian residual assumption (~0.3% false alarm rate if truly normal).

---

## 6. Robust Statistics (Median & MAD)

**Files:** `preprocessing.py`, `anomaly_detector.py`

Classical mean/std are ruined by outliers. SHM uses **median** and **MAD**.

### Median Absolute Deviation

\[
\begin{aligned}
m &= \mathrm{median}(r) \\
\mathrm{MAD} &= \mathrm{median}\big(|r - m|\big)
\end{aligned}
\]

### Robust scaling (used before Isolation Forest)

\[
\tilde{r} = \frac{r - m}{\mathrm{MAD}}
\]

(If \(\mathrm{MAD} \approx 0\), fall back to std or 1.0 to avoid divide-by-zero.)

**Science:** MAD is breakdown-point robust (~50%). One bad spike does not explode the scale estimate.

---

## 7. Statistical Anomaly Score

**File:** `anomaly_detector.py` → `detect_statistical_anomalies()`

### Robust Z-score per residual channel

\[
Z_{k,t} = \frac{|r_{k,t} - m_k|}{\mathrm{MAD}_k},
\quad k \in \{\text{strain}, \text{vib}, \text{disp}\}
\]

### Average Z across sensors

\[
\bar{Z}_t = \frac{1}{3}\big(Z_{\text{strain},t} + Z_{\text{vib},t} + Z_{\text{disp},t}\big)
\]

### Score mapped to \([0,1]\)

\[
s^{\text{stat}}_t = \mathrm{clip}\!\left(\frac{\bar{Z}_t}{6},\; 0,\; 1\right)
\]

### Binary statistical alert

\[
a^{\text{stat}}_t =
\begin{cases}
1 & \text{if } \bar{Z}_t > 3 \\
0 & \text{otherwise}
\end{cases}
\]

| Threshold | Meaning |
|-----------|---------|
| \(\bar{Z}>3\) | Strong statistical deviation (~alert) |
| \(\bar{Z}/6 \to 1\) | Extreme severity saturation at ~6σ |

---

## 8. Isolation Forest Score

**Files:** `anomaly_detector.py` (`fit_ml_detector`, `detect_ml_anomalies`), `train_model.py`

### Idea (science)

Isolation Forest isolates anomalies by random recursive partitioning. Anomalies need **fewer splits** → shorter path length → more anomalous.

### Training features (per-bridge detector)

\[
\mathbf{f}_t = \big[
\tilde{r}_{S,t},\; \tilde{r}_{V,t},\; \tilde{r}_{D,t}
\big]
\quad\text{(MAD-scaled residuals)}
\]

Trained only on normal residuals (`ground_truth_anomaly == 0`).

Hyperparams (per-bridge): `n_estimators=100`, `contamination=0.01`.

### Decision function → score

Sklearn returns `decision_function` (higher = more normal). Code maps:

\[
s^{\text{IF}}_t = \mathrm{clip}\!\left(\frac{0.15 - d_t}{0.3},\; 0,\; 1\right)
\]

where \(d_t =\) `decision_function`.

### Binary ML alert

\[
a^{\text{IF}}_t =
\begin{cases}
1 & \text{if predict} = -1 \text{ (outlier)} \\
0 & \text{if predict} = +1 \text{ (inlier)}
\end{cases}
\]

### Why Isolation Forest?

- Unsupervised (works without many labeled collapses)
- Multivariate (catches joint strain+vib+disp patterns)
- Fast for streaming / batch SHM

---

## 9. Hybrid Alert & Persistence

**File:** `anomaly_detector.py` → `analyze_temporal_persistence()`

### Hybrid OR gate

\[
a_t = a^{\text{stat}}_t \;\lor\; a^{\text{IF}}_t
\]

**Why hybrid?**  
- MAD catches sharp univariate spikes  
- Isolation Forest catches subtle multivariate drifts  
- Together they cover more failure modes

### Persistence score

Let \(c_t\) = consecutive active alert minutes.

\[
p_t = \min\!\left(\frac{c_t}{30},\; 1\right)
\]

Saturates after **30 continuous alert minutes**.

### Recovery rule

Event ends only after **15 consecutive normal** readings.

**Science:** Civil structures respond slowly; one noisy sample should not create a P1 inspection. Persistence filters transient noise.

### Duration

\[
\text{duration\_minutes} = \frac{t_{\text{now}} - t_{\text{start}}}{60}
\]

---

## 10. Sensor Health & Data Quality

**File:** `risk_engine.py` → `compute_sensor_health()`

### Per-sensor health penalty

For each target \(k\):

\[
\begin{aligned}
\text{penalty}_k &=
50\cdot \rho^{\text{miss}}_k
+ 30\cdot F_k
+ 20\cdot N_k
+ 20\cdot \delta_k \\
H_k &= \mathrm{clip}(100 - \text{penalty}_k,\; 0,\; 100)
\end{aligned}
\]

| Symbol | Meaning | How computed |
|--------|---------|--------------|
| \(\rho^{\text{miss}}\) | Missing ratio | Rolling mean of `*_was_missing` over 60 min |
| \(F\) | Flatline flag | Rolling std ≈ 0 |
| \(N\) | Noise flag | \(\sigma^{(15)} > 6\times\) normal median std |
| \(\delta\) | Drift score | Clipped absolute residual slope |

### Overall data quality

\[
Q = \frac{H_{\text{strain}} + H_{\text{vib}} + H_{\text{disp}}}{3}
\]

### Confidence & uncertainty

\[
\begin{aligned}
C &= Q \\
U &= 100 - C
\end{aligned}
\]

**Science:** Risk without data-quality awareness is dangerous. Unhealthy sensors reduce confidence and raise uncertainty.

---

## 11. Risk Component Scores

**File:** `risk_engine.py` → `compute_risk()`  
All component scores are scaled to **0–100**.

### A. Severity

\[
\begin{aligned}
Z^{\max}_t &= \max_k \big|z^{\text{base}}_{k,t}\big| \\
\mathrm{Severity}_t &= \mathrm{clip}\!\left(\frac{Z^{\max}_t}{6}\cdot 100,\; 0,\; 100\right)
\end{aligned}
\]

A normalized residual of **6σ → severity 100**.

### B. Persistence

\[
\mathrm{Persistence}_t = p_t \cdot 100
\]

### C. Sensor agreement

Within a **10-minute tolerance window**, count how many of \(\{S,V,D\}\) recently exceeded \(|z|>2.5\):

\[
\mathrm{Agreement}_t = \frac{n_{\text{active}}}{3}\cdot 100
\]

| Active sensors | Agreement |
|----------------|-----------|
| 3 | 100 |
| 2 | 66.7 |
| 1 | 33.3 |
| 0 | 0 |

**Science:** Multi-sensor corroboration reduces false positives from one faulty channel.

### D. Trend

Using ~30-min residual slopes:

\[
\begin{aligned}
\mathrm{slope}_D &= \big|\text{rolling mean of }\Delta r_D\big| \\
\mathrm{slope}_S &= \big|\text{rolling mean of }\Delta r_S\big| \\
\mathrm{Trend} &= \mathrm{clip}\!\big(\max(10\cdot\mathrm{slope}_D,\; 0.5\cdot\mathrm{slope}_S)\cdot 100,\; 0,\; 100\big)
\end{aligned}
\]

Captures **gradual deterioration** (rising residual trend).

### E. Asset vulnerability

From bridge metadata (age, heritage, span, etc.):

\[
\mathrm{Vuln} = v \cdot 100,\quad v\in[0,1]
\]

(`vulnerability_factor` in `BRIDGES_METADATA`)

### F. Context (environment / load)

\[
\mathrm{Context} = \mathrm{clip}\!\left(
50\cdot\frac{W}{25} + 50\cdot\frac{L}{100},\; 0,\; 100
\right)
\]

High wind and high traffic raise contextual stress.

### G. Data quality

\[
\mathrm{DataQuality} = Q
\]

---

## 12. Master Risk Formula

**File:** `risk_engine.py`

\[
\begin{aligned}
\mathrm{Risk} =
&\; 0.25\cdot\mathrm{Severity} \\
&+ 0.20\cdot\mathrm{Persistence} \\
&+ 0.20\cdot\mathrm{Agreement} \\
&+ 0.10\cdot\mathrm{Trend} \\
&+ 0.10\cdot\mathrm{Vuln} \\
&+ 0.05\cdot\mathrm{Context} \\
&+ 0.10\cdot\mathrm{DataQuality}
\end{aligned}
\]

Then:

\[
\mathrm{Risk} = \mathrm{clip}(\mathrm{Risk},\; 0,\; 100)
\]

### Why these weights?

| Weight | Factor | Rationale |
|--------|--------|-----------|
| 0.25 | Severity | Magnitude of structural deviation matters most |
| 0.20 | Persistence | Sustained events ≫ one-off spikes |
| 0.20 | Agreement | Independent sensors agreeing → higher trust |
| 0.10 | Trend | Captures slow deterioration |
| 0.10 | Vulnerability | Old / heritage assets need earlier attention |
| 0.05 | Context | Environment modulates but must not dominate |
| 0.10 | Data quality | Bad sensors should not produce confident risk |

> Safety rule in code comments: **never dismiss a structural anomaly only because weather is present.**

---

## 13. Priority Classification (P1–P4)

\[
\begin{cases}
\mathrm{P1} & \mathrm{Risk} \ge 80 \\
\mathrm{P2} & 60 \le \mathrm{Risk} < 80 \\
\mathrm{P3} & 35 \le \mathrm{Risk} < 60 \\
\mathrm{P4} & \mathrm{Risk} < 35
\end{cases}
\]

| Priority | Operational meaning |
|----------|---------------------|
| P1 | Immediate inspection |
| P2 | Inspect soon |
| P3 | Increased monitoring |
| P4 | Routine / normal |

---

## 14. Calibration / Blending

**File:** `services.py` → `_calibrate_risk_row()`

Used when seeding demo scenarios so injected faults remain visible.

\[
\begin{aligned}
R_{\text{blend}} &= \max\!\big(R_{\text{ML}},\; 0.85\cdot R_{\text{peak}},\; R_{\text{floor}}(\text{scenario})\big) \\
R_{\text{cal}} &= \min\!\big(100,\; R_{\text{blend}} + 8\cdot v\big)
\end{aligned}
\]

where \(v\) = vulnerability factor.

Confidence after calibration:

\[
C_{\text{cal}} = \mathrm{clip}\!\big(C_{\text{floor}} - 0.05\cdot R_{\text{cal}},\; 75,\; 98\big)
\]

\[
U_{\text{cal}} = \max(2,\; 100 - C_{\text{cal}})
\]

---

## 15. Forecasting Formulas

**File:** `data/backend/app/forecasting.py`

### A. Linear trend regression

Fit on history \(i=0\ldots n-1\):

\[
y_i \approx a + b\, i
\]

Forecast at horizon \(h\):

\[
\hat{y}_{n-1+h} = a + b(n-1+h)
\]

Confidence band grows with horizon:

\[
\begin{aligned}
m_h &= (1 + 0.15 h)\,\sigma_{\text{resid}} \\
[\hat{y}-m_h,\; \hat{y}+m_h]
\end{aligned}
\]

### B. Holt double exponential smoothing

Level \(L_t\) and trend \(T_t\):

\[
\begin{aligned}
L_t &= \alpha y_t + (1-\alpha)(L_{t-1}+T_{t-1}) \\
T_t &= \beta (L_t - L_{t-1}) + (1-\beta) T_{t-1} \\
\hat{y}_{t+h} &= L_t + h\, T_t
\end{aligned}
\]

Defaults: \(\alpha=0.3\), \(\beta=0.1\).

**Science:** Holt’s method is standard for short-horizon trend projection in operations dashboards.

---

## 16. Parameter Glossary

### Inputs (from sensors / metadata)

| Parameter | Source | Role |
|-----------|--------|------|
| Strain, Vibration, Displacement | Telemetry CSV / ESP32 | Structural response |
| Temperature, Rain, Wind, Traffic | Telemetry / env model | Drivers of expected response |
| `vulnerability_factor` | Bridge metadata | Age / heritage / fragility prior |
| `scenario_type` | Injected synthetic label | Demo calibration floors |
| `ground_truth_anomaly` | Generator | Train/eval only (not used as runtime feature) |

### Intermediate calculated quantities

| Name | Symbol / code | Range |
|------|---------------|-------|
| Expected value | `*_expected` | sensor units |
| Residual | `*_residual` | sensor units |
| Normalized residual | `*_normalized_residual` | σ units |
| Stat score | `statistical_score` | 0–1 |
| IF score | `isolation_forest_score` | 0–1 |
| Persistence | `persistence_score` | 0–1 |
| Health | `*_health_score` | 0–100 |

### Final decision outputs

| Name | Code | Range / values |
|------|------|----------------|
| Risk indicator | `risk_score` | 0–100 |
| Confidence | `confidence_score` | ~0–100 % |
| Uncertainty | `uncertainty` | ± points |
| Priority | `inspection_priority` | P1 / P2 / P3 / P4 |
| Explanation | `risk_explanation` | Human-readable breakdown |
| Anomaly type | `anomaly_type` | sudden_spike, gradual_deterioration, … |

---

## 17. Worked Example

Suppose for one bridge at time \(t\):

| Component | Value |
|-----------|-------|
| Severity | 72 |
| Persistence | 80 |
| Agreement | 67 |
| Trend | 40 |
| Vulnerability | 55 |
| Context | 30 |
| Data quality | 92 |

\[
\begin{aligned}
\mathrm{Risk} &=
0.25(72)+0.20(80)+0.20(67)+0.10(40)\\
&\quad +0.10(55)+0.05(30)+0.10(92) \\
&= 18.0 + 16.0 + 13.4 + 4.0 + 5.5 + 1.5 + 9.2 \\
&= 67.6
\end{aligned}
\]

→ **Priority = P2** (since \(60 \le 67.6 < 80\)).

Weighted contribution breakdown (what the UI explanation string reports):

| Factor | Weighted contribution |
|--------|----------------------|
| Severity | 18.0 |
| Persistence | 16.0 |
| Agreement | 13.4 |
| Trend | 4.0 |
| Vulnerability | 5.5 |
| Context | 1.5 |
| Data quality | 9.2 |

---

## Formula Pipeline Summary

```
Sensors (S,V,D) + Env (T,R,L,W)
            │
            ▼
   Ridge baseline  →  expected ŷ
            │
            ▼
   residual r = y − ŷ
            │
     ┌──────┴──────┐
     ▼             ▼
  MAD Z-score   Isolation Forest
     │             │
     └──────┬──────┘
            ▼
   Hybrid alert + persistence p
            │
            ▼
   Risk components (0–100)
            │
            ▼
   Risk = Σ w_i · component_i
            │
            ▼
   Priority P1–P4 + confidence/uncertainty
```

---

## Key Scientific References (concepts, not papers)

| Concept | Field |
|---------|-------|
| Residual analysis / SPC \(\pm 3\sigma\) | Statistical Process Control |
| MAD robust scale | Robust statistics |
| Ridge regression | Regularized linear models |
| Isolation Forest | Unsupervised anomaly detection (Liu et al., 2008 idea) |
| Multi-sensor fusion | Structural Health Monitoring decision support |
| Holt linear trend | Time-series forecasting |

---

*Related docs:* `ML_PIPELINE_GUIDE.md` (pipeline & files), `PROJECT_DOCUMENTATION.md` (demo / judges).
