from __future__ import annotations

import json
import re
from typing import Any

import httpx

from backend.config import GEMINI_API_KEY, GEMINI_MODEL, GROQ_API_KEY, GROQ_MODEL, AI_PROVIDER
from backend.services.data_service import store
from backend.services.weather_service import get_weather_for_coordinates


def _resolve_farm_context(farm_id: str | None, location: str | None) -> tuple[str | None, str | None, dict[str, Any]]:
    selected_farm = None
    if farm_id:
        selected_farm = store.get_farm(farm_id)
    if selected_farm is None and location:
        loc = location.lower()
        if store.farms is not None:
            for _, row in store.farms.iterrows():
                district = str(row.get("district", "") or "")
                state = str(row.get("state", "") or "")
                combo = f"{district}, {state}".lower()
                if loc in district.lower() or loc in state.lower() or loc in combo:
                    selected_farm = row.to_dict()
                    break
    if selected_farm is None:
        if store.farms is not None and not store.farms.empty:
            selected_farm = store.farms.iloc[0].to_dict()
    if selected_farm is None:
        return farm_id, location, {"temperature": None, "humidity": None, "source": "offline", "weather_condition": "No weather data available"}

    resolved_farm_id = selected_farm.get("farm_id")
    resolved_location = location or f"{selected_farm.get('district')}, {selected_farm.get('state')}"
    lat = float(selected_farm.get("latitude", 0.0) or 0.0)
    lon = float(selected_farm.get("longitude", 0.0) or 0.0)
    try:
        weather = get_weather_for_coordinates(lat, lon)
    except Exception:
        weather = {"temperature": None, "humidity": None, "source": "offline", "weather_condition": "No weather data available"}
    return resolved_farm_id, resolved_location, weather


def _offline_answer(message: str, role: str, farm_id: str | None, location: str | None, weather: dict[str, Any], score: int | None, risk_level: str | None, top_risks: list[str]) -> str:
    score_text = f"current TerraScore is {score}" if score is not None else "TerraScore is available"
    risk_text = f" with {risk_level.lower()} risk" if risk_level else ""
    weather_text = ""
    if weather.get("temperature") is not None:
        weather_text = f" Current conditions at {location or 'the selected location'} are about {weather.get('temperature')}°C and {weather.get('humidity')}% humidity."
    if "rain" in message.lower() or "rainfall" in message.lower() or "precipitation" in message.lower():
        return (
            f"Based on the TerraScore context for {farm_id or 'the selected farm'}{risk_text}, {score_text}."
            f"{weather_text} The model highlights {', '.join(top_risks[:3])} as the main risk drivers. "
            f"For {role} decision-making, I’d treat this as a climate-risk signal to watch, not an independent credit decision."
        )
    return (
        f"I reviewed the farm context for {farm_id or 'the selected farm'}{risk_text}. {score_text}."
        f"{weather_text} The key drivers remain {', '.join(top_risks[:3])}. "
        f"This is a decision-support view grounded in TerraScore and weather inputs, not a standalone underwriting judgement."
    )


def _build_grounding(farm: dict[str, Any] | None, location: str | None, weather: dict[str, Any], top_risks: list[str]) -> dict[str, Any]:
    score = int(farm["terra_score"]) if farm and farm.get("terra_score") is not None else None
    risk_level = farm.get("risk_level") if farm else None
    return {
        "farm_id": farm.get("farm_id") if farm else None,
        "location": location or (f"{farm.get('district')}, {farm.get('state')}" if farm else None),
        "terra_score": score,
        "risk_level": risk_level,
        "weather": {k: v for k, v in weather.items() if v is not None},
        "top_risk_factors": top_risks,
    }


def _message_for_provider(provider: str, message: str, role: str, farm: dict[str, Any] | None, location: str | None, weather: dict[str, Any], top_risks: list[str]) -> str:
    score = farm.get("terra_score") if farm else None
    risk_level = farm.get("risk_level") if farm else None
    prompt = [
        "You are TerraScore Climate Copilot.",
        "Use the provided farm/weather context only and do not calculate TerraScore yourself.",
        "The ML model is the source of TerraScore; your job is to explain the signal in plain language.",
        f"Role: {role}",
        f"Farm: {farm.get('farm_id') if farm else 'unknown'}",
        f"Location: {location or 'unknown'}",
        f"Weather: {json.dumps({k: v for k, v in weather.items() if v is not None}, default=str)}",
        f"TerraScore: {score}",
        f"Risk level: {risk_level}",
        f"Top drivers: {', '.join(top_risks[:5]) if top_risks else 'No data'}",
        f"User question: {message}",
        "Return: 2 short paragraphs, practical advice, and explicitly say that TerraScore comes from the ML model."
    ]
    return "\n".join(prompt)


