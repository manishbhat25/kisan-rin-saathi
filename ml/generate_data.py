"""Generates seeded synthetic raw datasets for both routes.

The raw files intentionally contain the problems a real intake would have:
state-name variants, missing values, a few impossible values and duplicate rows.
Labels follow the documented demonstration criteria (see docs/ML_PIPELINES.md)
with a small amount of label noise so the models are not exact rule copies.
These are NOT real scheme or bank criteria.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from common import DATA_RAW, SEED, load_states

STATE_VARIANTS = {
    "GJ": ["Gujarat", "GUJ", "Gujrat", "gujarat "],
    "RJ": ["Rajasthan", "RJ", "rajasthaan"],
    "MH": ["Maharashtra", "Maharastra", "MH"],
    "UP": ["Uttar Pradesh", "U.P.", "uttarpradesh"],
    "PB": ["Punjab", "panjab"],
    "MP": ["Madhya Pradesh", "M.P."],
    "KA": ["Karnataka", "karnatak"],
    "OD": ["Odisha", "Orissa"],
}

GOV_CRITERIA = {
    "ageRange": [18, 70],
    "maxLandholdingAcres": 5.0,
    "maxAnnualAgriIncome": 250000,
    "maxRequestedAmount": 100000,
    "requiresBankAccount": True,
    "excludesPriorSchemeDefault": True,
    "labelNoise": 0.05,
}

BANK_CRITERIA = {
    "ageRange": [21, 65],
    "maxRepaymentBurden": 0.5,
    "maxLoanToIncome": 3.0,
    "minYearsFarming": 2,
    "unsecuredLimit": 160000,
    "minCollateralCoverage": 1.0,
    "excludesCreditHistory": ["POOR"],
    "fairHistoryApprovalRate": 0.75,
    "labelNoise": 0.04,
}


def _states(rng, n):
    codes = list(STATE_VARIANTS)
    picked = rng.choice(codes, n)
    other = [s["code"] for s in load_states()]
    values = []
    for code in picked:
        roll = rng.random()
        if roll < 0.85:
            values.append(rng.choice(STATE_VARIANTS[code]))
        elif roll < 0.97:
            values.append(rng.choice(other))
        else:
            values.append(rng.choice(["Unknown", "xyz", ""]))
    return values


def _blank(rng, series: pd.Series, rate: float) -> pd.Series:
    mask = rng.random(len(series)) < rate
    return series.mask(mask)


def government(n: int, rng) -> pd.DataFrame:
    df = pd.DataFrame(
        {
            "age": rng.integers(16, 85, n),
            "state": _states(rng, n),
            "farmerCategory": rng.choice(["OWNER", "TENANT", "SHARECROPPER"], n, p=[0.6, 0.28, 0.12]),
            "landholdingAcres": np.round(rng.gamma(2.0, 2.2, n), 2),
            "cropCategory": rng.choice(["CEREAL", "PULSE", "OILSEED", "CASH_CROP", "HORTICULTURE"], n),
            "irrigationType": rng.choice(["RAINFED", "IRRIGATED", "MIXED"], n, p=[0.45, 0.35, 0.2]),
            "annualAgriIncome": np.round(rng.lognormal(11.9, 0.6, n), -2),
            "supportPurpose": rng.choice(["INPUT_SUPPORT", "IRRIGATION_SUPPORT", "EQUIPMENT_SUPPORT"], n),
            "requestedAmount": np.round(rng.lognormal(10.9, 0.7, n), -2),
            "hasBankAccount": rng.random(n) < 0.88,
            "priorSchemeDefault": rng.random(n) < 0.08,
        }
    )
    c = GOV_CRITERIA
    rule = (
        df.age.between(*c["ageRange"])
        & (df.landholdingAcres <= c["maxLandholdingAcres"])
        & (df.annualAgriIncome <= c["maxAnnualAgriIncome"])
        & (df.requestedAmount <= c["maxRequestedAmount"])
        & df.hasBankAccount
        & ~df.priorSchemeDefault
    )
    flip = rng.random(n) < c["labelNoise"]
    df["eligible"] = (rule ^ flip).astype(int)

    df["landholdingAcres"] = _blank(rng, df.landholdingAcres, 0.03)
    df["irrigationType"] = _blank(rng, df.irrigationType, 0.04)
    bad = rng.random(n) < 0.01
    df.loc[bad, "annualAgriIncome"] = -1
    dupes = df.sample(frac=0.02, random_state=SEED)
    return pd.concat([df, dupes], ignore_index=True)


def bank(n: int, rng) -> pd.DataFrame:
    collateral_type = rng.choice(["NONE", "LAND", "GOLD", "MACHINERY", "OTHER"], n, p=[0.4, 0.3, 0.15, 0.1, 0.05])
    requested = np.round(rng.lognormal(12.0, 0.8, n), -3)
    collateral_value = np.where(collateral_type == "NONE", 0.0, np.round(requested * rng.uniform(0.3, 2.5, n), -3))
    df = pd.DataFrame(
        {
            "age": rng.integers(18, 80, n),
            "state": _states(rng, n),
            "annualIncome": np.round(rng.lognormal(12.4, 0.55, n), -2),
            "existingMonthlyEmi": np.where(rng.random(n) < 0.45, 0, np.round(rng.lognormal(8.3, 0.7, n), -1)),
            "creditHistory": rng.choice(["NO_HISTORY", "GOOD", "FAIR", "POOR"], n, p=[0.25, 0.45, 0.2, 0.1]),
            "yearsFarming": rng.integers(0, 40, n),
            "landholdingAcres": np.round(rng.gamma(2.0, 2.5, n), 2),
            "loanPurpose": rng.choice(["CROP_PRODUCTION", "EQUIPMENT", "LAND_DEVELOPMENT", "DAIRY_LIVESTOCK", "STORAGE"], n),
            "requestedAmount": requested,
            "tenureMonths": rng.choice([12, 24, 36, 48, 60, 84], n),
            "collateralType": collateral_type,
            "collateralValue": collateral_value,
        }
    )
    c = BANK_CRITERIA
    monthly_income = df.annualIncome / 12
    burden = (df.existingMonthlyEmi + df.requestedAmount / df.tenureMonths) / monthly_income
    coverage = df.collateralValue / df.requestedAmount
    rule = (
        df.age.between(*c["ageRange"])
        & (burden <= c["maxRepaymentBurden"])
        & (df.requestedAmount / df.annualIncome <= c["maxLoanToIncome"])
        & (df.yearsFarming >= c["minYearsFarming"])
        & ((df.requestedAmount <= c["unsecuredLimit"]) | (coverage >= c["minCollateralCoverage"]))
        & ~df.creditHistory.isin(c["excludesCreditHistory"])
    )
    fair_penalty = (df.creditHistory == "FAIR") & (rng.random(n) > c["fairHistoryApprovalRate"])
    rule = rule & ~fair_penalty
    flip = rng.random(n) < c["labelNoise"]
    df["eligible"] = (rule ^ flip).astype(int)

    df["landholdingAcres"] = _blank(rng, df.landholdingAcres, 0.03)
    df["existingMonthlyEmi"] = _blank(rng, df.existingMonthlyEmi, 0.03)
    bad = rng.random(n) < 0.01
    df.loc[bad, "tenureMonths"] = 0
    dupes = df.sample(frac=0.02, random_state=SEED)
    return pd.concat([df, dupes], ignore_index=True)


def main() -> None:
    rng = np.random.default_rng(SEED)
    DATA_RAW.mkdir(parents=True, exist_ok=True)
    government(6000, rng).to_csv(DATA_RAW / "government_raw.csv", index=False)
    bank(6000, rng).to_csv(DATA_RAW / "bank_raw.csv", index=False)
    print("Wrote synthetic raw datasets to", DATA_RAW)


if __name__ == "__main__":
    main()
