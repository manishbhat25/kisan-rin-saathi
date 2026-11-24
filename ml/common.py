"""Shared helpers for both eligibility pipelines.

Column names use the same camelCase keys as the web application so that the
exported feature encoding can be reproduced exactly by the TypeScript evaluator
in server/ml/.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
DATA_RAW = ROOT / "data" / "raw"
DATA_CLEAN = ROOT / "data" / "clean"
ARTIFACTS = ROOT / "artifacts"
REPORTS = ROOT / "reports"
SEED = 20261124


def load_states() -> list[dict]:
    with open(REPO / "lib" / "data" / "indian_states.json", encoding="utf-8") as handle:
        return json.load(handle)


_STATES = load_states()


def _compact(value: str) -> str:
    return re.sub(r"[^a-z\u0900-\u097f&]", "", value.strip().lower())


def _edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        cur = [i]
        for j, cb in enumerate(b, start=1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def normalize_state(value) -> str | None:
    """Mirror of lib/domain/states.ts normalizeState. Unknown or ambiguous values return None."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if raw.upper() in {s["code"] for s in _STATES}:
        return raw.upper()
    key = _compact(raw)
    for state in _STATES:
        if key in {_compact(c) for c in [state["name"], *state["aliases"]]}:
            return state["code"]
    if len(key) < 5:
        return None
    best, best_distance, tie = None, 10**9, False
    for state in _STATES:
        for candidate in [state["name"], *state["aliases"]]:
            cand = _compact(candidate)
            if len(cand) < 5:
                continue
            distance = _edit_distance(key, cand)
            if distance < best_distance:
                best, best_distance, tie = state["code"], distance, False
            elif distance == best_distance and best and best != state["code"]:
                tie = True
    return best if best and not tie and best_distance <= 2 else None


@dataclass
class FeatureSpec:
    numeric: list[str]
    boolean: list[str]
    categorical: dict[str, list[str]]
    engineered: list[str] = field(default_factory=list)

    def feature_names(self) -> list[str]:
        names = [*self.numeric, *self.engineered, *self.boolean]
        for column, categories in self.categorical.items():
            names.extend(f"{column}={category}" for category in categories)
        return names


def encode(df: pd.DataFrame, spec: FeatureSpec) -> pd.DataFrame:
    """One-hot encode with a fixed category list so the layout never depends on the data."""
    out = pd.DataFrame(index=df.index)
    for column in [*spec.numeric, *spec.engineered]:
        out[column] = df[column].astype(float)
    for column in spec.boolean:
        out[column] = df[column].astype(float)
    for column, categories in spec.categorical.items():
        for category in categories:
            out[f"{column}={category}"] = (df[column] == category).astype(float)
    return out[spec.feature_names()]


def export_tree(tree) -> dict:
    t = tree.tree_
    value = t.value[:, 0, :]
    totals = value.sum(axis=1)
    proba = np.where(totals > 0, value[:, 1] / np.where(totals > 0, totals, 1), 0.0)
    return {
        "childrenLeft": t.children_left.tolist(),
        "childrenRight": t.children_right.tolist(),
        "feature": t.feature.tolist(),
        "threshold": [float(x) for x in t.threshold],
        "probability": [float(x) for x in proba],
        "samples": t.n_node_samples.tolist(),
    }


def model_payload(route, algorithm, estimator, spec: FeatureSpec, imputation, metrics, criteria, sklearn_version):
    trees = [export_tree(e) for e in estimator.estimators_] if hasattr(estimator, "estimators_") else [export_tree(estimator)]
    body = {
        "route": route,
        "algorithm": algorithm,
        "featureNames": spec.feature_names(),
        "encoding": {
            "numeric": spec.numeric,
            "engineered": spec.engineered,
            "boolean": spec.boolean,
            "categorical": spec.categorical,
        },
        "imputation": imputation,
        "trees": trees,
    }
    digest = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()[:10]
    prefix = "gov" if route == "GOVERNMENT" else "bank"
    short = "dt" if algorithm == "DecisionTreeClassifier" else "rf"
    body.update(
        {
            "version": f"{prefix}-{short}-{digest}",
            "trainedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "sklearnVersion": sklearn_version,
            "syntheticData": True,
            "labelingCriteria": criteria,
            "metrics": metrics,
        }
    )
    return body


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=1, ensure_ascii=False)


def to_records(df: pd.DataFrame) -> list[dict]:
    records = []
    for row in df.to_dict(orient="records"):
        clean = {}
        for key, value in row.items():
            if isinstance(value, (np.bool_, bool)):
                clean[key] = bool(value)
            elif isinstance(value, (np.integer,)):
                clean[key] = int(value)
            elif isinstance(value, (np.floating, float)):
                clean[key] = None if np.isnan(value) else float(value)
            else:
                clean[key] = value
        records.append(clean)
    return records