def _call_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY missing")
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
    }
    with httpx.Client(timeout=20.0) as client:
        res = client.post(url, headers={"Authorization": f"Bearer {GROQ_API_KEY}"}, json=payload)
        if res.status_code >= 400:
            raise RuntimeError(f"Groq error {res.status_code}: {res.text[:300]}")
        data = res.json()
        return data["choices"][0]["message"]["content"]


def _call_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    params = {"key": GEMINI_API_KEY}
    payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300}}
    with httpx.Client(timeout=20.0) as client:
        res = client.post(url, params=params, json=payload)
        if res.status_code >= 400:
            raise RuntimeError(f"Gemini error {res.status_code}: {res.text[:300]}")
        data = res.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return text.strip()


def generate_copilot_response(message: str, role: str = "farmer", farm_id: str | None = None, location: str | None = None) -> dict[str, Any]:
    if store.farms is None or store.farms.empty:
        raise RuntimeError("Farm data not loaded yet")

    resolved_farm_id, resolved_location, weather = _resolve_farm_context(farm_id, location)
    farm = store.get_farm(resolved_farm_id) if resolved_farm_id else None
    top_risk_factors = []
    if farm:
        top_risk_factors = [item.get("label") or str(item) for item in (store.get_farm(resolved_farm_id).get("risk_score") if False else [])]
        try:
            from predict import predict_risk
            scored = predict_risk(farm, top_k=3)
            top_risk_factors = [factor.get("label", "Risk factor") for factor in scored.get("top_risk_factors", [])]
        except Exception:
            top_risk_factors = []

    grounding = _build_grounding(farm, resolved_location, weather, top_risk_factors)
    provider = "offline"
    answer = _offline_answer(message, role, resolved_farm_id, resolved_location, weather, grounding["terra_score"], grounding["risk_level"], top_risk_factors)

    if AI_PROVIDER == "groq" or (AI_PROVIDER not in {"offline", "gemini"} and GROQ_API_KEY):
        try:
            provider = "groq"
            prompt = _message_for_provider("groq", message, role, farm, resolved_location, weather, top_risk_factors)
            answer = _call_groq(prompt)
        except Exception:
            if GEMINI_API_KEY:
                provider = "gemini"
                try:
                    prompt = _message_for_provider("gemini", message, role, farm, resolved_location, weather, top_risk_factors)
                    answer = _call_gemini(prompt)
                except Exception:
                    provider = "offline"
                    answer = _offline_answer(message, role, resolved_farm_id, resolved_location, weather, grounding["terra_score"], grounding["risk_level"], top_risk_factors)
            else:
                provider = "offline"
                answer = _offline_answer(message, role, resolved_farm_id, resolved_location, weather, grounding["terra_score"], grounding["risk_level"], top_risk_factors)
    elif AI_PROVIDER == "gemini" and GEMINI_API_KEY:
        try:
            provider = "gemini"
            prompt = _message_for_provider("gemini", message, role, farm, resolved_location, weather, top_risk_factors)
            answer = _call_gemini(prompt)
        except Exception:
            provider = "offline"
            answer = _offline_answer(message, role, resolved_farm_id, resolved_location, weather, grounding["terra_score"], grounding["risk_level"], top_risk_factors)
    elif GROQ_API_KEY and AI_PROVIDER not in {"offline", "gemini"}:
        try:
            provider = "groq"
            prompt = _message_for_provider("groq", message, role, farm, resolved_location, weather, top_risk_factors)
            answer = _call_groq(prompt)
        except Exception:
            provider = "offline"
            answer = _offline_answer(message, role, resolved_farm_id, resolved_location, weather, grounding["terra_score"], grounding["risk_level"], top_risk_factors)

    if not answer.strip():
        answer = _offline_answer(message, role, resolved_farm_id, resolved_location, weather, grounding["terra_score"], grounding["risk_level"], top_risk_factors)

    raw_answer = re.sub(r"\s+", " ", answer).strip()
    return {"provider": provider, "answer": raw_answer, "role": role, "grounding": grounding}
