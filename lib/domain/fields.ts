import {
  COLLATERAL_TYPES,
  CREDIT_HISTORIES,
  CROP_CATEGORIES,
  FARMER_CATEGORIES,
  IRRIGATION_TYPES,
  LOAN_PURPOSES,
  SUPPORT_PURPOSES,
  label,
  type DocumentType,
  type FinancingRoute,
} from "./constants";
import { INDIAN_STATES } from "./states";

export type FieldKind = "text" | "number" | "integer" | "select" | "boolean" | "state";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  step: number;
  help?: string;
  unit?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  /** Shown only when the predicate returns true for the current values. */
  showIf?: (values: Record<string, unknown>) => boolean;
}

function opts(values: readonly string[]) {
  return values.map((value) => ({ value, label: label(value) }));
}

export const STATE_OPTIONS = INDIAN_STATES.map((state) => ({ value: state.code, label: state.name }));

const sharedPersonal: FieldDef[] = [
  { key: "fullName", label: "Full name (as on identity proof)", kind: "text", step: 0 },
  { key: "age", label: "Age", kind: "integer", step: 0, unit: "years", min: 14, max: 110 },
  { key: "stateCode", label: "State", kind: "state", step: 0, options: STATE_OPTIONS },
  { key: "district", label: "District", kind: "text", step: 0 },
  { key: "village", label: "Village or town", kind: "text", step: 0 },
];

export const GOVERNMENT_FIELDS: FieldDef[] = [
  ...sharedPersonal,
  {
    key: "farmerCategory",
    label: "How do you farm this land?",
    kind: "select",
    step: 1,
    options: opts(FARMER_CATEGORIES),
  },
  {
    key: "landholdingAcres",
    label: "Land you cultivate",
    kind: "number",
    step: 1,
    unit: "acres",
    min: 0,
    max: 1000,
    help: "1 hectare is about 2.47 acres.",
  },
  { key: "cropCategory", label: "Main crop type", kind: "select", step: 1, options: opts(CROP_CATEGORIES) },
  { key: "irrigationType", label: "Water source", kind: "select", step: 1, options: opts(IRRIGATION_TYPES) },
  {
    key: "annualAgriIncome",
    label: "Yearly income from farming",
    kind: "number",
    step: 2,
    unit: "₹ per year",
    min: 0,
    max: 100000000,
  },
  { key: "supportPurpose", label: "What support do you need?", kind: "select", step: 2, options: opts(SUPPORT_PURPOSES) },
  {
    key: "requestedAmount",
    label: "Support amount requested",
    kind: "number",
    step: 2,
    unit: "₹",
    min: 1000,
    max: 10000000,
  },
  { key: "hasBankAccount", label: "Do you have a bank account in your name?", kind: "boolean", step: 2 },
  {
    key: "priorSchemeDefault",
    label: "Did you ever fail to meet the conditions of an earlier government scheme?",
    kind: "boolean",
    step: 2,
  },
];

export const BANK_FIELDS: FieldDef[] = [
  ...sharedPersonal,
  {
    key: "annualIncome",
    label: "Total household income",
    kind: "number",
    step: 1,
    unit: "₹ per year",
    min: 0,
    max: 100000000,
    help: "Include farming and any other regular income.",
  },
  {
    key: "existingMonthlyEmi",
    label: "Current loan repayments",
    kind: "number",
    step: 1,
    unit: "₹ per month",
    min: 0,
    max: 10000000,
    help: "Enter 0 if you have no running loans.",
  },
  { key: "creditHistory", label: "Past loan repayment", kind: "select", step: 1, options: opts(CREDIT_HISTORIES) },
  { key: "yearsFarming", label: "Years of farming experience", kind: "integer", step: 1, unit: "years", min: 0, max: 90 },
  { key: "landholdingAcres", label: "Land you cultivate", kind: "number", step: 1, unit: "acres", min: 0, max: 1000 },
  { key: "loanPurpose", label: "Loan purpose", kind: "select", step: 2, options: opts(LOAN_PURPOSES) },
  { key: "requestedAmount", label: "Loan amount requested", kind: "number", step: 2, unit: "₹", min: 10000, max: 100000000 },
  { key: "tenureMonths", label: "Repayment period", kind: "integer", step: 2, unit: "months", min: 6, max: 120 },
  { key: "collateralType", label: "Security offered (collateral)", kind: "select", step: 2, options: opts(COLLATERAL_TYPES) },
  {
    key: "collateralValue",
    label: "Estimated value of security",
    kind: "number",
    step: 2,
    unit: "₹",
    min: 0,
    max: 1000000000,
    showIf: (values) => Boolean(values.collateralType) && values.collateralType !== "NONE",
  },
];

