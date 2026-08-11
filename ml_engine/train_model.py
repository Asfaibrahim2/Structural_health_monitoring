"""Train global Isolation Forest on synthetic bridge telemetry."""
import os
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATASET_PATH = os.path.join(ROOT, "ml_engine", "data", "bridges_telemetry.csv")
MODEL_DIR = os.path.join(ROOT, "ml_engine", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")

FEATURE_COLS = [
    "strain_microstrain",
    "vibration_g",
    "displacement_mm",
    "temperature_c",
    "humidity_percent",
    "rainfall_mm",
    "traffic_load_percent",
    "wind_speed_mps",
]


def train_model(sample_rows: int = 120_000):
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}. Run data/generate_dataset.py first.")

    print(f"Loading telemetry from {DATASET_PATH}...")
    # Stratified sample: last chunk per bridge for realistic anomaly mix
    bridge_ids = pd.read_csv(DATASET_PATH, usecols=["bridge_id"])["bridge_id"].unique()
    chunks = []
    per_bridge = max(3000, sample_rows // len(bridge_ids))
    for b_id in bridge_ids:
        bdf = pd.read_csv(DATASET_PATH)
        bdf = bdf[bdf["bridge_id"] == b_id].tail(per_bridge)
        chunks.append(bdf)
    df = pd.concat(chunks, ignore_index=True)
    print(f"Training on {len(df):,} rows across {len(bridge_ids)} bridges...")

    X = df[FEATURE_COLS].fillna(df[FEATURE_COLS].median())
    model = IsolationForest(
        n_estimators=300,
        max_samples="auto",
        contamination=0.04,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    # Quick validation
    scores = model.decision_function(X)
    preds = model.predict(X)
    anomaly_rate = (preds == -1).mean() * 100
    print(f"Training anomaly rate: {anomaly_rate:.2f}%")
    print(f"Decision function range: [{scores.min():.3f}, {scores.max():.3f}]")


if __name__ == "__main__":
    train_model()
