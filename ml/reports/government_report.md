# Government eligibility model report

Model version: `gov-dt-10b2305db4`  
Selected algorithm: **DecisionTreeClassifier** (highest 5-fold cross-validated F1 on the training split)

> Synthetic data. These metrics measure agreement with the demonstration labeling criteria only, not real-world creditworthiness.

## Demonstration labeling criteria

```json
{
  "ageRange": [
    18,
    70
  ],
  "maxLandholdingAcres": 5.0,
  "maxAnnualAgriIncome": 250000,
  "maxRequestedAmount": 100000,
  "requiresBankAccount": true,
  "excludesPriorSchemeDefault": true,
  "labelNoise": 0.05
}
```

## Pipeline log

```json
{
  "rawRows": 6120,
  "afterExactDedupe": 6000,
  "unrecognisedStates": 180,
  "invalidRowsDropped": 53,
  "missingValuesBeforeImputation": {
    "landholdingAcres": 187,
    "irrigationType": 243
  },
  "afterFeatureDedupe": 5767,
  "trainRows": 4613,
  "testRows": 1154,
  "positiveRateTrain": 0.292
}
```

## Held-out test comparison

| Model | Accuracy | Precision | Recall | F1 | ROC AUC | CV F1 |
|---|---|---|---|---|---|---|
| MajorityClassBaseline | 0.708 | 0.0 | 0.0 | 0.0 | 0.5 | — |
| DecisionTreeClassifier | 0.9359 | 0.9097 | 0.8665 | 0.8875 | 0.9115 | 0.9099 |

Confusion matrix for the selected model (threshold 0.5): TN=788, FP=29, FN=45, TP=292