export const FORM_STEPS: Record<FinancingRoute, string[]> = {
  GOVERNMENT: ["About you", "Your farm", "Support needed", "Documents", "Review and submit"],
  BANK: ["About you", "Income and repayments", "Loan details", "Documents", "Review and submit"],
};

export function fieldsFor(route: FinancingRoute): FieldDef[] {
  return route === "GOVERNMENT" ? GOVERNMENT_FIELDS : BANK_FIELDS;
}

export function fieldLabel(route: FinancingRoute, key: string): string {
  return fieldsFor(route).find((field) => field.key === key)?.label ?? key;
}

/** Identity and address text that neither the model nor the rules read. */
const NON_ASSESSED_FIELDS = new Set(["fullName", "district", "village"]);

/**
 * Fields that feed the model or rules. A change in any of them makes earlier assessments stale.
 * Derived from the form definitions (everything except the fields above) so a new input cannot be forgotten.
 */
export const ASSESSMENT_FIELDS: Record<FinancingRoute, string[]> = {
  GOVERNMENT: GOVERNMENT_FIELDS.map((field) => field.key).filter((key) => !NON_ASSESSED_FIELDS.has(key)),
  BANK: BANK_FIELDS.map((field) => field.key).filter((key) => !NON_ASSESSED_FIELDS.has(key)),
};

export interface DocumentRequirement {
  type: DocumentType;
  requiredToSubmit: boolean;
  reason: string;
}

/** Documents expected for an application. Only identity proof blocks submission; others are checked during review. */
export function documentRequirements(
  route: FinancingRoute,
  values: Record<string, unknown>,
): DocumentRequirement[] {
  const list: DocumentRequirement[] = [
    { type: "IDENTITY_PROOF", requiredToSubmit: true, reason: "Confirms who is applying." },
  ];
  if (route === "GOVERNMENT") {
    if (values.farmerCategory === "OWNER" || !values.farmerCategory) {
      list.push({ type: "LAND_RECORD", requiredToSubmit: false, reason: "Shows the land you own." });
    } else {
      list.push({
        type: "TENANCY_AGREEMENT",
        requiredToSubmit: false,
        reason: "Shows the land you cultivate as a tenant or sharecropper.",
      });
    }
    list.push({ type: "BANK_PASSBOOK", requiredToSubmit: false, reason: "Needed to receive any support payment." });
  } else {
    list.push({ type: "INCOME_PROOF", requiredToSubmit: false, reason: "Supports the income you entered." });
    list.push({ type: "BANK_STATEMENT", requiredToSubmit: false, reason: "Shows recent account activity." });
    if (typeof values.landholdingAcres === "number" && values.landholdingAcres > 0) {
      list.push({ type: "LAND_RECORD", requiredToSubmit: false, reason: "Shows the land you cultivate." });
    }
    if (values.collateralType && values.collateralType !== "NONE") {
      list.push({
        type: "COLLATERAL_DOCUMENT",
        requiredToSubmit: false,
        reason: "Proves ownership and value of the security offered.",
      });
    }
  }
  return list;
}
