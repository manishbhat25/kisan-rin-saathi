"""Government and Bank eligibility training pipelines.

Stages: ingestion -> validation -> cleaning (incl. state normalisation) ->
missing-value handling -> feature preparation -> deduplicated stratified split ->
training (+ cross-validated depth selection) -> evaluation -> serialisation ->
JSON export for in-app inference -> parity fixtures -> report.
"""

from __future__ import annotations

import json

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.tree import DecisionTreeClassifier

from common import (
    ARTIFACTS,
    DATA_CLEAN,
    DATA_RAW,
    REPORTS,
    SEED,
    FeatureSpec,
    encode,
    model_payload,
    normalize_state,
    to_records,
    write_json,
)
from generate_data import BANK_CRITERIA, GOV_CRITERIA

GOV_SPEC = FeatureSpec(
    numeric=["age", "landholdingAcres", "annualAgriIncome", "requestedAmount"],
    boolean=["hasBankAccount", "priorSchemeDefault"],
    categorical={
        "farmerCategory": ["OWNER", "TENANT", "SHARECROPPER"],
        "cropCategory": ["CEREAL", "PULSE", "OILSEED", "CASH_CROP", "HORTICULTURE"],
        "irrigationType": ["RAINFED", "IRRIGATED", "MIXED"],
        "supportPurpose": ["INPUT_SUPPORT", "IRRIGATION_SUPPORT", "EQUIPMENT_SUPPORT"],
    },
)

BANK_SPEC = FeatureSpec(
    numeric=[
        "age",
        "annualIncome",
        "existingMonthlyEmi",
        "requestedAmount",
        "tenureMonths",
        "yearsFarming",
        "landholdingAcres",
        "collateralValue",
    ],
    engineered=["repaymentBurden", "loanToIncome", "collateralCoverage"],
    boolean=[],
    categorical={
        "creditHistory": ["NO_HISTORY", "GOOD", "FAIR", "POOR"],
        "loanPurpose": ["CROP_PRODUCTION", "EQUIPMENT", "LAND_DEVELOPMENT", "DAIRY_LIVESTOCK", "STORAGE"],
        "collateralType": ["NONE", "LAND", "GOLD", "MACHINERY", "OTHER"],
    },
)


def add_bank_features(df: pd.DataFrame) -> pd.DataFrame:
    """Must stay identical to engineeredFeatures() in server/ml/features.ts."""
    df = df.copy()
    monthly_income = df.annualIncome / 12.0
    df["repaymentBurden"] = (df.existingMonthlyEmi + df.requestedAmount / df.tenureMonths) / monthly_income
    df["loanToIncome"] = df.requestedAmount / df.annualIncome
    df["collateralCoverage"] = df.collateralValue / df.requestedAmount
    return df


def validate_and_clean(df: pd.DataFrame, route: str, log: dict) -> pd.DataFrame:
    log["rawRows"] = int(len(df))
    df = df.drop_duplicates().reset_index(drop=True)
    log["afterExactDedupe"] = int(len(df))

    df["stateCode"] = df["state"].map(normalize_state)
    log["unrecognisedStates"] = int(df.stateCode.isna().sum())
    df = df[df.stateCode.notna()].drop(columns=["state"])

    if route == "GOVERNMENT":
        invalid = (df.annualAgriIncome < 0) | (df.age < 14) | (df.requestedAmount <= 0)
    else:
        invalid = (df.annualIncome <= 0) | (df.tenureMonths <= 0) | (df.requestedAmount <= 0) | (df.age < 14)
    log["invalidRowsDropped"] = int(invalid.sum())
    df = df[~invalid].reset_index(drop=True)
    log["missingValuesBeforeImputation"] = {k: int(v) for k, v in df.isna().sum().items() if v}
    return df


def impute(df: pd.DataFrame, spec: FeatureSpec, train_index) -> tuple[pd.DataFrame, dict]:
    """Imputation values are learned from the training split only to avoid leakage."""
    df = df.copy()
    values: dict = {}
    train = df.loc[train_index]
    for column in spec.numeric:
        if df[column].isna().any():
            values[column] = float(train[column].median())
            df[column] = df[column].fillna(values[column])
    for column in spec.categorical:
        if df[column].isna().any():
            values[column] = str(train[column].mode().iloc[0])
            df[column] = df[column].fillna(values[column])
    return df, values


