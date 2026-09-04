"""
TerraScore API — FastAPI application entry point.

Run from the repository root:
    uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.config import CORS_ORIGINS  # noqa: E402
from backend.routes.api import router  # noqa: E402
from backend.services.data_service import store  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load data + model ONCE at startup
    try:
        store.load()
    except Exception as e:  # keep API up so /api/health can report the problem
        store.errors.append(str(e))
        print(f"[TerraScore] startup error: {e}")
    yield


app = FastAPI(
    title="TerraScore API",
    version="1.0.0",
    description="Agricultural climate-risk intelligence. Prototype on simulated data — not a credit score, "
                "underwriting decision or financial advice.",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": f"Internal error: {type(exc).__name__}: {exc}"})


@app.get("/")
def root():
    return {"name": "TerraScore API", "docs": "/docs", "health": "/api/health"}
