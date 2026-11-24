# Bank eligibility model report

Model version: `bank-dt-552465725c`  
Selected algorithm: **DecisionTreeClassifier** (highest 5-fold cross-validated F1 on the training split)

> Synthetic data. These metrics measure agreement with the demonstration labeling criteria only, not real-world creditworthiness.

## Demonstration labeling criteria

```json
{
  "ageRange": [
    21,
    65
  ],
  "maxRepaymentBurden": 0.5,
  "maxLoanToIncome": 3.0,
  "minYearsFarming": 2,
  "unsecuredLimit": 160000,
  "minCollateralCoverage": 1.0,
  "excludesCreditHistory": [
    "POOR"
  ],
  "fairHistoryApprovalRate": 0.75,
  "labelNoise": 0.04
}
```

## Pipeline log

```json
{
  "rawRows": 6120,
  "afterExactDedupe": 6000,
  "unrecognisedStates": 172,
  "invalidRowsDropped": 56,
  "missingValuesBeforeImputation": {
    "existingMonthlyEmi": 177,
    "landholdingAcres": 197
  },
  "afterFeatureDedupe": 5772,
  "trainRows": 4617,
  "testRows": 1155,
  "positiveRateTrain": 0.3008
}
```

## Held-out test comparison

| Model | Accuracy | Precision | Recall | F1 | ROC AUC | CV F1 |
|---|---|---|---|---|---|---|
| MajorityClassBaseline | 0.6987 | 0.0 | 0.0 | 0.0 | 0.5 | — |
| DecisionTreeClassifier | 0.9229 | 0.8607 | 0.8879 | 0.8741 | 0.9194 | 0.8933 |
| RandomForestClassifier | 0.9117 | 0.8237 | 0.8994 | 0.8599 | 0.9221 | 0.8722 |

Confusion matrix for the selected model (threshold 0.5): TN=757, FP=50, FN=39, TP=309
