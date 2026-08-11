"""Train global Isolation Forest on synthetic bridge telemetry (optimized loader)."""
import os
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATASET_PATH = os.path.join(ROOT, "ml_engine", "data", "bridges_telemetry.csv")
MODEL_DIR = os.path.join(ROOT, "ml_engine", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")

FEATURE_COLS = [
    "strain_microstrain", "vibration_g", "displacement_mm", "temperature_c",
    "humidity_percent", "rainfall_mm", "traffic_load_percent", "wind_speed_mps",
]

if __name__ == "__main__":
    print(f"Loading {DATASET_PATH}...")
    df_full = pd.read_csv(DATASET_PATH, usecols=["bridge_id"] + FEATURE_COLS)
    per_bridge = 6000
    df = pd.concat([g.tail(per_bridge) for _, g in df_full.groupby("bridge_id")], ignore_index=True)
    print(f"Training on {len(df):,} rows...")

    X = df[FEATURE_COLS].fillna(df[FEATURE_COLS].median())
    model = IsolationForest(n_estimators=300, contamination=0.04, random_state=42, n_jobs=-1)
    model.fit(X)
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Saved {MODEL_PATH}")
    print(f"Anomaly rate: {(model.predict(X) == -1).mean() * 100:.2f}%")
