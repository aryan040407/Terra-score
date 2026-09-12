"""Run: pytest backend/tests -q   (from repo root)"""
import sys, os
from unittest.mock import patch
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services import weather_service

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


def test_explainability_labels_are_available(client):
    j = client.get("/api/demo-data").json()
    labels = j["data_labels"]
    assert any("Historical weather data" in label for label in labels)
    assert any("ML model output" in label for label in labels)


def test_weather_valid_coordinates(client):
    with patch("backend.services.weather_service.fetch_weather_from_provider", return_value={
        "temperature": 29.4,
        "precipitation": 11.2,
        "rain": 9.8,
        "humidity": 68.0,
        "weather_code": 2,
        "timestamp": "2026-09-11T10:00:00Z",
        "source": "Open-Meteo",
    }):
        r = client.get("/api/weather?latitude=12.97&longitude=77.59")
        assert r.status_code == 200
        body = r.json()
        assert body["temperature"] == 29.4
        assert body["source"] == "Open-Meteo"
        assert body["data_type"] == "Current weather model data"


def test_weather_invalid_coordinates(client):
    r = client.get("/api/weather?latitude=999&longitude=77.59")
    assert r.status_code == 422


def test_weather_provider_failure(client):
    with patch("backend.services.weather_service.fetch_weather_from_provider", side_effect=RuntimeError("provider timeout")):
        r = client.get("/api/weather?latitude=12.97&longitude=77.59")
        assert r.status_code == 503
        assert "unavailable" in r.json()["detail"].lower()


def test_weather_response_parsing():
    payload = {
        "current": {"temperature_2m": 28.7, "precipitation": 0.0, "rain": 0.0, "relative_humidity_2m": 59.0, "weather_code": 0},
        "timezone": "auto",
        "latitude": 12.97,
        "longitude": 77.59,
    }
    out = weather_service.normalize_weather_payload(payload)
    assert out["temperature"] == 28.7
    assert out["humidity"] == 59.0
    assert out["source"] == "Open-Meteo"
    assert out["weather_condition"] == "Clear sky"
