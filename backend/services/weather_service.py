"""Open-Meteo weather adapter for live conditions used in farmer scenarios."""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any

import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
_WEATHER_CACHE: dict[tuple[float, float], dict[str, Any]] = {}

WEATHER_CODE_MAP = {
    0: "Clear sky",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Heavy rain showers",
    82: "Violent rain showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Heavy thunderstorm with hail",
}


def _validate_coordinates(latitude: float, longitude: float) -> None:
    if not -90 <= float(latitude) <= 90:
        raise ValueError("Latitude must be between -90 and 90 degrees.")
    if not -180 <= float(longitude) <= 180:
        raise ValueError("Longitude must be between -180 and 180 degrees.")


def fetch_weather_from_provider(latitude: float, longitude: float) -> dict[str, Any]:
    """Call Open-Meteo and return the raw current-weather payload."""
    _validate_coordinates(latitude, longitude)
    params = {
        "latitude": float(latitude),
        "longitude": float(longitude),
        "current": "temperature_2m,precipitation,rain,relative_humidity_2m,weather_code",
        "timezone": "auto",
    }
    with httpx.Client(timeout=10.0) as client:
        response = client.get(OPEN_METEO_URL, params=params)
        if response.status_code >= 400:
            raise RuntimeError(f"Weather provider returned HTTP {response.status_code}.")
        payload = response.json()
    current = payload.get("current")
    if not isinstance(current, dict):
        raise ValueError("Weather provider response did not include current conditions.")
    return payload


def normalize_weather_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Convert the provider payload to the internal weather schema."""
    current = payload.get("current")
    if not isinstance(current, dict):
        direct_keys = [
            "temperature_2m", "precipitation", "rain", "relative_humidity_2m", "weather_code", "time",
            "temperature", "humidity", "timestamp",
        ]
        if any(key in payload for key in direct_keys):
            current = payload
        else:
            raise ValueError("Weather payload missing current conditions.")

    weather_code = current.get("weather_code")
    timestamp = current.get("time") or current.get("timestamp") or datetime.now(timezone.utc).isoformat()
    temperature = current.get("temperature_2m", current.get("temperature"))
    precipitation = current.get("precipitation")
    rain = current.get("rain")
    humidity = current.get("relative_humidity_2m", current.get("humidity"))

    return {
        "latitude": float(payload.get("latitude", 0.0) or 0.0),
        "longitude": float(payload.get("longitude", 0.0) or 0.0),
        "temperature": round(float(temperature), 1) if temperature is not None else None,
        "precipitation": round(float(precipitation), 1) if precipitation is not None else None,
        "rain": round(float(rain), 1) if rain is not None else None,
        "humidity": round(float(humidity), 1) if humidity is not None else None,
        "weather_code": int(weather_code) if weather_code is not None else None,
        "weather_condition": WEATHER_CODE_MAP.get(int(weather_code), "Weather conditions available") if weather_code is not None else "Weather conditions unavailable",
        "timestamp": timestamp,
        "source": "Open-Meteo",
        "data_type": "Current weather model data",
    }


def get_weather_for_coordinates(latitude: float, longitude: float) -> dict[str, Any]:
    """Return current weather for the given coordinates while keeping a recent successful result cached for diagnostics."""
    lat = float(latitude)
    lon = float(longitude)
    _validate_coordinates(lat, lon)
    key = (round(lat, 4), round(lon, 4))
    now = time.time()

    payload = fetch_weather_from_provider(lat, lon)
    normalized = normalize_weather_payload(payload)
    _WEATHER_CACHE[key] = {"fetched_at": now, "data": normalized}
    return normalized
