import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any

class RiskEngine:
    """
    InfraShield AI Risk & Decision Support Engine.
    Fuses multi-sensor indicators, contextual traffic/weather data, 
    and sensor health telemetry to compute:
    1. Multi-sensor agreement (under time tolerance).
    2. Contextual analysis (traffic, rain, temp).
    3. Individual sensor health scores (0-100).
    4. Transparent risk score (0-100) and confidence score.
    5. Actionable inspection priorities (P1 to P4).
    """
    def __init__(
        self,
        weights: Dict[str, float] = None,
        thresholds: Dict[str, float] = None,
        time_tolerance_minutes: int = 10
    ):
        # Configurable weights (must sum to 1.0)
        self.weights = weights or {
            "severity": 0.25,
            "persistence": 0.20,
            "sensor_agreement": 0.20,
            "trend": 0.10,
            "asset_vulnerability": 0.10,
            "context": 0.05,
            "data_quality": 0.10
        }
        
        # Configurable priority thresholds
        self.thresholds = thresholds or {
            "P1": 80.0,
            "P2": 60.0,
            "P3": 35.0
        }
        
        # Time tolerance for sensor correlation window (in minutes)
        self.time_tolerance_minutes = time_tolerance_minutes

    def classify_context(self, row: Dict[str, Any]) -> Tuple[str, str, str, str]:
        """
        Classifies current ambient conditions and returns a safety-compliant explanation.
        """
        # Traffic
        load = row.get("traffic_load_percent", 0.0)
        if load < 30.0:
            traffic_class = "Low"
        elif load <= 70.0:
            traffic_class = "Medium"
        else:
            traffic_class = "High"
            
        # Rain
        rain = row.get("rainfall_mm", 0.0)
        if rain == 0.0:
            rain_class = "None"
        elif rain <= 0.5:
            rain_class = "Moderate"
        else:
            rain_class = "Heavy"
            
        # Temperature
        temp = row.get("temperature_c", 25.0)
        if temp < 15.0 or temp > 38.0:
            temp_class = "Elevated"
        else:
            temp_class = "Normal"
            
        # Context explanation building
        explanations = []
        is_alert = row.get("anomaly_label", 0) == 1
        vib_res = np.abs(row.get("vibration_g_residual", 0.0))
        strain_res = np.abs(row.get("strain_microstrain_residual", 0.0))
        
        if rain_class == "Heavy" and vib_res > 0.05:
            explanations.append("High vibration may be exacerbated by heavy rain splash/monsoon water levels.")
        if temp_class == "Elevated" and strain_res > 15.0:
            explanations.append("Strain deviation is heavily influenced by high thermal load.")
        if traffic_class == "High" and vib_res > 0.05:
            explanations.append("High vibration is correlated with heavy traffic flow.")
            
        if not explanations:
            explanations.append("Ambient weather and traffic parameters fall within standard operational bounds.")
            
        # CRITICAL SAFETY RULE: Never dismiss a structural anomaly only because weather is present!
        if is_alert:
            explanations.append("Caution: Active structural alerts detected. Do not dismiss anomalies solely based on ambient environmental conditions.")
            
        explanation_str = " | ".join(explanations)
        return traffic_class, rain_class, temp_class, explanation_str

    def compute_sensor_health(
        self, 
        df_bridge: pd.DataFrame
    ) -> Tuple[Dict[str, np.ndarray], np.ndarray, np.ndarray]:
        """
        Computes rolling sensor health metrics over a sliding window:
        - Missing-data ratio (last 60 mins)
        - Flatline detection (rolling standard deviation == 0.0)
        - Noise surge (rolling std exceeds threshold)
        - Drift score (linear slope)
        
        Returns:
          health_scores_dict: sensor -> health_score_array (0-100)
          overall_data_quality: array (0-100) representing aggregate health
          confidence: array (0-100) representing baseline prediction confidence
        """
        n = len(df_bridge)
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        
        # Output structures
        health_scores = {t: np.ones(n) * 100.0 for t in targets}
        data_quality = np.ones(n) * 100.0
        confidence = np.ones(n) * 100.0
        
        # 1. Gather rolling characteristics (60 steps = 60 minutes)
        window_size = 60
        
        for t in targets:
            was_missing = df_bridge[f"{t}_was_missing"].values
            flatline = df_bridge[f"{t}_flatline_flag"].values
            
            # Noise detector
            roll_std_15 = df_bridge[f"{t}_roll_std_15"].values
            # Define baseline normal noise threshold: Older/vulnerable assets have higher variance
            # If standard deviation exceeds 6x standard, flag noise anomaly
            normal_std = max(float(df_bridge[f"{t}_roll_std_15"].head(100).median()), 0.001)
            noise_flag = (roll_std_15 > (6.0 * normal_std)).astype(int)
            
            # Drift flag
            roll_slope_strain = df_bridge["strain_microstrain_residual"].diff().rolling(window=30, min_periods=1).mean().fillna(0.0).values
            roll_slope_disp = df_bridge["displacement_mm_residual"].diff().rolling(window=30, min_periods=1).mean().fillna(0.0).values
            
            if t == "strain_microstrain":
                drift_score = np.clip(np.abs(roll_slope_strain) * 100.0, 0.0, 1.0)
            elif t == "displacement_mm":
                drift_score = np.clip(np.abs(roll_slope_disp) * 100.0, 0.0, 1.0)
            else:
                drift_score = np.zeros(n)
                
            # Missing data ratio (rolling 60 minutes)
            roll_missing = pd.Series(was_missing).rolling(window=window_size, min_periods=1).mean().values
            
            # Calculate health score per sensor
            # Penalty weights: missing=50, flatline=30, noise=20, drift=20
            penalty = (50.0 * roll_missing) + (30.0 * flatline) + (20.0 * noise_flag) + (20.0 * drift_score)
            h_score = np.clip(100.0 - penalty, 0.0, 100.0)
            health_scores[t] = h_score
            
        # Aggregate overall data quality: average of the individual sensor health scores
        data_quality = np.mean([health_scores[t] for t in targets], axis=0)
        
        # Confidence score decreases as sensors become unhealthy, missing, or show high drift
        # Confidence is 100% when data quality is 100% and decreases as data quality degrades
        confidence = data_quality.copy()
        
        return health_scores, data_quality, confidence

    def compute_risk(self, df: pd.DataFrame, meta: Dict) -> pd.DataFrame:
        """
        Processes preprocessed & anomaly-detected bridge dataframe to add:
        - Sensor agreement (within time tolerance)
        - Context classes and explanations
        - Sensor health scores (0-100)
        - Transparent risk score (0-100), uncertainty, and confidence
        - Actionable P1-P4 inspection priority flags
        """
        df = df.copy()
        n = len(df)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values(by="timestamp").reset_index(drop=True)
        
        # 1. Compute Sensor Health, Data Quality, and Prediction Confidence
        health_scores, data_quality, confidence = self.compute_sensor_health(df)
        
        for t in ["strain_microstrain", "vibration_g", "displacement_mm"]:
            df[f"{t}_health_score"] = health_scores[t]
        df["data_quality_score"] = data_quality
        df["confidence_score"] = confidence
        df["uncertainty"] = 100.0 - confidence
        
        # 2. Compute Sensor Agreement within time tolerance (consecutive alerts check)
        # For each sensor, record the last index it flagged an alert (Z-score > 2.5)
        last_alert_idx = {
            "strain_microstrain": -999,
            "vibration_g": -999,
            "displacement_mm": -999
        }
        
        agreement_scores = np.zeros(n)
        
        targets = ["strain_microstrain", "vibration_g", "displacement_mm"]
        
        for i in range(n):
            for t in targets:
                # Retrieve precomputed normalized residual, which is already a Z-score
                norm_res = df.loc[i, f"{t}_normalized_residual"]
                z_score = np.abs(norm_res) if not pd.isna(norm_res) else 0.0
                
                # Active alert condition (Z-score > 2.5)
                is_deviating = z_score > 2.5
                if is_deviating:
                    last_alert_idx[t] = i
                    
            # Check which sensors have deviating windows within the time tolerance limit (e.g. 10 minutes)
            active_sensors = 0
            for t in targets:
                idx_diff = i - last_alert_idx[t]
                # 10 minutes time tolerance
                if idx_diff <= self.time_tolerance_minutes:
                    active_sensors += 1
                    
            # Agreement score: 1.0 (100) if all 3 aligned, 0.67 if 2, 0.33 if 1, 0 if none
            agreement_scores[i] = (active_sensors / 3.0) * 100.0
            
        df["sensor_agreement_score"] = agreement_scores
        
        # 3. Compile Risk Score components
        # A. Severity Score (0-100): magnitude of highest normalized residual
        res_cols = [f"{t}_normalized_residual" for t in targets]
        max_norm_res = df[res_cols].abs().max(axis=1).fillna(0.0).values
        # Scale: Z-score of 6.0 represents 100% severity
        severity_scores = np.clip((max_norm_res / 6.0) * 100.0, 0.0, 100.0)
        df["severity_score"] = severity_scores
        
        # B. Persistence Score (0-100)
        # Retrieve precomputed persistence_score [0,1] from Stage C and scale to 100
        df["persistence_score_val"] = df["persistence_score"] * 100.0
        
        # C. Trend Score (0-100)
        # Based on rolling slopes of residuals (either strain or displacement)
        slope_disp = df["displacement_mm_residual"].diff().rolling(window=30, min_periods=1).mean().fillna(0.0).abs().values
        slope_strain = df["strain_microstrain_residual"].diff().rolling(window=30, min_periods=1).mean().fillna(0.0).abs().values
        max_slope = np.maximum(slope_disp * 10.0, slope_strain * 0.5) # Scale to match bounds
        trend_scores = np.clip(max_slope * 100.0, 0.0, 100.0)
        df["trend_score"] = trend_scores
        
        # D. Asset Vulnerability (0-100)
        vuln_factor = meta.get("vulnerability_factor", 0.5)
        asset_vulnerability_scores = np.ones(n) * (vuln_factor * 100.0)
        df["asset_vulnerability_score"] = asset_vulnerability_scores
        
        # E. Context Score (0-100)
        # Increases when heavy load (traffic > 80%) or severe wind (> 20 m/s) is present
        wind_speeds = df["wind_speed_mps"].values
        traffic_loads = df["traffic_load_percent"].values
        context_scores = np.clip((wind_speeds / 25.0) * 50.0 + (traffic_loads / 100.0) * 50.0, 0.0, 100.0)
        df["context_score"] = context_scores
        
        # 4. Apply Transparent Risk Formula
        # risk_score = 0.25*severity + 0.20*persistence + 0.20*agreement + 0.10*trend + 0.10*vuln + 0.05*context + 0.10*data_quality
        w = self.weights
        risk_scores = (
            w["severity"] * df["severity_score"] +
            w["persistence"] * df["persistence_score_val"] +
            w["sensor_agreement"] * df["sensor_agreement_score"] +
            w["trend"] * df["trend_score"] +
            w["asset_vulnerability"] * df["asset_vulnerability_score"] +
            w["context"] * df["context_score"] +
            w["data_quality"] * df["data_quality_score"]
        )
        # Clamp to 0-100
        df["risk_score"] = np.clip(risk_scores, 0.0, 100.0)
        
        # 5. Classify Priorities
        # P1: risk >= 80, P2: 60-79, P3: 35-59, P4: <35
        priorities = []
        for risk in df["risk_score"]:
            if risk >= self.thresholds["P1"]:
                priorities.append("P1")
            elif risk >= self.thresholds["P2"]:
                priorities.append("P2")
            elif risk >= self.thresholds["P3"]:
                priorities.append("P3")
            else:
                priorities.append("P4")
        df["inspection_priority"] = priorities
        
        # 6. Context descriptions and explanations
        traffic_classes = []
        rain_classes = []
        temp_classes = []
        explanations = []
        risk_explanations = []
        
        for i in range(n):
            row_dict = df.iloc[i].to_dict()
            t_c, r_c, tm_c, expl = self.classify_context(row_dict)
            traffic_classes.append(t_c)
            rain_classes.append(r_c)
            temp_classes.append(tm_c)
            explanations.append(expl)
            
            # Risk explanation formula breakdown
            risk_expl = (
                f"Risk: {df.loc[i, 'risk_score']:.1f} ({df.loc[i, 'inspection_priority']}). "
                f"Breakdown: Severity: {w['severity']*df.loc[i, 'severity_score']:.1f}, "
                f"Persistence: {w['persistence']*df.loc[i, 'persistence_score_val']:.1f}, "
                f"Agreement: {w['sensor_agreement']*df.loc[i, 'sensor_agreement_score']:.1f}, "
                f"Trend: {w['trend']*df.loc[i, 'trend_score']:.1f}, "
                f"Vulnerability: {w['asset_vulnerability']*df.loc[i, 'asset_vulnerability_score']:.1f}, "
                f"Context: {w['context']*df.loc[i, 'context_score']:.1f}, "
                f"Data Quality: {w['data_quality']*df.loc[i, 'data_quality_score']:.1f}. "
                f"Confidence: {df.loc[i, 'confidence_score']:.1f}% (Uncertainty: ±{df.loc[i, 'uncertainty']:.1f}%)."
            )
            risk_explanations.append(risk_expl)
            
        df["traffic_load_context"] = traffic_classes
        df["rainfall_context"] = rain_classes
        df["temperature_context"] = temp_classes
        df["context_explanation"] = explanations
        df["risk_explanation"] = risk_explanations
        
        # Drop temporary persistence score val
        df = df.drop(columns=["persistence_score_val"])
        
        return df
