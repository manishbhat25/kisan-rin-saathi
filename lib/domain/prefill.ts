/** Fields that may be copied into a new application on the other route, with the farmer's consent. */
export const SHARED_PREFILL_FIELDS = ["fullName", "age", "stateCode", "district", "village", "landholdingAcres"] as const;

export const OPTIONAL_PREFILL: Record<string, { from: string; to: string; label: string }[]> = {
  "GOVERNMENT->BANK": [{ from: "annualAgriIncome", to: "annualIncome", label: "Yearly farm income → household income" }],
  "BANK->GOVERNMENT": [],
};
