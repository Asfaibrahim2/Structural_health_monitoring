import numpy as np
import pandas as pd
from typing import Dict, List, Tuple

# Vectorized simulation configuration
START_DATE = "2026-08-01 00:00:00"
END_DATE = "2026-08-30 23:59:00"
FREQ = "min"

# List of 20 realistic Telangana infrastructure projects with baseline behaviors
BRIDGES_METADATA = [
    {
        "bridge_id": "TS-STR-001",
        "bridge_name": "Durgam Cheruvu Cable Bridge",
        "structure_type": "Cable-stayed Bridge",
        "construction_year": 2020,
        "span_length_m": 233.8,
        "vulnerability_factor": 0.15,
        "sensor_count": 8,
        "base_strain": 45.0,
        "base_vibration": 0.012,
        "base_displacement": 15.0,
        "temp_coeff_strain": -1.5,     # Microstrain change per degree C above 25C
        "traffic_coeff_strain": 20.0,
        "traffic_coeff_disp": -12.0,    # Sag under load (negative displacement)
        "wind_coeff_vibration": 0.002,
        "scenario_type": "gradual_deterioration" # Force P1/P2
    },
    {
        "bridge_id": "TS-STR-002",
        "bridge_name": "Naya Pul (Musi River)",
        "structure_type": "Heritage Arch Bridge",
        "construction_year": 1593,
        "span_length_m": 80.0,
        "vulnerability_factor": 0.78,
        "sensor_count": 6,
        "base_strain": 110.0,
        "base_vibration": 0.005,
        "base_displacement": 2.5,
        "temp_coeff_strain": -0.6,
        "traffic_coeff_strain": 4.0,     # Light pedestrian and light vehicle traffic
        "traffic_coeff_disp": -0.5,
        "wind_coeff_vibration": 0.0005,
        "scenario_type": "gradual_deterioration"  # Heritage wear monitoring
    },
    {
        "bridge_id": "TS-STR-003",
        "bridge_name": "Purana Pul Musi Arch",
        "structure_type": "Heritage Arch Bridge",
        "construction_year": 1578,
        "span_length_m": 120.0,
        "vulnerability_factor": 0.85,
        "sensor_count": 6,
        "base_strain": 135.0,
        "base_vibration": 0.004,
        "base_displacement": 3.0,
        "temp_coeff_strain": -0.5,
        "traffic_coeff_strain": 2.0,     # Pedestrians only
        "traffic_coeff_disp": -0.2,
        "wind_coeff_vibration": 0.0004,
        "scenario_type": "persistent_anomaly"  # Mimic structural settlement
    },
    {
        "bridge_id": "TS-STR-004",
        "bridge_name": "Chaderghat Concrete Bridge",
        "structure_type": "Concrete Girder Bridge",
        "construction_year": 1968,
        "span_length_m": 95.0,
        "vulnerability_factor": 0.55,
        "sensor_count": 6,
        "base_strain": 85.0,
        "base_vibration": 0.022,
        "base_displacement": 8.0,
        "temp_coeff_strain": -2.2,
        "traffic_coeff_strain": 35.0,
        "traffic_coeff_disp": -6.0,
        "wind_coeff_vibration": 0.001,
        "scenario_type": "sudden_spike"
    },
    {
        "bridge_id": "TS-STR-005",
        "bridge_name": "Gachibowli Flyover",
        "structure_type": "Concrete Flyover",
        "construction_year": 2003,
        "span_length_m": 45.0,
        "vulnerability_factor": 0.35,
        "sensor_count": 6,
        "base_strain": 60.0,
        "base_vibration": 0.028,
        "base_displacement": 4.0,
        "temp_coeff_strain": -1.2,
        "traffic_coeff_strain": 25.0,
        "traffic_coeff_disp": -3.0,
        "wind_coeff_vibration": 0.0015,
        "scenario_type": "sudden_spike"  # Heavy truck impact or braking event
    },
    {
        "bridge_id": "TS-STR-006",
        "bridge_name": "PVNR Expressway Elevated Section",
        "structure_type": "Elevated Segmental Corridor",
        "construction_year": 2009,
        "span_length_m": 35.0,
        "vulnerability_factor": 0.25,
        "sensor_count": 6,
        "base_strain": 55.0,
        "base_vibration": 0.025,
        "base_displacement": 3.5,
        "temp_coeff_strain": -1.0,
        "traffic_coeff_strain": 22.0,
        "traffic_coeff_disp": -2.5,
        "wind_coeff_vibration": 0.001,
        "scenario_type": "persistent_anomaly"
    },
    {
        "bridge_id": "TS-STR-007",
        "bridge_name": "Ameerpet Metro Viaduct",
        "structure_type": "Metro Viaduct",
        "construction_year": 2017,
        "span_length_m": 30.0,
        "vulnerability_factor": 0.18,
        "sensor_count": 6,
        "base_strain": 40.0,
        "base_vibration": 0.035,        # High vibration frequency from trains
        "base_displacement": 2.0,
        "temp_coeff_strain": -0.8,
        "traffic_coeff_strain": 18.0,
        "traffic_coeff_disp": -1.8,
        "wind_coeff_vibration": 0.0008,
        "scenario_type": "noisy_sensor"  # Accelerometer loose coupling
    },
    {
        "bridge_id": "TS-STR-008",
        "bridge_name": "Gachibowli Metro Viaduct",
        "structure_type": "Metro Viaduct",
        "construction_year": 2018,
        "span_length_m": 30.0,
        "vulnerability_factor": 0.18,
        "sensor_count": 6,
        "base_strain": 40.0,
        "base_vibration": 0.034,
        "base_displacement": 2.0,
        "temp_coeff_strain": -0.8,
        "traffic_coeff_strain": 18.0,
        "traffic_coeff_disp": -1.8,
        "wind_coeff_vibration": 0.0008,
        "scenario_type": "sensor_drift"  # Strain gauge thermal drift
    },
    {
        "bridge_id": "TS-STR-009",
        "bridge_name": "Bapu Ghat Steel Girder Bridge",
        "structure_type": "Steel Truss Bridge",
        "construction_year": 2002,
        "span_length_m": 110.0,
        "vulnerability_factor": 0.40,
        "sensor_count": 8,
        "base_strain": 95.0,
        "base_vibration": 0.032,        # Steel is more vibrant
        "base_displacement": 14.0,
        "temp_coeff_strain": -3.5,     # High thermal expansion of steel
        "traffic_coeff_strain": 45.0,
        "traffic_coeff_disp": -16.0,
        "wind_coeff_vibration": 0.003,
        "scenario_type": "sensor_dropout" # Strain gauge communication failure
    },
    {
        "bridge_id": "TS-STR-010",
        "bridge_name": "Karimnagar Cable Bridge",
        "structure_type": "Cable-stayed Bridge",
        "construction_year": 2023,
        "span_length_m": 220.0,
        "vulnerability_factor": 0.12,
        "sensor_count": 8,
        "base_strain": 42.0,
        "base_vibration": 0.011,
        "base_displacement": 13.5,
        "temp_coeff_strain": -1.4,
        "traffic_coeff_strain": 19.0,
        "traffic_coeff_disp": -11.0,
        "wind_coeff_vibration": 0.002,
        "scenario_type": "missing_values" # Packet drops in remote area
    },
    {
        "bridge_id": "TS-STR-011",
        "bridge_name": "Bhadrachalam Godavari Bridge",
        "structure_type": "Prestressed Concrete Bridge",
        "construction_year": 1965,
        "span_length_m": 120.0,
        "vulnerability_factor": 0.58,
        "sensor_count": 8,
        "base_strain": 90.0,
        "base_vibration": 0.018,
        "base_displacement": 10.0,
        "temp_coeff_strain": -2.0,
        "traffic_coeff_strain": 38.0,
        "traffic_coeff_disp": -7.5,
        "wind_coeff_vibration": 0.0012,
        "scenario_type": "multi_sensor_anomaly" # Expansion joint lock + strain spike
    },
    {
        "bridge_id": "TS-STR-012",
        "bridge_name": "Ramagundam Flyover",
        "structure_type": "Concrete Flyover",
        "construction_year": 2012,
        "span_length_m": 50.0,
        "vulnerability_factor": 0.28,
        "sensor_count": 6,
        "base_strain": 62.0,
        "base_vibration": 0.026,
        "base_displacement": 4.5,
        "temp_coeff_strain": -1.2,
        "traffic_coeff_strain": 28.0,
        "traffic_coeff_disp": -3.5,
        "wind_coeff_vibration": 0.0014,
        "scenario_type": "multi_sensor_anomaly"
    },
    {
        "bridge_id": "TS-STR-013",
        "bridge_name": "Wadapally Krishna Bridge",
        "structure_type": "Balanced Cantilever Bridge",
        "construction_year": 1994,
        "span_length_m": 150.0,
        "vulnerability_factor": 0.42,
        "sensor_count": 8,
        "base_strain": 80.0,
        "base_vibration": 0.016,
        "base_displacement": 12.0,
        "temp_coeff_strain": -1.6,
        "traffic_coeff_strain": 30.0,
        "traffic_coeff_disp": -9.0,
        "wind_coeff_vibration": 0.0018,
        "scenario_type": "environmental_disturbance" # Severe local thunderstorm
    },
    {
        "bridge_id": "TS-STR-014",
        "bridge_name": "Charminar South Arch Monitor",
        "structure_type": "Heritage Arch Structure",
        "construction_year": 1591,
        "span_length_m": 10.0,
        "vulnerability_factor": 0.88,
        "sensor_count": 4,
        "base_strain": 140.0,
        "base_vibration": 0.003,        # Very low vibration normally
        "base_displacement": 1.2,
        "temp_coeff_strain": -0.4,
        "traffic_coeff_strain": 1.5,     # Pedestrians / crowds
        "traffic_coeff_disp": -0.1,
        "wind_coeff_vibration": 0.0002,
        "scenario_type": "sensor_drift"
    },
    {
        "bridge_id": "TS-STR-015",
        "bridge_name": "Golconda Watchtower Structure",
        "structure_type": "Heritage Stone Structure",
        "construction_year": 1518,
        "span_length_m": 8.0,
        "vulnerability_factor": 0.90,
        "sensor_count": 4,
        "base_strain": 150.0,
        "base_vibration": 0.002,
        "base_displacement": 0.8,
        "temp_coeff_strain": -0.3,
        "traffic_coeff_strain": 0.5,
        "traffic_coeff_disp": -0.05,
        "wind_coeff_vibration": 0.0003,
        "scenario_type": "missing_values"
    },
    {
        "bridge_id": "TS-STR-016",
        "bridge_name": "Miyapur Metro Pillar 42",
        "structure_type": "Metro Column",
        "construction_year": 2016,
        "span_length_m": 0.0,             # Column, no span
        "vulnerability_factor": 0.16,
        "sensor_count": 4,
        "base_strain": 30.0,
        "base_vibration": 0.020,
        "base_displacement": 0.5,         # Settlement/tilt monitoring
        "temp_coeff_strain": -0.5,
        "traffic_coeff_strain": 12.0,     # Load from overhead trains
        "traffic_coeff_disp": -0.05,
        "wind_coeff_vibration": 0.0004,
        "scenario_type": "normal"
    },
    {
        "bridge_id": "TS-STR-017",
        "bridge_name": "Kakatiya Canal Aqueduct",
        "structure_type": "Water Aqueduct",
        "construction_year": 1985,
        "span_length_m": 25.0,
        "vulnerability_factor": 0.45,
        "sensor_count": 6,
        "base_strain": 75.0,
        "base_vibration": 0.010,        # Continuous water flow vibration
        "base_displacement": 3.0,
        "temp_coeff_strain": -1.1,
        "traffic_coeff_strain": 20.0,     # Water load varies with canal level
        "traffic_coeff_disp": -1.5,
        "wind_coeff_vibration": 0.0005,
        "scenario_type": "gradual_deterioration" # Concrete leaching / micro-cracking
    },
    {
        "bridge_id": "TS-STR-018",
        "bridge_name": "Hussain Sagar Lake Spillway",
        "structure_type": "Masonry Spillway",
        "construction_year": 1563,
        "span_length_m": 40.0,
        "vulnerability_factor": 0.80,
        "sensor_count": 6,
        "base_strain": 125.0,
        "base_vibration": 0.018,        # Water flow turbulence
        "base_displacement": 1.5,
        "temp_coeff_strain": -0.5,
        "traffic_coeff_strain": 5.0,     # Gates opening / water load
        "traffic_coeff_disp": -0.2,
        "wind_coeff_vibration": 0.0008,
        "scenario_type": "normal"
    },
    {
        "bridge_id": "TS-STR-019",
        "bridge_name": "NS Left Canal Aqueduct",
        "structure_type": "Water Aqueduct",
        "construction_year": 1967,
        "span_length_m": 28.0,
        "vulnerability_factor": 0.52,
        "sensor_count": 6,
        "base_strain": 88.0,
        "base_vibration": 0.012,
        "base_displacement": 3.2,
        "temp_coeff_strain": -1.2,
        "traffic_coeff_strain": 22.0,
        "traffic_coeff_disp": -1.8,
        "wind_coeff_vibration": 0.0006,
        "scenario_type": "normal"
    },
    {
        "bridge_id": "TS-STR-020",
        "bridge_name": "Kaleshwaram Forebay Wall",
        "structure_type": "Concrete Forebay",
        "construction_year": 2019,
        "span_length_m": 0.0,             # Wall structure
        "vulnerability_factor": 0.20,
        "sensor_count": 6,
        "base_strain": 50.0,
        "base_vibration": 0.015,        # Vibration from massive lift pumps
        "base_displacement": 0.8,
        "temp_coeff_strain": -0.9,
        "traffic_coeff_strain": 30.0,     # Hydrostatic pressure variations
        "traffic_coeff_disp": -0.3,
        "wind_coeff_vibration": 0.0005,
        "scenario_type": "persistent_anomaly" # High pump hydraulic pressure surcharge
    }
]

