import os
import pandas as pd
from ml_engine.preprocessing import clean_telemetry_data, compute_features
from ml_engine.baseline import AdaptiveBaselineModel
from ml_engine.anomaly_detector import HybridAnomalyDetector, evaluate_metrics

def main():
    print("=== InfraShield AI ML Performance Evaluation ===")
    
    # 1. Load Data
    csv_path = "c:/ai_xdomain/infrastructure/data/raw/bridge_telemetry.csv"
    if not os.path.exists(csv_path):
        print(f"Error: Telemetry dataset not found at {csv_path}. Please run data/generate_dataset.py first.")
        return
        
    print("1. Loading raw dataset...")
    df_raw = pd.read_csv(csv_path)
    print(f"   Loaded {len(df_raw):,} rows.")
    
    # 2. Preprocess & Featurize
    print("2. Preprocessing and engineering features...")
    df_cleaned = clean_telemetry_data(df_raw)
    df_features = compute_features(df_cleaned)
    print(" Data cleaning and feature engineering complete.")
    
    # 3. Fit Adaptive Baseline
    # Training window: first 14 days (Aug 1 to Aug 14)
    train_start = "2026-08-01 00:00:00"
    train_end = "2026-08-14 23:59:00"
    print(f"3. Fitting Adaptive Baseline models on normal records inside training window ({train_start} to {train_end})...")
    baseline = AdaptiveBaselineModel(version="v1.0")
    baseline.fit(df_features, train_start=train_start, train_end=train_end)
    
    # 4. Predict expected values and calculate residuals
    print("4. Applying baseline model to compute residuals...")
    df_residuals = baseline.predict(df_features)
    
    # 5. Fit ML Anomaly Detector (Isolation Forest)
    # Trains on baseline residuals of the training window (only normal records)
    print("5. Training Isolation Forest models on clean baseline residuals...")
    detector = HybridAnomalyDetector()
    detector.fit_ml_detector(df_residuals)
    
    # 6. Run Anomaly Detection Pipeline
    print("6. Executing hybrid anomaly detection pipeline across entire dataset...")
    df_results = detector.run_detection_pipeline(df_residuals)
    
    # Save results to processed directory for future phases
    processed_dir = "c:/ai_xdomain/infrastructure/data/processed"
    os.makedirs(processed_dir, exist_ok=True)
    results_path = os.path.join(processed_dir, "processed_telemetry.csv")
    print(f"   Saving processed results to: {results_path}...")
    df_results.to_csv(results_path, index=False)
    
    # 7. Evaluate Performance
    print("7. Evaluating detector performance metrics...")
    metrics = evaluate_metrics(df_results)
    
    # Print Global Results
    g = metrics["global"]
    print("\n" + "="*60)
    print("                 GLOBAL EVALUATION REPORT")
    print("="*60)
    print(f"Precision : {g['precision']:.4f} (Ability to avoid false alarms)")
    print(f"Recall    : {g['recall']:.4f} (Ability to catch actual structural faults)")
    print(f"F1-Score  : {g['f1']:.4f} (Balanced harmonic health metric)")
    print(f"False Positive Rate (FPR): {g['fpr']*100:.2f}%")
    print("\nConfusion Matrix:")
    print(f" - True Positives  (TP) : {g['tp']:,} rows")
    print(f" - False Positives (FP) : {g['fp']:,} rows")
    print(f" - True Negatives  (TN) : {g['tn']:,} rows")
    print(f" - False Negatives (FN) : {g['fn']:,} rows")
    
    # Print Scenario-specific Results
    print("\n" + "="*60)
    print("               PER-SCENARIO EVALUATION REPORT")
    print("="*60)
    print(f"{'Scenario Name':<28} | {'Samples':<8} | {'Precision':<9} | {'Recall':<9} | {'F1-Score':<8}")
    print("-"*60)
    
    for scenario, s_m in metrics["scenarios"].items():
        print(f"{scenario:<28} | {s_m['samples']:<8,} | {s_m['precision']:<9.4f} | {s_m['recall']:<9.4f} | {s_m['f1']:<8.4f}")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
