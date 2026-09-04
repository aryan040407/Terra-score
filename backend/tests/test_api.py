"""Run: pytest backend/tests -q   (from repo root)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import pytest
from fastapi.testclient import TestClient
from backend.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    r = client.get("/api/health"); assert r.status_code == 200 and r.json()["model_loaded"]

def test_terrascore_bounds(client):
    j = client.get("/api/terrascore/FARM-001").json()
    assert 0 <= j["terra_score"] <= 1000 and j["risk_level"] in {"Very Low Risk","Low Risk","Moderate Risk","High Risk","Critical Risk"}
    assert abs(j["terra_score"] - round((1 - j["risk_probability"]) * 1000)) <= 1

def test_farm_404(client):
    assert client.get("/api/farms/NOPE").status_code == 404

def test_what_if_drought_increases_risk(client):
    r = client.post("/api/what-if", json={"farm_id": "FARM-001", "rainfall_change_pct": -40, "temperature_change_c": 3}).json()
    assert r["new_terra_score"] < r["baseline_terra_score"]

def test_what_if_validation(client):
    assert client.post("/api/what-if", json={"farm_id": "FARM-001", "rainfall_change_pct": 500}).status_code == 422

def test_predict_and_explanations(client):
    r = client.post("/api/predict", json={"crop_type": "Rice", "drought_index": 0.9, "irrigation_status": "None"}).json()
    assert "top_risk_factors" in r and len(r["top_risk_factors"]) > 0

def test_regions_filters(client):
    j = client.get("/api/regions?state=Punjab").json(); assert all(x["state"] == "Punjab" for x in j["regions"])

def test_model_metrics_present(client):
    m = client.get("/api/model/explanation").json(); assert 0.5 < m["metrics"]["roc_auc"] <= 1 and m["feature_importance"]
