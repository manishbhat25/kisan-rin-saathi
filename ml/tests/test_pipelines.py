import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from common import ARTIFACTS, DATA_CLEAN, encode, normalize_state  # noqa: E402
from pipelines import BANK_SPEC, GOV_SPEC, add_bank_features  # noqa: E402


@pytest.mark.parametrize(
    "value,expected",
    [
        ("Gujarat", "GJ"),
        ("GUJ", "GJ"),
        ("Gujrat", "GJ"),
        ("  gujarat ", "GJ"),
        ("U.P.", "UP"),
        ("Orissa", "OD"),
        ("rajasthaan", "RJ"),
        ("Maharastra", "MH"),
        ("Unknown", None),
        ("xyz", None),
        ("", None),
        (None, None),
    ],
)
def test_state_normalisation(value, expected):
    assert normalize_state(value) == expected


@pytest.mark.parametrize("name,spec", [("government", GOV_SPEC), ("bank", BANK_SPEC)])
def test_artifacts_match_joblib_model(name, spec):
    payload = json.loads((ARTIFACTS / f"{name}_model.json").read_text(encoding="utf-8"))
    parity = json.loads((ARTIFACTS / f"{name}_parity.json").read_text(encoding="utf-8"))
    model = joblib.load(ARTIFACTS / f"{name}_model.joblib")
    assert payload["featureNames"] == spec.feature_names()
    assert parity["version"] == payload["version"]
    df = pd.DataFrame(parity["rows"])
    if name == "bank":
        df = add_bank_features(df)
    proba = model.predict_proba(encode(df, spec))[:, 1]
    assert np.allclose(proba, parity["probabilities"])


@pytest.mark.parametrize("name", ["government", "bank"])
def test_clean_data_has_no_feature_duplicates_or_missing(name):
    df = pd.read_csv(DATA_CLEAN / f"{name}_clean.csv")
    spec = GOV_SPEC if name == "government" else BANK_SPEC
    cols = [*spec.numeric, *spec.boolean, *spec.categorical]
    assert not df[cols].isna().any().any()
    assert not df.duplicated(subset=[*cols, "stateCode"]).any()
    assert df.stateCode.notna().all()


@pytest.mark.parametrize("name", ["government", "bank"])
def test_model_beats_majority_baseline(name):
    metrics = json.loads((Path(ARTIFACTS).parent / "reports" / f"{name}_metrics.json").read_text(encoding="utf-8"))
    selected = metrics["comparison"][metrics["selected"]]
    baseline = metrics["comparison"]["MajorityClassBaseline"]
    assert selected["f1"] > baseline["f1"]
    assert selected["accuracy"] > baseline["accuracy"]
