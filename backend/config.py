"""Backend configuration loaded from environment / .env."""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except Exception:  # pragma: no cover
    pass

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("TERRASCORE_DATA_DIR", ROOT / "data"))
MODEL_DIR = Path(os.getenv("TERRASCORE_MODEL_DIR", ROOT / "ml" / "saved_model"))
DB_PATH = Path(os.getenv("TERRASCORE_DB_PATH", ROOT / "data" / "terrascore.db"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
API_PREFIX = "/api"
# Pluggable providers — swap "mock" for real integrations later
WEATHER_PROVIDER = os.getenv("WEATHER_PROVIDER", "mock")
