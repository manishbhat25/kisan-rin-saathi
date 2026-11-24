export const ROLES = ["FARMER", "GOV_OFFICER", "BANK_OFFICER", "OPERATOR"] as const;
export type Role = (typeof ROLES)[number];

export const ROUTES = ["GOVERNMENT", "BANK"] as const;
export type FinancingRoute = (typeof ROUTES)[number];

export const STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "ASSESSMENT_PENDING",
  "ASSESSMENT_COMPLETED",
  "CHANGES_REQUESTED",
  "RESUBMITTED",
  "HUMAN_REVIEW_REQUIRED",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type ApplicationStatus = (typeof STATUSES)[number];

export const TERMINAL_STATUSES: ApplicationStatus[] = ["APPROVED", "REJECTED", "WITHDRAWN"];

export const OUTCOMES = ["ELIGIBLE", "NOT_ELIGIBLE", "NEEDS_REVIEW"] as const;
export type AssessmentOutcome = (typeof OUTCOMES)[number];

export const DECISIONS = ["APPROVED", "REJECTED", "ESCALATED"] as const;
export type DecisionKind = (typeof DECISIONS)[number];

export const FARMER_CATEGORIES = ["OWNER", "TENANT", "SHARECROPPER"] as const;
export const CROP_CATEGORIES = ["CEREAL", "PULSE", "OILSEED", "CASH_CROP", "HORTICULTURE"] as const;
export const IRRIGATION_TYPES = ["RAINFED", "IRRIGATED", "MIXED"] as const;
export const SUPPORT_PURPOSES = ["INPUT_SUPPORT", "IRRIGATION_SUPPORT", "EQUIPMENT_SUPPORT"] as const;
export const LOAN_PURPOSES = [
  "CROP_PRODUCTION",
  "EQUIPMENT",
  "LAND_DEVELOPMENT",
  "DAIRY_LIVESTOCK",
  "STORAGE",
] as const;
export const COLLATERAL_TYPES = ["NONE", "LAND", "GOLD", "MACHINERY", "OTHER"] as const;
export const CREDIT_HISTORIES = ["NO_HISTORY", "GOOD", "FAIR", "POOR"] as const;

export const DOCUMENT_TYPES = [
  "IDENTITY_PROOF",
  "LAND_RECORD",
  "BANK_PASSBOOK",
  "TENANCY_AGREEMENT",
  "INCOME_PROOF",
  "BANK_STATEMENT",
  "COLLATERAL_DOCUMENT",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const ROUTE_ORG_CODE: Record<FinancingRoute, string> = {
  GOVERNMENT: "GOV_AGRI_DEPT",
  BANK: "DEMO_BANK",
};

export const OFFICER_ROLE_FOR_ROUTE: Record<FinancingRoute, Role> = {
  GOVERNMENT: "GOV_OFFICER",
  BANK: "BANK_OFFICER",
};

export function routeForOfficerRole(role: Role): FinancingRoute | null {
  if (role === "GOV_OFFICER") return "GOVERNMENT";
  if (role === "BANK_OFFICER") return "BANK";
  return null;
}

export function isOfficer(role: Role): boolean {
  return role === "GOV_OFFICER" || role === "BANK_OFFICER";
}

export const LABELS: Record<string, string> = {
  GOVERNMENT: "Government scheme",
  BANK: "Bank loan",
  OWNER: "Land owner",
  TENANT: "Tenant farmer",
  SHARECROPPER: "Sharecropper",
  CEREAL: "Cereals (wheat, rice, millets)",
  PULSE: "Pulses",
  OILSEED: "Oilseeds",
  CASH_CROP: "Cash crops (cotton, sugarcane)",
  HORTICULTURE: "Fruits and vegetables",
  RAINFED: "Rain-fed",
  IRRIGATED: "Irrigated",
  MIXED: "Partly irrigated",
  INPUT_SUPPORT: "Seeds, fertiliser and inputs",
  IRRIGATION_SUPPORT: "Irrigation support",
  EQUIPMENT_SUPPORT: "Small equipment support",
  CROP_PRODUCTION: "Crop production",
  EQUIPMENT: "Farm equipment",
  LAND_DEVELOPMENT: "Land development",
  DAIRY_LIVESTOCK: "Dairy and livestock",
  STORAGE: "Storage and warehousing",
  NONE: "No collateral",
  LAND: "Agricultural land",
  GOLD: "Gold",
  MACHINERY: "Machinery",
  OTHER: "Other",
  NO_HISTORY: "No previous loans",
  GOOD: "Repaid on time",
  FAIR: "Some late payments",
  POOR: "Missed or defaulted payments",
  IDENTITY_PROOF: "Identity proof",
  LAND_RECORD: "Land record",
  BANK_PASSBOOK: "Bank passbook",
  TENANCY_AGREEMENT: "Tenancy or lease agreement",
  INCOME_PROOF: "Income proof",
  BANK_STATEMENT: "Bank statement (6 months)",
  COLLATERAL_DOCUMENT: "Collateral document",
  ELIGIBLE: "Likely eligible",
  NOT_ELIGIBLE: "Likely not eligible",
  NEEDS_REVIEW: "Needs officer review",
  FARMER: "Farmer",
  GOV_OFFICER: "Government officer",
  BANK_OFFICER: "Bank officer",
  OPERATOR: "Service-centre operator",
  SELF: "Self-submitted",
  ASSISTED: "Assisted by service centre",
};

export function label(value: string | null | undefined): string {
  if (!value) return "—";
  return LABELS[value] ?? value;
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ASSESSMENT_PENDING: "Assessment running",
  ASSESSMENT_COMPLETED: "Assessment completed",
  CHANGES_REQUESTED: "Action required",
  RESUBMITTED: "Resubmitted",
  HUMAN_REVIEW_REQUIRED: "Escalated for review",
  APPROVED: "Approved (demo)",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};