# Assign zones (P1-P4) to bridges with the required distribution
# All bridges default to 'P4' (critical). Ensure 2-3 bridges in P1, P2, P3.
import random
random.seed(42)
# Create a shuffled list of bridge indices
bridge_indices = list(range(len(BRIDGES_METADATA)))
random.shuffle(bridge_indices)
# Define zone allocation counts
zone_counts = {
    "P1": 3,  # gradual_deterioration
    "P2": 3,  # persistent_anomaly
    "P3": 3,  # sudden_spike
    "P4": len(BRIDGES_METADATA) - 9,  # remaining bridges
}
zone_iter = []
for zone, count in zone_counts.items():
    zone_iter.extend([zone] * count)
# Assign zones and corresponding scenario_type
for idx, zone in zip(bridge_indices, zone_iter):
    BRIDGES_METADATA[idx]["zone"] = zone
    # Map zone to a default scenario_type for synthetic data
    zone_to_scenario = {
        "P1": "gradual_deterioration",
        "P2": "persistent_anomaly",
        "P3": "sudden_spike",
        "P4": "missing_values",
    }
    BRIDGES_METADATA[idx]["scenario_type"] = zone_to_scenario[zone]
# Optional: expose a helper to get zone for a bridge
def get_bridge_zone(bridge_id: str) -> str:
    for meta in BRIDGES_METADATA:
        if meta["bridge_id"] == bridge_id:
            return meta.get("zone", "P4")
    return "P4"

