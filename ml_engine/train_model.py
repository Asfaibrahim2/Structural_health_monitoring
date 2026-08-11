import os
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

DATASET_PATH = "data/bridges_telemetry.csv"
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "isolation_forest.pkl")

def train_model():
    """Train an IsolationForest model on the generated telemetry dataset.
    The model predicts anomalies based on sensor readings.
    """
    # Load dataset
    df = pd.read_csv(DATASET_PATH)
    # Feature columns (excluding identifiers and target columns)
    feature_cols = [
        "strain_microstrain",
        "vibration_g",
        "displacement_mm",
        "temperature_c",
        "humidity_percent",
        "rainfall_mm",
        "traffic_load_percent",
        "wind_speed_mps",
    ]
    X = df[feature_cols]
    # Train IsolationForest
    model = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=0.05,
        random_state=42,
    )
    model.fit(X)
    # Save model
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model trained and saved to {MODEL_PATH}")

if __name__ == "__main__":
    train_model()
