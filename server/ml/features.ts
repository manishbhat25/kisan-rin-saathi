import type { ExportedModel } from "./model";

export type RawInput = Record<string, unknown>;

/** Must stay identical to add_bank_features() in ml/pipelines.py. */
export function engineeredFeatures(input: RawInput): Record<string, number> {
  const income = Number(input.annualIncome);
  const requested = Number(input.requestedAmount);
  const tenure = Number(input.tenureMonths);
  const emi = Number(input.existingMonthlyEmi ?? 0);
  const collateral = Number(input.collateralValue ?? 0);
  return {
    repaymentBurden: (emi + requested / tenure) / (income / 12),
    loanToIncome: requested / income,
    collateralCoverage: collateral / requested,
  };
}

export function withEngineered(model: ExportedModel, input: RawInput): RawInput {
  const filled: RawInput = { ...input };
  for (const [key, value] of Object.entries(model.imputation)) {
    if (filled[key] === null || filled[key] === undefined) filled[key] = value;
  }
  if (model.route === "BANK") {
    if (filled.collateralValue == null) filled.collateralValue = 0;
    Object.assign(filled, engineeredFeatures(filled));
  }
  return filled;
}

export function encodeFeatures(model: ExportedModel, input: RawInput): number[] {
  const filled = withEngineered(model, input);
  const vector: number[] = [];
  for (const key of [...model.encoding.numeric, ...model.encoding.engineered]) {
    const value = Number(filled[key]);
    if (!Number.isFinite(value)) throw new Error(`Feature ${key} is missing or not a number`);
    vector.push(value);
  }
  for (const key of model.encoding.boolean) {
    if (typeof filled[key] !== "boolean") throw new Error(`Feature ${key} must be yes or no`);
    vector.push(filled[key] ? 1 : 0);
  }
  for (const [key, categories] of Object.entries(model.encoding.categorical)) {
    for (const category of categories) vector.push(filled[key] === category ? 1 : 0);
  }
  return vector;
}