def get_telangana_weather(timestamps: pd.DatetimeIndex, random_seed: int = 42) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generates 30 days of weather readings mapped to Telangana's climatic conditions in August.
    August is in the southwest monsoon season. 
    Weather: High humidity, high rainfall probability, temperatures ranging 22°C to 34°C, occasional strong winds.
    """
    np.random.seed(random_seed)
    n = len(timestamps)
    
    # Hours & Days for cyclic modeling - converted to numpy arrays
    t_hour = timestamps.hour.values
    t_minute = timestamps.minute.values
    hours = t_hour + t_minute / 60.0
    days = timestamps.day.values
    
    # Temperature: Diurnal cycle peaking around 2:30 PM (14.5 hours), min around 5:30 AM (5.5 hours)
    temp_base = 28.0
    temp_diurnal = 5.0 * np.sin(2 * np.pi * (hours - 8.5) / 24.0)
    
    # Weather systems: add warm spells or rainy cooling periods
    temp_system = np.zeros(n)
    # Rainy system: Day 12 to 14 (lowers temp by 4.5 degrees)
    temp_system[(days >= 12) & (days <= 14)] -= 4.5
    # Rainy system: Day 22 to 24 (lowers temp by 3.5 degrees)
    temp_system[(days >= 22) & (days <= 24)] -= 3.5
    
    temp_noise = np.random.normal(0, 0.4, n)
    temperature = temp_base + temp_diurnal + temp_system + temp_noise
    
    # Humidity: Inversely proportional to temperature, higher during monsoon (range 40% to 99%)
    humidity_base = 78.0
    humidity_diurnal = -12.0 * np.sin(2 * np.pi * (hours - 8.5) / 24.0)
    humidity_system = np.zeros(n)
    humidity_system[(days >= 12) & (days <= 14)] += 15.0
    humidity_system[(days >= 22) & (days <= 24)] += 12.0
    
    humidity_noise = np.random.normal(0, 2.0, n)
    humidity = humidity_base + humidity_diurnal + humidity_system + humidity_noise
    humidity = np.clip(humidity, 40.0, 99.0)
    
    # Wind Speed: Diurnal wind patterns + storm spikes. Mean: 2.2 m/s.
    wind_base = 2.2
    wind_diurnal = 1.0 * np.sin(2 * np.pi * (hours - 12.0) / 24.0)
    wind_storm = np.zeros(n)
    
    # Storm on Day 12 evening (16:00 to 22:00)
    storm_mask1 = (days == 12) & (t_hour >= 16) & (t_hour <= 22)
    wind_storm[storm_mask1] += np.random.gamma(shape=5, scale=3, size=np.sum(storm_mask1))
    
    # Storm on Day 23 afternoon
    storm_mask2 = (days == 23) & (t_hour >= 13) & (t_hour <= 18)
    wind_storm[storm_mask2] += np.random.gamma(shape=4, scale=2.5, size=np.sum(storm_mask2))
    
    wind_noise = np.abs(np.random.normal(0, 0.6, n))
    wind_speed = wind_base + wind_diurnal + wind_storm + wind_noise
    wind_speed = np.clip(wind_speed, 0.1, 45.0)
    
    # Rainfall (mm/min): Mostly 0, but monsoon rain events
    rainfall = np.zeros(n)
    
    # Event 1: Scattered showers on Day 5 afternoon (15:00 - 17:00)
    mask_day5 = (days == 5) & (t_hour >= 15) & (t_hour < 17)
    rainfall[mask_day5] = np.random.exponential(scale=0.15, size=np.sum(mask_day5))
    
    # Event 2: Persistent monsoon rain on Day 12 (06:00) to Day 14 (12:00)
    mask_monsoon1 = ((days == 12) & (t_hour >= 6)) | (days == 13) | ((days == 14) & (t_hour < 12))
    rain_p = np.random.uniform(0, 1, np.sum(mask_monsoon1))
    rain_vals = np.zeros(np.sum(mask_monsoon1))
    active_rain = rain_p > 0.6
    rain_vals[active_rain] = np.random.exponential(scale=0.25, size=np.sum(active_rain))
    heavy_spells = (rain_p > 0.95)
    rain_vals[heavy_spells] += np.random.uniform(0.5, 1.5, np.sum(heavy_spells))
    rainfall[mask_monsoon1] = rain_vals
    
    # Event 3: Evening storm on Day 22 (19:00 - 23:00)
    mask_day22 = (days == 22) & (t_hour >= 19) & (t_hour < 23)
    rainfall[mask_day22] = np.random.exponential(scale=0.4, size=np.sum(mask_day22))
    
    # Event 4: Scattered showers on Day 23 & 24
    mask_day23_24 = ((days == 23) & (t_hour >= 12)) | ((days == 24) & (t_hour < 18))
    rain_p2 = np.random.uniform(0, 1, np.sum(mask_day23_24))
    rain_vals2 = np.zeros(np.sum(mask_day23_24))
    rain_vals2[rain_p2 > 0.75] = np.random.exponential(scale=0.1, size=np.sum(rain_p2 > 0.75))
    rainfall[mask_day23_24] = rain_vals2

    return temperature, humidity, wind_speed, rainfall


def get_traffic_load(timestamps: pd.DatetimeIndex, structure_type: str, random_seed: int = 42) -> np.ndarray:
    """
    Simulates traffic load percentages (0-100%) incorporating:
    - Weekly pattern (higher weekdays, lower weekends)
    - Diurnal pattern (two peak commute periods for vehicles/metro)
    - Night cargo transport (freight peaks)
    - Structural behavior differences
    """
    np.random.seed(random_seed + 1)
    n = len(timestamps)
    
    t_hour = timestamps.hour.values
    t_minute = timestamps.minute.values
    hours = t_hour + t_minute / 60.0
    day_of_week = timestamps.dayofweek.values
    days = timestamps.day.values
    
    traffic = np.zeros(n)
    
    if structure_type in ["Cable-stayed Bridge", "Concrete Girder Bridge", "Concrete Flyover", "Elevated Segmental Corridor", "Steel Truss Bridge"]:
        peak1 = np.exp(-((hours - 9.0)/1.2)**2)
        peak2 = np.exp(-((hours - 18.5)/1.5)**2)
        midday = 0.4 * np.exp(-((hours - 13.5)/2.5)**2)
        night_freight = 0.15 * np.exp(-((hours - 2.0)/1.5)**2)
        
        diurnal = 0.85 * (peak1 + peak2) + midday + night_freight
        diurnal = np.clip(diurnal, 0.05, 0.95)
        
        weekend_mask = day_of_week >= 5
        weekday_mask = ~weekend_mask
        
        traffic[weekday_mask] = diurnal[weekday_mask] * 100.0
        weekend_diurnal = 0.6 * np.exp(-((hours - 14.0)/4.0)**2) + 0.1
        traffic[weekend_mask] = weekend_diurnal[weekend_mask] * 100.0
        
        traffic += np.random.normal(0, 3.5, n)
        
    elif structure_type in ["Metro Viaduct", "Metro Column"]:
        minutes = t_minute
        active_hours_mask = (t_hour >= 6) & (t_hour < 23)
        peak_hours_mask = active_hours_mask & (((t_hour >= 8) & (t_hour < 11)) | ((t_hour >= 17) & (t_hour < 21)))
        
        train_crossing = np.zeros(n)
        train_crossing[peak_hours_mask & (minutes % 5 == 0)] = 85.0
        train_crossing[peak_hours_mask & (minutes % 5 == 1)] = 45.0
        
        off_peak_mask = active_hours_mask & (~peak_hours_mask)
        train_crossing[off_peak_mask & (minutes % 10 == 0)] = 80.0
        train_crossing[off_peak_mask & (minutes % 10 == 1)] = 40.0
        
        maintenance_mask = (t_hour == 2) & (minutes == 30)
        train_crossing[maintenance_mask] = 50.0
        
        traffic = train_crossing
        traffic += np.random.normal(0, 1.0, n)
        
    elif structure_type in ["Heritage Arch Bridge", "Heritage Arch Structure", "Heritage Stone Structure"]:
        crowd_curve = 0.45 * np.exp(-((hours - 18.0)/3.5)**2) + 0.05
        weekend_mask = day_of_week >= 5
        weekday_mask = ~weekend_mask
        
        traffic[weekday_mask] = crowd_curve[weekday_mask] * 100.0
        traffic[weekend_mask] = crowd_curve[weekend_mask] * 180.0
        
        traffic += np.random.normal(0, 2.5, n)
        
    elif structure_type in ["Water Aqueduct", "Concrete Forebay", "Masonry Spillway"]:
        water_base = 75.0
        days_fraction = days + t_hour / 24.0
        water_trend = 10.0 * np.sin(2 * np.pi * (days_fraction - 1.0) / 60.0)
        
        traffic = water_base + water_trend
        
        # Correlate with rain days (day 12-14 and 22-24)
        rain_smooth = pd.Series(timestamps).dt.day.map(lambda d: 1.0 if d in [12, 13, 14, 22, 23, 24] else 0.0).values
        traffic += rain_smooth * 12.0
        traffic += np.random.normal(0, 0.5, n)
        
    traffic = np.clip(traffic, 0.0, 100.0)
    return traffic


def generate_baseline_telemetry(
    meta: Dict, 
    temp: np.ndarray, 
    traffic: np.ndarray, 
    wind: np.ndarray, 
    rain: np.ndarray, 
    random_seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Generates normal, healthy structural response telemetry based on baseline physics:
    - Temperature-related strain changes (thermal expansion)
    - Traffic-related strain and displacement (bending)
    - Rainfall and traffic induced vibration
    - Gaussian noise and offsets
    """
    np.random.seed(random_seed + 2)
    n = len(temp)
    
    # 1. Temperature-related strain (microstrain)
    temp_delta = temp - 25.0
    strain_thermal = meta["temp_coeff_strain"] * temp_delta
    strain_traffic = meta["traffic_coeff_strain"] * (traffic / 100.0)
    
    noise_strain_std = 1.0 + 3.0 * meta["vulnerability_factor"]
    strain_noise = np.random.normal(0, noise_strain_std, n)
    
    strain = meta["base_strain"] + strain_thermal + strain_traffic + strain_noise
    
    # 2. Vibration (g): Higher with traffic load, wind gusts, and severe rainfall
    vib_traffic = 0.06 * (traffic / 100.0)**2
    vib_wind = meta["wind_coeff_vibration"] * wind
    vib_rain = 0.004 * rain
    
    noise_vib_std = 0.001 + 0.002 * meta["vulnerability_factor"]
    vib_noise = np.random.normal(0, noise_vib_std, n)
    
    vibration = meta["base_vibration"] + vib_traffic + vib_wind + vib_rain + vib_noise
    vibration = np.clip(vibration, 0.0, 3.5)
    
    # 3. Displacement (mm): Bridge deflection / mid-span movement
    disp_thermal = 0.08 * temp_delta
    disp_traffic = meta["traffic_coeff_disp"] * (traffic / 100.0)
    
    noise_disp_std = 0.1 + 0.2 * meta["vulnerability_factor"]
    disp_noise = np.random.normal(0, noise_disp_std, n)
    
    displacement = meta["base_displacement"] + disp_thermal + disp_traffic + disp_noise
    
    return strain, vibration, displacement


