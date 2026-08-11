import os
import json
import pandas as pd
from datetime import datetime
from ml_engine.data_generator import BRIDGES_METADATA, generate_bridge_dataset

def main():
    print("Starting InfraShield AI Structural Sensor Data Generation...")
    
    # 1. Prepare output directories
    raw_dir = "c:/ai_xdomain/infrastructure/data/raw"
    os.makedirs(raw_dir, exist_ok=True)
    
    metadata_path = os.path.join(raw_dir, "bridge_metadata.json")
    telemetry_path = os.path.join(raw_dir, "bridge_telemetry.csv")
    
    # 2. Process Metadata (Calculating age_years as of 2026)
    current_year = 2026
    enriched_metadata = []
    
    for bridge in BRIDGES_METADATA:
        meta_copy = bridge.copy()
        # Compute age
        meta_copy["age_years"] = current_year - meta_copy["construction_year"]
        
        # Strip internal simulation coefficients to present clean project metadata
        clean_keys = [
            "bridge_id", "bridge_name", "structure_type", "construction_year",
            "age_years", "span_length_m", "vulnerability_factor", "sensor_count",
            "scenario_type"
        ]
        clean_meta = {k: meta_copy[k] for k in clean_keys}
        enriched_metadata.append(clean_meta)
        
    # Write JSON metadata
    with open(metadata_path, "w") as f:
        json.dump(enriched_metadata, f, indent=4)
    print(f"Bridge metadata JSON saved to: {metadata_path}")
    
    # 3. Generate Time-Series Data Bridge by Bridge (Memory Efficient)
    first_bridge = True
    total_bridges = len(BRIDGES_METADATA)
    
    for idx, bridge in enumerate(BRIDGES_METADATA):
        bridge_id = bridge["bridge_id"]
        bridge_name = bridge["bridge_name"]
        scenario = bridge["scenario_type"]
        print(f"[{idx+1}/{total_bridges}] Generating telemetry for '{bridge_name}' ({bridge_id}) - Scenario: {scenario}...")
        
        # Generate DataFrame (deterministic seed based on index)
        df = generate_bridge_dataset(bridge, random_seed=42 + idx)
        
        # Format timestamps to clean ISO string format
        df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
        
        # Write to CSV
        if first_bridge:
            # Overwrite & write header
            df.to_csv(telemetry_path, index=False, mode="w")
            first_bridge = False
        else:
            # Append without header
            df.to_csv(telemetry_path, index=False, mode="a", header=False)
            
    print(f"Telemetry time-series generation complete! Output saved to: {telemetry_path}")
    print(f"Total rows generated: {total_bridges * 30 * 24 * 60:,} rows.")

if __name__ == "__main__":
    main()
