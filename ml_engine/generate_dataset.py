import os
import pandas as pd
from data_generator import BRIDGES_METADATA, generate_bridge_dataset

def generate_full_dataset(output_path: str = "data/bridges_telemetry.csv"):
    """Generate telemetry for all bridges and save to a CSV file.
    The function creates the output directory if it does not exist.
    """
    all_dfs = []
    for meta in BRIDGES_METADATA:
        df = generate_bridge_dataset(meta)
        all_dfs.append(df)
    full_df = pd.concat(all_dfs, ignore_index=True)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    full_df.to_csv(output_path, index=False)
    print(f"Dataset saved to {output_path}, shape={full_df.shape}")

if __name__ == "__main__":
    generate_full_dataset()