def apply_scenario_overlays(
    meta: Dict,
    timestamps: pd.DatetimeIndex,
    strain: np.ndarray,
    vibration: np.ndarray,
    displacement: np.ndarray,
    temp: np.ndarray,
    humidity: np.ndarray,
    wind: np.ndarray,
    rain: np.ndarray,
    traffic: np.ndarray,
    random_seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str], List[int]]:
    """
    Applies the specified scenario overlay to modify the telemetry arrays.
    """
    np.random.seed(random_seed + 3)
    n = len(timestamps)
    
    # Pre-extract numpy arrays to avoid mutating pandas index properties
    days = timestamps.day.values
    hours = timestamps.hour.values
    minutes = timestamps.minute.values
    
    scenario_type = meta["scenario_type"]
    scenario_names = [scenario_type] * n
    ground_truth = np.zeros(n, dtype=int)
    
    strain = strain.copy()
    vibration = vibration.copy()
    displacement = displacement.copy()
    temp = temp.copy()
    humidity = humidity.copy()
    wind = wind.copy()
    rain = rain.copy()
    traffic = traffic.copy()
    
    if scenario_type == "sudden_spike":
        spike_start_idx = np.where((days == 15) & (hours == 10) & (minutes == 15))[0]
        if len(spike_start_idx) > 0:
            start_idx = spike_start_idx[0]
            for offset in range(10):
                idx = start_idx + offset
                if idx < n:
                    decay = np.exp(-offset / 2.0)
                    strain[idx] += 120.0 * decay
                    vibration[idx] += 0.85 * decay
                    displacement[idx] -= 22.0 * decay
                    ground_truth[idx] = 1
                    scenario_names[idx] = "sudden_spike"

    elif scenario_type == "persistent_anomaly":
        shift_idx_list = np.where((days == 18) & (hours == 14) & (minutes == 0))[0]
        if len(shift_idx_list) > 0:
            shift_idx = shift_idx_list[0]
            strain[shift_idx:] += 35.0
            displacement[shift_idx:] -= 8.5
            ground_truth[shift_idx:] = 1
            for i in range(shift_idx, n):
                scenario_names[i] = "persistent_anomaly"

    elif scenario_type == "gradual_deterioration":
        det_start_list = np.where((days == 10) & (hours == 0) & (minutes == 0))[0]
        if len(det_start_list) > 0:
            start_idx = det_start_list[0]
            total_det_steps = n - start_idx
            step_multiplier = np.arange(total_det_steps)
            
            strain[start_idx:] += 55.0 * (step_multiplier / total_det_steps)
            displacement[start_idx:] -= 12.0 * (step_multiplier / total_det_steps)
            
            threshold_idx = start_idx + int(total_det_steps * 0.5)
            ground_truth[threshold_idx:] = 1
            for i in range(start_idx, n):
                scenario_names[i] = "gradual_deterioration"

    elif scenario_type == "environmental_disturbance":
        storm_mask = (days == 20) & (hours >= 12) & (hours <= 21)
        wind[storm_mask] = np.random.uniform(22.0, 32.0, np.sum(storm_mask))
        rain[storm_mask] = np.random.exponential(scale=1.5, size=np.sum(storm_mask)) + 0.8
        temp[storm_mask] -= 6.0
        humidity[storm_mask] = 99.0
        
        vibration[storm_mask] += np.random.uniform(0.15, 0.35, np.sum(storm_mask))
        displacement[storm_mask] += np.random.normal(0, 3.0, np.sum(storm_mask))
        
        ground_truth[storm_mask] = 1
        for idx in np.where(storm_mask)[0]:
            scenario_names[idx] = "environmental_disturbance"

    elif scenario_type == "multi_sensor_anomaly":
        lock_mask = (days >= 24) & (days <= 27)
        for i in range(n):
            if lock_mask[i]:
                scenario_names[i] = "multi_sensor_anomaly"
                if temp[i] > 29.5:
                    displacement[i] = meta["base_displacement"] + 0.08 * (29.5 - 25.0) + np.random.normal(0, 0.1)
                    strain[i] -= 45.0 + np.random.normal(0, 2.0)
                    ground_truth[i] = 1

    elif scenario_type == "sensor_drift":
        drift_start_list = np.where((days == 12) & (hours == 0) & (minutes == 0))[0]
        if len(drift_start_list) > 0:
            start_idx = drift_start_list[0]
            steps = np.arange(n - start_idx)
            drift_val = 1.5 * (steps / 1440.0)
            strain[start_idx:] += drift_val
            
            flag_start = start_idx + 5 * 1440
            ground_truth[flag_start:] = 1
            for i in range(start_idx, n):
                scenario_names[i] = "sensor_drift"

    elif scenario_type == "missing_values":
        dropout_mask = (days >= 8) & (days <= 10)
        dropout_indices = np.where(dropout_mask)[0]
        num_missing = int(len(dropout_indices) * 0.35)
        missing_indices = np.random.choice(dropout_indices, size=num_missing, replace=False)
        
        for idx in missing_indices:
            strain[idx] = np.nan
            vibration[idx] = np.nan
            displacement[idx] = np.nan
            scenario_names[idx] = "missing_values"

    elif scenario_type == "sensor_dropout":
        dropout_mask = ((days == 14) & (hours >= 8)) | ((days > 14) & (days < 18)) | ((days == 18) & (hours < 8))
        dropout_indices = np.where(dropout_mask)[0]
        
        vibration[dropout_indices] = 0.0
        ground_truth[dropout_indices] = 1
        for idx in dropout_indices:
            scenario_names[idx] = "sensor_dropout"

    elif scenario_type == "noisy_sensor":
        noise_mask = (days >= 21) & (days <= 26)
        noise_indices = np.where(noise_mask)[0]
        
        strain[noise_indices] += np.random.normal(0.0, 35.0, len(noise_indices))
        ground_truth[noise_indices] = 1
        for idx in noise_indices:
            scenario_names[idx] = "noisy_sensor"

    return strain, vibration, displacement, temp, humidity, wind, rain, traffic, scenario_names, ground_truth


