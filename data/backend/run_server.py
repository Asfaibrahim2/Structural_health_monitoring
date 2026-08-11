# run_server.py
import sys
import os

# Add project root (for ml_engine) and data/ (for backend package) to import path.
project_root = os.path.abspath(os.path.join(__file__, "..", "..", ".."))
data_root = os.path.join(project_root, "data")
for path in (project_root, data_root):
    if path not in sys.path:
        sys.path.insert(0, path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=False)