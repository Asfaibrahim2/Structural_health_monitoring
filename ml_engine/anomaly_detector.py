import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from typing import Dict, List, Tuple, Any

class HybridAnomalyDetector:
    """
    Hybrid Anomaly Detection Service for structural health monitoring.
    Combines:
    1. Statistical residual analysis (Z-score via median/MAD).
    2. Unsupervised Machine Learning (Isolation Forest on baseline residuals).
    3. Temporal persistence analysis (consecutive alarms, recovery state, and gradual trend tracking).
    """
    def __init__(self, models_dir: str = "c:/ai_xdomain/infrastructure/models", version: str = "v1.0"):
        self.models_dir = models_dir
        self.version = version
        os.makedirs(models_dir, exist_ok=True)
        
        # State variables for ML models
        self.if_models: Dict[str, IsolationForest] = {}  # bridge_id -> IsolationForest
        self.mad_params: Dict[str, Dict[str, Tuple[float, float]]] = {}  # bridge_id -> {col -> (median, MAD)}
        
        # Real-time state trackers for temporal persistence (key: bridge_id)
        self.consecutive_anomalies: Dict[str, int] = {}
        self.anomaly_start_time: Dict[str, Any] = {}
        self.anomaly_active: Dict[str, bool] = {}
        self.recovery_counter: Dict[str, int] = {}

    def fit_ml_detector(self, df_train: pd.DataFrame):
        """
        Trains one Isolation Forest model per bridge on clean normal baseline residuals.
        Saves the models and robust scaling parameters to disk.
        """
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        residual_cols = [f"{t}_residual" for t in targets]
        
        # Filter strictly to normal baseline data
        normal_train = df_train[df_train["ground_truth_anomaly"] == 0].copy()
        bridges = normal_train["bridge_id"].unique()
        
        for bridge_id in bridges:
            bridge_df = normal_train[normal_train["bridge_id"] == bridge_id].copy()
            
            # Prepare training features (residuals)
            X_train = bridge_df[residual_cols].copy()
            # Drop any NaNs during training (caused by missing data simulator)
            X_train = X_train.dropna()
            
            if len(X_train) < 50:
                print(f"Warning: Bridge {bridge_id} has too few normal records for ML training. Skipping.")
                continue
                
            # Compute Robust Scale parameters (median and MAD of residuals)
            self.mad_params[bridge_id] = {}
            for col in residual_cols:
                median = X_train[col].median()
                mad = np.median(np.abs(X_train[col] - median))
                if mad < 1e-6:
                    mad = X_train[col].std() if X_train[col].std() > 1e-6 else 1.0
                self.mad_params[bridge_id][col] = (float(median), float(mad))
                
                # Scale X_train in-place for Isolation Forest
                X_train[col] = (X_train[col] - median) / mad
                
            # Train Isolation Forest (contamination=0.01 since data is labeled normal)
            clf = IsolationForest(
                n_estimators=100, 
                contamination=0.01, 
                random_state=42, 
                n_jobs=-1
            )
            clf.fit(X_train)
            self.if_models[bridge_id] = clf
            
            # Persist model and parameters
            model_path = os.path.join(self.models_dir, f"iforest_{bridge_id}.joblib")
            params_path = os.path.join(self.models_dir, f"params_{bridge_id}.joblib")
            
            joblib.dump(clf, model_path)
            joblib.dump(self.mad_params[bridge_id], params_path)

    def load_saved_models(self):
        """
        Loads pre-trained Isolation Forest models and parameters from the models directory.
        """
        if not os.path.exists(self.models_dir):
            return
            
        for file in os.listdir(self.models_dir):
            if file.startswith("iforest_") and file.endswith(".joblib"):
                bridge_id = file.replace("iforest_", "").replace(".joblib", "")
                
                model_path = os.path.join(self.models_dir, file)
                params_path = os.path.join(self.models_dir, f"params_{bridge_id}.joblib")
                
                if os.path.exists(params_path):
                    self.if_models[bridge_id] = joblib.load(model_path)
                    self.mad_params[bridge_id] = joblib.load(params_path)

    def detect_statistical_anomalies(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calculates robust Z-score metrics of the residuals.
        Robust Z-score = |residual - median| / MAD.
        Returns statistical_score array [0, 1] and binary alert flags.
        """
        df = df.copy()
        n = len(df)
        
        stat_scores = np.zeros(n)
        stat_alerts = np.zeros(n, dtype=int)
        
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        residual_cols = [f"{t}_residual" for t in targets]
        
        for bridge_id, group in df.groupby("bridge_id"):
            indices = group.index
            
            if bridge_id not in self.mad_params:
                continue
                
            bridge_scores = []
            for col in residual_cols:
                median, mad = self.mad_params[bridge_id][col]
                res = group[col].values
                # Compute robust Z-score
                z_score = np.abs(res - median) / mad
                bridge_scores.append(z_score)
                
            # Compute average Z-score across features
            avg_z = np.mean(bridge_scores, axis=0)
            
            # Map Z-score to [0, 1] range: sigmoid-like saturation curve
            # A Z-score of 3.0 maps to ~0.5, Z-score >= 6.0 maps to ~1.0
            scores = np.clip(avg_z / 6.0, 0.0, 1.0)
            alerts = (avg_z > 3.0).astype(int)
            
            stat_scores[indices] = np.where(pd.isna(scores), 0.0, scores)
            stat_alerts[indices] = np.where(pd.isna(alerts), 0, alerts)
            
        return stat_scores, stat_alerts

    def detect_ml_anomalies(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes scores and flags from the trained Isolation Forest models.
        Returns isolation_forest_score [0, 1] and binary alerts.
        """
        df = df.copy()
        n = len(df)
        
        ml_scores = np.zeros(n)
        ml_alerts = np.zeros(n, dtype=int)
        
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        residual_cols = [f"{t}_residual" for t in targets]
        
        for bridge_id, group in df.groupby("bridge_id"):
            indices = group.index
            
            if bridge_id not in self.if_models:
                continue
                
            clf = self.if_models[bridge_id]
            mad_map = self.mad_params[bridge_id]
            
            # Prepare and scale features
            X_test = group[residual_cols].copy()
            # If NaNs exist (missing values), fill with 0.0 (baseline expectation)
            X_test = X_test.fillna(0.0)
            
            for col in residual_cols:
                median, mad = mad_map[col]
                X_test[col] = (X_test[col] - median) / mad
                
            # Decision function: lower values represent more anomalous states
            dec_func = clf.decision_function(X_test)
            preds = clf.predict(X_test) # -1 is outlier, 1 is inlier
            
            # Map decision function to [0, 1] score where 1.0 is highly anomalous
            # Isolation Forest decision_function returns values in roughly [-0.5, 0.5]
            # Normal values are > 0.0, anomalies are < 0.0.
            scores = np.clip((0.15 - dec_func) / 0.3, 0.0, 1.0)
            alerts = (preds == -1).astype(int)
            
            ml_scores[indices] = scores
            ml_alerts[indices] = alerts
            
        return ml_scores, ml_alerts

    def analyze_temporal_persistence(
        self, 
        df: pd.DataFrame, 
        stat_alerts: np.ndarray, 
        ml_alerts: np.ndarray
    ) -> Tuple[np.ndarray, List[int], List[str], List[Any], List[Any], List[int]]:
        """
        Processes alert streams sequentially to calculate temporal persistence,
        duration, recovery cycles, and diagnose anomaly structural types.
        """
        df = df.copy()
        n = len(df)
        
        persistence_scores = np.zeros(n)
        anomaly_labels = np.zeros(n, dtype=int)
        anomaly_types = ["normal"] * n
        anomaly_starts = [None] * n
        anomaly_ends = [None] * n
        durations = [0] * n
        
        # Group by bridge for temporal isolation
        for bridge_id, group in df.groupby("bridge_id"):
            indices = group.index.tolist()
            
            # Initialize state trackers
            self.consecutive_anomalies[bridge_id] = 0
            self.anomaly_start_time[bridge_id] = None
            self.anomaly_active[bridge_id] = False
            self.recovery_counter[bridge_id] = 0
            
            # Compute rolling linear trend of residuals over 30-minute window
            disp_res = group["displacement_mm_residual"].fillna(0.0).values
            strain_res_all = group["strain_microstrain_residual"].fillna(0.0).values
            rolling_slopes_disp = np.zeros(len(group))
            rolling_slopes_strain = np.zeros(len(group))
            
            # Vectorized rolling slope calculation (30 min window)
            window = 30
            for i in range(len(group)):
                if i >= window:
                    x_w = np.arange(window)
                    
                    y_w_disp = disp_res[i-window:i]
                    slope_disp = np.cov(x_w, y_w_disp)[0, 1] / np.var(x_w)
                    rolling_slopes_disp[i] = slope_disp
                    
                    y_w_strain = strain_res_all[i-window:i]
                    slope_strain = np.cov(x_w, y_w_strain)[0, 1] / np.var(x_w)
                    rolling_slopes_strain[i] = slope_strain
            
            for idx_in_group, global_idx in enumerate(indices):
                is_stat_alert = stat_alerts[global_idx] == 1
                is_ml_alert = ml_alerts[global_idx] == 1
                current_time = pd.to_datetime(group.loc[global_idx, "timestamp"])
                
                # Active alert trigger (OR gate with sensitivity)
                is_active_alert = is_stat_alert or is_ml_alert
                
                if is_active_alert:
                    self.recovery_counter[bridge_id] = 0
                    self.consecutive_anomalies[bridge_id] += 1
                    
                    if not self.anomaly_active[bridge_id]:
                        # Event trigger
                        self.anomaly_active[bridge_id] = True
                        self.anomaly_start_time[bridge_id] = current_time
                        
                    self.anomaly_active[bridge_id] = True
                else:
                    if self.anomaly_active[bridge_id]:
                        self.recovery_counter[bridge_id] += 1
                        # Recovery condition: 15 consecutive normal readings to declare resolved
                        if self.recovery_counter[bridge_id] >= 15:
                            self.anomaly_active[bridge_id] = False
                            self.consecutive_anomalies[bridge_id] = 0
                            self.anomaly_start_time[bridge_id] = None
                
                # Compute persistence metrics
                c_anom = self.consecutive_anomalies[bridge_id]
                persistence_score = min(c_anom / 30.0, 1.0) # Saturates at 30 minutes of continuous alarms
                
                # Assign outputs
                persistence_scores[global_idx] = persistence_score
                anomaly_labels[global_idx] = 1 if self.anomaly_active[bridge_id] else 0
                
                if self.anomaly_active[bridge_id]:
                    # Current duration
                    dur_min = int((current_time - self.anomaly_start_time[bridge_id]).total_seconds() / 60)
                    anomaly_starts[global_idx] = self.anomaly_start_time[bridge_id]
                    durations[global_idx] = dur_min
                    
                    # Scenario/Type Diagnostic Heuristics
                    # Read current sensor residuals
                    strain_res = group.loc[global_idx, "strain_microstrain_residual"]
                    vib_res = group.loc[global_idx, "vibration_g_residual"]
                    disp_res_val = group.loc[global_idx, "displacement_mm_residual"]
                    wind_speed = group.loc[global_idx, "wind_speed_mps"]
                    was_missing = group.loc[global_idx, "strain_microstrain_was_missing"]
                    
                    # 1. Missing Data
                    if was_missing == 1 or pd.isna(group.loc[global_idx, "strain_microstrain"]):
                        anomaly_types[global_idx] = "missing_data"
                    # 2. Sensor Dropout / Flatline
                    elif group.loc[global_idx, "vibration_g_flatline_flag"] == 1:
                        anomaly_types[global_idx] = "sensor_dropout"
                    # 3. Severe Environmental Storm
                    elif wind_speed > 20.0:
                        anomaly_types[global_idx] = "environmental_disturbance"
                    # 4. Sudden Spike
                    elif dur_min < 15 and np.abs(vib_res) > 0.4:
                        anomaly_types[global_idx] = "sudden_spike"
                    # 5. Sensor Drift / Gradual Deterioration / Persistent Step Anomaly
                    elif np.abs(rolling_slopes_disp[idx_in_group]) > 0.002 or np.abs(rolling_slopes_strain[idx_in_group]) > 0.002:
                        # Distinguish sudden step change (persistent_anomaly) from slow trends:
                        # Look at the maximum single-step rate of change in the window.
                        start_w = max(0, idx_in_group - window)
                        max_disp_roc = np.max(np.abs(group["displacement_mm_roc_1"].values[start_w:idx_in_group+1]))
                        max_strain_roc = np.max(np.abs(group["strain_microstrain_roc_1"].values[start_w:idx_in_group+1]))
                        
                        if max_disp_roc > 2.0 or max_strain_roc > 10.0:
                            anomaly_types[global_idx] = "persistent_anomaly"
                        elif "drift" in group.loc[global_idx, "scenario"] or (np.abs(rolling_slopes_strain[idx_in_group]) > 0.002 and np.abs(rolling_slopes_disp[idx_in_group]) < 0.002):
                            anomaly_types[global_idx] = "sensor_drift"
                        else:
                            anomaly_types[global_idx] = "gradual_deterioration"
                    # 6. Multi-Sensor correlation failure
                    elif np.abs(strain_res) > 20.0 and np.abs(disp_res_val) < 2.0:
                        anomaly_types[global_idx] = "multi_sensor_anomaly"
                    # 7. Persistent shift / structural displacement
                    else:
                        anomaly_types[global_idx] = "persistent_anomaly"
                else:
                    anomaly_types[global_idx] = "normal"
                    
        # Retroactively compute anomaly ends
        # If an anomaly ends, trace back the active block to mark the end timestamp
        for bridge_id, group in df.groupby("bridge_id"):
            indices = group.index.tolist()
            last_start = None
            active_block = []
            
            for idx in indices:
                label = anomaly_labels[idx]
                if label == 1:
                    active_block.append(idx)
                    last_start = anomaly_starts[idx]
                else:
                    if active_block and last_start:
                        # Block has ended. The recovery time is the end
                        end_time = pd.to_datetime(df.loc[idx, "timestamp"])
                        for b_idx in active_block:
                            anomaly_ends[b_idx] = end_time
                        active_block = []
                        last_start = None
                        
            # If still active at end of time-series
            if active_block and last_start:
                end_time = pd.to_datetime(df.loc[indices[-1], "timestamp"])
                for b_idx in active_block:
                    anomaly_ends[b_idx] = end_time
                    
        return persistence_scores, anomaly_labels.tolist(), anomaly_types, anomaly_starts, anomaly_ends, durations

    def get_contributing_sensors(self, df: pd.DataFrame, stat_alerts: np.ndarray) -> List[List[str]]:
        """
        Determines which specific sensors are contributing to the anomaly (exceeding Z-score > 2.5).
        """
        df = df.copy()
        n = len(df)
        contributions = [[] for _ in range(n)]
        
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        residual_cols = [f"{t}_residual" for t in targets]
        
        for bridge_id, group in df.groupby("bridge_id"):
            indices = group.index
            
            if bridge_id not in self.mad_params:
                continue
                
            for idx in indices:
                if stat_alerts[idx] == 0:
                    continue
                    
                for col in residual_cols:
                    median, mad = self.mad_params[bridge_id][col]
                    res = group.loc[idx, col]
                    z_score = np.abs(res - median) / mad
                    
                    if z_score > 2.5:
                        # Clean column name for presentation
                        clean_name = col.replace("_residual", "")
                        contributions[idx].append(clean_name)
                        
        return contributions

    def run_detection_pipeline(self, df_preprocessed: pd.DataFrame) -> pd.DataFrame:
        """
        Main runner pipeline. Merges stats, ML, and temporal trackers.
        """
        df = df_preprocessed.copy()
        
        # 1. Statistical Check
        stat_scores, stat_alerts = self.detect_statistical_anomalies(df)
        
        # 2. Machine Learning Check
        ml_scores, ml_alerts = self.detect_ml_anomalies(df)
        
        # 3. Temporal Tracker
        persistence_scores, anomaly_labels, anomaly_types, starts, ends, dur = self.analyze_temporal_persistence(
            df, stat_alerts, ml_alerts
        )
        
        # 4. Sensor Contributions
        contributions = self.get_contributing_sensors(df, stat_alerts)
        
        # Populate outputs
        df["statistical_score"] = stat_scores
        df["isolation_forest_score"] = ml_scores
        df["persistence_score"] = persistence_scores
        df["anomaly_label"] = anomaly_labels
        df["anomaly_type"] = anomaly_types
        df["anomaly_start"] = starts
        df["anomaly_end"] = ends
        df["duration_minutes"] = dur
        df["contributing_sensors"] = [",".join(c) if c else "none" for c in contributions]
        
        return df

def evaluate_metrics(df_results: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes performance metrics (Precision, Recall, F1, FPR, Confusion Matrix)
    comparing anomaly_label with ground_truth_anomaly.
    """
    y_true = df_results["ground_truth_anomaly"].values
    y_pred = df_results["anomaly_label"].values
    
    # Confusion Matrix
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    
    # Calculate performance per scenario type
    scenario_metrics = {}
    for scenario in df_results["scenario"].unique():
        scen_df = df_results[df_results["scenario"] == scenario]
        y_t_s = scen_df["ground_truth_anomaly"].values
        y_p_s = scen_df["anomaly_label"].values
        
        tp_s = np.sum((y_t_s == 1) & (y_p_s == 1))
        fp_s = np.sum((y_t_s == 0) & (y_p_s == 1))
        fn_s = np.sum((y_t_s == 1) & (y_p_s == 0))
        tn_s = np.sum((y_t_s == 0) & (y_p_s == 0))
        
        rec_s = tp_s / (tp_s + fn_s) if (tp_s + fn_s) > 0 else 1.0 # If no true positives are expected, recall is 1.0 if none missed
        prec_s = tp_s / (tp_s + fp_s) if (tp_s + fp_s) > 0 else 1.0
        f1_s = 2 * prec_s * rec_s / (prec_s + rec_s) if (prec_s + rec_s) > 0 else 1.0
        
        scenario_metrics[scenario] = {
            "samples": len(scen_df),
            "precision": float(prec_s),
            "recall": float(rec_s),
            "f1": float(f1_s),
            "tp": int(tp_s),
            "fp": int(fp_s),
            "fn": int(fn_s)
        }
        
    return {
        "global": {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "fpr": fpr,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "tn": tn
        },
        "scenarios": scenario_metrics
    }
