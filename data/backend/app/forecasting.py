# forecasting.py
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any

def rolling_regression_forecast(
    history: List[Dict[str, Any]], 
    horizon: int
) -> List[Dict[str, Any]]:
    """
    Fits a simple linear trend on historical data points to project risk and sensor values.
    history is a list of dicts: {'timestamp': str, 'risk_score': float, 'sensor_val': float}
    """
    n = len(history)
    if n < 3:
        return []

    # Get recent history
    x = np.arange(n)
    y_risk = np.array([pt['risk_score'] for pt in history])
    y_sensor = np.array([pt['sensor_val'] for pt in history])

    # Simple linear fit: y = slope * x + intercept
    slope_risk, intercept_risk = np.polyfit(x, y_risk, 1)
    slope_sensor, intercept_sensor = np.polyfit(x, y_sensor, 1)

    # Standard deviation of residuals to build confidence intervals
    pred_risk = slope_risk * x + intercept_risk
    pred_sensor = slope_sensor * x + intercept_sensor
    std_risk = np.std(y_risk - pred_risk) or 1.0
    std_sensor = np.std(y_sensor - pred_sensor) or 0.002

    # Forecast
    forecast = []
    try:
        last_dt = datetime.strptime(history[-1]['timestamp'], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        last_dt = datetime.utcnow()
    
    for i in range(1, horizon + 1):
        future_idx = n - 1 + i
        future_time = last_dt + timedelta(minutes=i)
        
        # Forecast values
        val_risk = slope_risk * future_idx + intercept_risk
        val_sensor = slope_sensor * future_idx + intercept_sensor
        
        # Clamping risk to 0-100
        val_risk = max(0.0, min(100.0, val_risk))
        
        # Confidence interval margins (increases with horizon)
        ci_factor = 1.0 + 0.15 * i
        risk_margin = ci_factor * std_risk
        sensor_margin = ci_factor * std_sensor

        forecast.append({
            "timestamp": future_time.strftime("%Y-%m-%d %H:%M:%S"),
            "risk_score": float(val_risk),
            "risk_lower": float(max(0.0, val_risk - risk_margin)),
            "risk_upper": float(min(100.0, val_risk + risk_margin)),
            "sensor_trend": float(val_sensor),
            "sensor_lower": float(val_sensor - sensor_margin),
            "sensor_upper": float(val_sensor + sensor_margin)
        })

    return forecast

def exponential_smoothing_forecast(
    history: List[Dict[str, Any]], 
    horizon: int, 
    alpha: float = 0.3, 
    beta: float = 0.1
) -> List[Dict[str, Any]]:
    """
    Fits double exponential smoothing (Holt's linear trend) to project values.
    """
    n = len(history)
    if n < 3:
        return []

    y_risk = [pt['risk_score'] for pt in history]
    y_sensor = [pt['sensor_val'] for pt in history]

    def double_es(series):
        level = series[0]
        trend = series[1] - series[0]
        
        for val in series:
            last_level = level
            level = alpha * val + (1 - alpha) * (level + trend)
            trend = beta * (level - last_level) + (1 - beta) * trend
            
        return level, trend

    level_risk, trend_risk = double_es(y_risk)
    level_sensor, trend_sensor = double_es(y_sensor)

    # Standard deviation of residuals for confidence bounds
    residuals_risk = []
    l_r, t_r = y_risk[0], y_risk[1] - y_risk[0]
    for idx, vr in enumerate(y_risk):
        if idx == 0: continue
        pred_r = l_r + t_r
        residuals_risk.append(vr - pred_r)
        last_l_r = l_r
        l_r = alpha * vr + (1 - alpha) * (l_r + t_r)
        t_r = beta * (l_r - last_l_r) + (1 - beta) * t_r

    std_risk = np.std(residuals_risk) if residuals_risk else 1.0
    std_sensor = 0.002 # default baseline standard deviation for vibration/displacement

    forecast = []
    try:
        last_dt = datetime.strptime(history[-1]['timestamp'], "%Y-%m-%d %H:%M:%S")
    except ValueError:
        last_dt = datetime.utcnow()
    
    for i in range(1, horizon + 1):
        future_time = last_dt + timedelta(minutes=i)
        
        # Holt's projection: y_(t+h) = level + h * trend
        val_risk = level_risk + i * trend_risk
        val_sensor = level_sensor + i * trend_sensor
        
        val_risk = max(0.0, min(100.0, val_risk))
        
        ci_factor = 1.0 + 0.15 * i
        risk_margin = ci_factor * std_risk
        sensor_margin = ci_factor * std_sensor

        forecast.append({
            "timestamp": future_time.strftime("%Y-%m-%d %H:%M:%S"),
            "risk_score": float(val_risk),
            "risk_lower": float(max(0.0, val_risk - risk_margin)),
            "risk_upper": float(min(100.0, val_risk + risk_margin)),
            "sensor_trend": float(val_sensor),
            "sensor_lower": float(val_sensor - sensor_margin),
            "sensor_upper": float(val_sensor + sensor_margin)
        })

    return forecast
