"""
TerraScore — model training.

Trains a RandomForestClassifier (primary) and a LogisticRegression baseline to
predict the probability of significant crop loss (>=20% yield drop) and saves
the best model + metadata with joblib. Metrics are computed on a held-out test
set — nothing is hardcoded.

Usage:
    python ml/train.py
"""
from __future__ import annotations

import json
import os
import sys
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, f1_score, roc_auc_score, precision_score, recall_score,
                             brier_score_loss, mean_absolute_error, mean_squared_error)
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from feature_engineering import build_features, group_feature, FEATURE_LABELS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "data", "farms.csv")
MODEL_DIR = os.path.join(ROOT, "ml", "saved_model")
SEED = 42


def evaluate(name, model, X_test, y_test, y_prob_true):
    prob = model.predict_proba(X_test)[:, 1]
    pred = (prob >= 0.5).astype(int)
    return {
        "model": name,
        "accuracy": round(float(accuracy_score(y_test, pred)), 4),
        "precision": round(float(precision_score(y_test, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, prob)), 4),
        "brier": round(float(brier_score_loss(y_test, prob)), 4),
        # How well the predicted probability tracks the underlying (noisy) risk score
        "prob_mae_vs_risk_score": round(float(mean_absolute_error(y_prob_true, prob)), 4),
        "prob_rmse_vs_risk_score": round(float(np.sqrt(mean_squared_error(y_prob_true, prob))), 4),
    }


def main():
    t0 = time.time()
    df = pd.read_csv(DATA_PATH)
    X = build_features(df)
    y = df["crop_failure"].astype(int)
    risk_true = df["risk_score"].astype(float)

    X_train, X_test, y_train, y_test, r_train, r_test = train_test_split(
        X, y, risk_true, test_size=0.2, random_state=SEED, stratify=y)

    candidates = {
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=400, max_depth=8, min_samples_leaf=6, class_weight="balanced_subsample",
            random_state=SEED, n_jobs=-1),
        "GradientBoostingClassifier": GradientBoostingClassifier(
            n_estimators=250, max_depth=3, learning_rate=0.05, subsample=0.9, random_state=SEED),
        "LogisticRegression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, C=0.5)),
    }

    results = []
    fitted = {}
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        fitted[name] = model
        res = evaluate(name, model, X_test, y_test, r_test)
        cv = cross_val_score(model, X_train, y_train, cv=5, scoring="roc_auc")
        res["cv_roc_auc_mean"] = round(float(cv.mean()), 4)
        res["cv_roc_auc_std"] = round(float(cv.std()), 4)
        results.append(res)
        print(f"{name:28s} acc={res['accuracy']:.3f} f1={res['f1']:.3f} auc={res['roc_auc']:.3f} brier={res['brier']:.3f} cvAUC={res['cv_roc_auc_mean']:.3f}")

    # Choose primary model: best ROC-AUC among tree models (needed for feature_importances_)
    tree_results = [r for r in results if r["model"] != "LogisticRegression"]
    best = max(tree_results, key=lambda r: r["roc_auc"])
    rf = next(r for r in results if r["model"] == "RandomForestClassifier")
    # Prefer the Random Forest when it is within 0.02 ROC-AUC of the best (more stable, easier to explain)
    if best["model"] != rf["model"] and best["roc_auc"] - rf["roc_auc"] <= 0.02:
        best = rf
    best_name = best["model"]
    model = fitted[best_name]
    print(f"\nSelected primary model: {best_name}")

    # Feature importance (model-derived), grouped for one-hot columns
    importances = dict(zip(X.columns, model.feature_importances_))
    grouped: dict[str, float] = {}
    for col, imp in importances.items():
        g = group_feature(col)
        grouped[g] = grouped.get(g, 0.0) + float(imp)
    total = sum(grouped.values()) or 1.0
    grouped = {k: v / total for k, v in grouped.items()}
    fi_sorted = sorted(grouped.items(), key=lambda kv: kv[1], reverse=True)

    # Permutation importance on test set (more faithful)
    from sklearn.inspection import permutation_importance
    pi = permutation_importance(model, X_test, y_test, n_repeats=8, random_state=SEED, scoring="roc_auc", n_jobs=-1)
    perm: dict[str, float] = {}
    for col, imp in zip(X.columns, pi.importances_mean):
        g = group_feature(col)
        perm[g] = perm.get(g, 0.0) + max(float(imp), 0.0)
    ptotal = sum(perm.values()) or 1.0
    perm = {k: v / ptotal for k, v in perm.items()}

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, os.path.join(MODEL_DIR, "terrascore_model.joblib"))

    # Reference stats used at inference time for local explanations (z-scores)
    ref_stats = {c: {"mean": float(X_train[c].mean()), "std": float(X_train[c].std() or 1.0)} for c in X.columns}

    metadata = {
        "model_type": best_name,
        "model_version": "1.0.0",
        "trained_at": pd.Timestamp.utcnow().isoformat(),
        "target": "crop_failure (>=20% yield drop, simulated label)",
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "n_features": int(X.shape[1]),
        "feature_columns": list(X.columns),
        "grouped_feature_count": len(grouped),
        "positive_rate": round(float(y.mean()), 4),
        "metrics": best,
        "model_comparison": results,
        "feature_importance": [{"feature": k, "label": FEATURE_LABELS.get(k, k), "importance": round(v, 4)} for k, v in fi_sorted],
        "permutation_importance": [{"feature": k, "label": FEATURE_LABELS.get(k, k), "importance": round(v, 4)}
                                   for k, v in sorted(perm.items(), key=lambda kv: kv[1], reverse=True)],
        "reference_stats": ref_stats,
        "hyperparameters": {k: (v if isinstance(v, (int, float, str, bool, type(None))) else str(v))
                            for k, v in (model.get_params().items() if hasattr(model, "get_params") else [])},
        "training_seconds": round(time.time() - t0, 2),
        "data_source": "Simulated / synthetic demo data",
    }
    with open(os.path.join(MODEL_DIR, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("\nTop feature importance (model-derived):")
    for k, v in fi_sorted[:8]:
        print(f"  {FEATURE_LABELS.get(k, k):36s} {v * 100:5.1f}%")
    print(f"\nSaved model + metadata to {MODEL_DIR} ({metadata['training_seconds']}s)")


if __name__ == "__main__":
    main()