def generate_bridge_dataset(meta: Dict, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates a full time-series DataFrame for a single bridge.
    """
    timestamps = pd.date_range(start=START_DATE, end=END_DATE, freq=FREQ)
    
    # 1. Weather
    temp, hum, wind, rain = get_telangana_weather(timestamps, random_seed)
    
    # 2. Traffic
    traffic = get_traffic_load(timestamps, meta["structure_type"], random_seed)
    
    # 3. Baseline responses
    strain, vib, disp = generate_baseline_telemetry(meta, temp, traffic, wind, rain, random_seed)
    
    # 4. Scenarios overlays
    strain, vib, disp, temp, hum, wind, rain, traffic, scenarios, gt = apply_scenario_overlays(
        meta, timestamps, strain, vib, disp, temp, hum, wind, rain, traffic, random_seed
    )
    
    sensor_id_val = f"{meta['bridge_id']}_NODE_A"
    
    # Construct DataFrame
    df = pd.DataFrame({
        "timestamp": timestamps,
        "bridge_id": meta["bridge_id"],
        "strain_microstrain": strain,
        "vibration_g": vib,
        "displacement_mm": disp,
        "temperature_c": temp,
        "humidity_percent": hum,
        "rainfall_mm": rain,
        "traffic_load_percent": traffic,
        "wind_speed_mps": wind,
        "sensor_id": sensor_id_val,
        "scenario": scenarios,
        "ground_truth_anomaly": gt
    })
    
    return df