def evaluate(model, x, y) -> dict:
    proba = model.predict_proba(x)[:, 1]
    pred = (proba >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "precision": round(float(precision_score(y, pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, pred, zero_division=0)), 4),
        "rocAuc": round(float(roc_auc_score(y, proba)), 4) if len(set(y)) > 1 else None,
        "confusionMatrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def run(route: str) -> dict:
    spec = GOV_SPEC if route == "GOVERNMENT" else BANK_SPEC
    name = "government" if route == "GOVERNMENT" else "bank"
    criteria = GOV_CRITERIA if route == "GOVERNMENT" else BANK_CRITERIA
    log: dict = {}

    raw = pd.read_csv(DATA_RAW / f"{name}_raw.csv")
    clean = validate_and_clean(raw, route, log)

    feature_cols = [*spec.numeric, *spec.boolean, *spec.categorical]
    clean = clean.drop_duplicates(subset=[*feature_cols, "stateCode"]).reset_index(drop=True)
    log["afterFeatureDedupe"] = int(len(clean))

    train_idx, test_idx = train_test_split(
        clean.index, test_size=0.2, random_state=SEED, stratify=clean.eligible
    )
    clean, imputation = impute(clean, spec, train_idx)
    if route == "BANK":
        clean = add_bank_features(clean)
    DATA_CLEAN.mkdir(parents=True, exist_ok=True)
    clean.to_csv(DATA_CLEAN / f"{name}_clean.csv", index=False)

    x = encode(clean, spec)
    y = clean.eligible.values
    x_train, x_test, y_train, y_test = x.loc[train_idx], x.loc[test_idx], y[train_idx], y[test_idx]
    log["trainRows"], log["testRows"] = int(len(x_train)), int(len(x_test))
    log["positiveRateTrain"] = round(float(y_train.mean()), 4)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    dt_search = GridSearchCV(
        DecisionTreeClassifier(random_state=SEED, class_weight="balanced"),
        {"max_depth": [3, 4, 5, 6, 8], "min_samples_leaf": [10, 25, 50]},
        scoring="f1",
        cv=cv,
    )
    dt_search.fit(x_train, y_train)
    candidates = {"DecisionTreeClassifier": dt_search}

    if route == "BANK":
        rf_search = GridSearchCV(
            RandomForestClassifier(n_estimators=60, random_state=SEED, class_weight="balanced", n_jobs=-1),
            {"max_depth": [6, 8], "min_samples_leaf": [10, 25]},
            scoring="f1",
            cv=cv,
        )
        rf_search.fit(x_train, y_train)
        candidates["RandomForestClassifier"] = rf_search

    baseline = DummyClassifier(strategy="most_frequent").fit(x_train, y_train)
    comparison = {
        "MajorityClassBaseline": evaluate(baseline, x_test, y_test),
    }
    for algo, search in candidates.items():
        comparison[algo] = {
            **evaluate(search.best_estimator_, x_test, y_test),
            "cvF1": round(float(search.best_score_), 4),
            "bestParams": search.best_params_,
        }

    # Selection uses cross-validated F1 on the training split, never the test set.
    chosen = max(candidates, key=lambda algo: candidates[algo].best_score_)
    model = candidates[chosen].best_estimator_

    metrics = {
        "selected": chosen,
        "selectionRule": "highest 5-fold cross-validated F1 on the training split",
        "test": comparison[chosen],
        "comparison": comparison,
        "pipelineLog": log,
        "warning": "Synthetic data. These metrics measure agreement with the demonstration labeling criteria only, not real-world creditworthiness.",
    }

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, ARTIFACTS / f"{name}_model.joblib")
    payload = model_payload(route, chosen, model, spec, imputation, metrics, criteria, sklearn.__version__)
    write_json(ARTIFACTS / f"{name}_model.json", payload)

    raw_cols = [*spec.numeric, *spec.boolean, *spec.categorical, "stateCode"]
    sample = clean.loc[test_idx[:200], raw_cols]
    write_json(
        ARTIFACTS / f"{name}_parity.json",
        {
            "version": payload["version"],
            "rows": to_records(sample),
            "probabilities": model.predict_proba(x.loc[test_idx[:200]])[:, 1].tolist(),
        },
    )

    REPORTS.mkdir(parents=True, exist_ok=True)
    write_json(REPORTS / f"{name}_metrics.json", {"version": payload["version"], **metrics})
    _markdown_report(name, route, payload["version"], metrics, criteria)
    print(f"[{route}] selected {chosen} version={payload['version']} test={comparison[chosen]}")
    return payload


def _markdown_report(name, route, version, metrics, criteria) -> None:
    lines = [
        f"# {route.title()} eligibility model report",
        "",
        f"Model version: `{version}`  ",
        f"Selected algorithm: **{metrics['selected']}** ({metrics['selectionRule']})",
        "",
        "> " + metrics["warning"],
        "",
        "## Demonstration labeling criteria",
        "",
        "```json",
        json.dumps(criteria, indent=2),
        "```",
        "",
        "## Pipeline log",
        "",
        "```json",
        json.dumps(metrics["pipelineLog"], indent=2),
        "```",
        "",
        "## Held-out test comparison",
        "",
        "| Model | Accuracy | Precision | Recall | F1 | ROC AUC | CV F1 |",
        "|---|---|---|---|---|---|---|",
    ]
    for algo, m in metrics["comparison"].items():
        lines.append(
            f"| {algo} | {m['accuracy']} | {m['precision']} | {m['recall']} | {m['f1']} | {m['rocAuc']} | {m.get('cvF1', '—')} |"
        )
    cm = metrics["test"]["confusionMatrix"]
    lines += [
        "",
        f"Confusion matrix for the selected model (threshold 0.5): TN={cm['tn']}, FP={cm['fp']}, FN={cm['fn']}, TP={cm['tp']}",
        "",
    ]
    (REPORTS / f"{name}_report.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    run("GOVERNMENT")
    run("BANK")
