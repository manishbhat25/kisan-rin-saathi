import { z } from "zod";
import {
  COLLATERAL_TYPES,
  CREDIT_HISTORIES,
  CROP_CATEGORIES,
  DOCUMENT_TYPES,
  FARMER_CATEGORIES,
  IRRIGATION_TYPES,
  LOAN_PURPOSES,
  ROUTES,
  SUPPORT_PURPOSES,
} from "./constants";
import { INDIAN_STATES } from "./states";

const stateCodes = INDIAN_STATES.map((state) => state.code) as [string, ...string[]];

const text = (max: number) => z.string().trim().min(1, "Please fill this in").max(max, `Keep this under ${max} characters`);
const money = (min: number, max: number) =>
  z
    .number({ invalid_type_error: "Enter a number" })
    .finite("Enter a valid number")
    .min(min, `Must be at least ${min.toLocaleString("en-IN")}`)
    .max(max, `Must be at most ${max.toLocaleString("en-IN")}`);
const int = (min: number, max: number) =>
  z
    .number({ invalid_type_error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(min, `Must be at least ${min}`)
    .max(max, `Must be at most ${max}`);

const personal = {
  fullName: text(120),
  age: int(14, 110),
  stateCode: z.enum(stateCodes, { errorMap: () => ({ message: "Choose a state from the list" }) }),
  district: text(80),
  village: text(80),
};

export const governmentSubmitSchema = z.object({
  ...personal,
  farmerCategory: z.enum(FARMER_CATEGORIES, { errorMap: () => ({ message: "Choose one option" }) }),
  landholdingAcres: money(0, 1000),
  cropCategory: z.enum(CROP_CATEGORIES, { errorMap: () => ({ message: "Choose one option" }) }),
  irrigationType: z.enum(IRRIGATION_TYPES, { errorMap: () => ({ message: "Choose one option" }) }),
  annualAgriIncome: money(0, 100000000),
  supportPurpose: z.enum(SUPPORT_PURPOSES, { errorMap: () => ({ message: "Choose one option" }) }),
  requestedAmount: money(1000, 10000000),
  hasBankAccount: z.boolean({ required_error: "Choose yes or no", invalid_type_error: "Choose yes or no" }),
  priorSchemeDefault: z.boolean({ required_error: "Choose yes or no", invalid_type_error: "Choose yes or no" }),
});

export const bankSubmitSchema = z
  .object({
    ...personal,
    annualIncome: money(1, 100000000),
    existingMonthlyEmi: money(0, 10000000),
    creditHistory: z.enum(CREDIT_HISTORIES, { errorMap: () => ({ message: "Choose one option" }) }),
    yearsFarming: int(0, 90),
    landholdingAcres: money(0, 1000),
    loanPurpose: z.enum(LOAN_PURPOSES, { errorMap: () => ({ message: "Choose one option" }) }),
    requestedAmount: money(10000, 100000000),
    tenureMonths: int(6, 120),
    collateralType: z.enum(COLLATERAL_TYPES, { errorMap: () => ({ message: "Choose one option" }) }),
    collateralValue: money(0, 1000000000).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.collateralType !== "NONE" && (value.collateralValue == null || value.collateralValue <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["collateralValue"],
        message: "Enter the estimated value of the security",
      });
    }
  });

/** Drafts accept partial data but still reject wrong types and out-of-range numbers. */
function draftOf<T extends z.ZodRawShape>(shape: T) {
  const entries = Object.entries(shape).map(([key, schema]) => [
    key,
    (schema as z.ZodTypeAny).nullable().optional(),
  ]);
  return z.object(Object.fromEntries(entries) as { [K in keyof T]: z.ZodOptional<z.ZodNullable<T[K]>> }).strict();
}

export const governmentDraftSchema = draftOf(governmentSubmitSchema.shape);
export const bankDraftSchema = draftOf(bankSubmitSchema._def.schema.shape);

export type GovernmentDetails = z.infer<typeof governmentSubmitSchema>;
export type BankDetails = z.infer<typeof bankSubmitSchema>;
export type DetailsInput = Record<string, string | number | boolean | null | undefined>;

export function draftSchemaFor(route: (typeof ROUTES)[number]) {
  return route === "GOVERNMENT" ? governmentDraftSchema : bankDraftSchema;
}

export function submitSchemaFor(route: (typeof ROUTES)[number]) {
  return route === "GOVERNMENT" ? governmentSubmitSchema : bankSubmitSchema;
}

export const createApplicationSchema = z.object({
  route: z.enum(ROUTES),
  clientRequestId: z.string().uuid(),
  farmerId: z.string().min(1).optional(),
  parentApplicationId: z.string().min(1).optional(),
  prefillFields: z.array(z.string()).max(30).optional(),
  details: z.record(z.unknown()).optional(),
});

export const updateDetailsSchema = z.object({
  expectedVersion: z.number().int().positive(),
  details: z.record(z.unknown()),
  responses: z.record(z.string().max(500)).optional(),
});

export const versionSchema = z.object({ expectedVersion: z.number().int().positive() });

export const reviewItemSchema = z
  .object({
    itemType: z.enum(["FIELD", "DOCUMENT", "GENERAL"]),
    fieldKey: z.string().max(60).optional(),
    documentType: z.enum(DOCUMENT_TYPES).optional(),
    message: z.string().trim().min(5, "Explain what needs to change").max(500),
  })
  .superRefine((item, ctx) => {
    if (item.itemType === "FIELD" && !item.fieldKey) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fieldKey"], message: "Choose the field to correct" });
    }
    if (item.itemType === "DOCUMENT" && !item.documentType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["documentType"], message: "Choose the document" });
    }
  });

export const sendReviewSchema = z.object({
  expectedVersion: z.number().int().positive(),
  summary: z.string().trim().min(10, "Write a short summary for the farmer").max(2000),
  nextSteps: z.string().trim().max(1000).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
    .optional()
    .or(z.literal("")),
  items: z.array(reviewItemSchema).min(1, "Add at least one requested change").max(20),
});

export const internalNoteSchema = z.object({
  summary: z.string().trim().min(2).max(2000),
});

export const decisionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  decision: z.enum(["APPROVED", "REJECTED", "ESCALATED"]),
  reason: z.string().trim().max(2000).default(""),
  conditions: z.string().trim().max(1000).optional(),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(100)
    .regex(/[A-Za-z]/, "Include at least one letter")
    .regex(/\d/, "Include at least one number"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(100),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  age: int(14, 110).nullable().optional(),
  stateCode: z.enum(stateCodes).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  village: z.string().trim().max(80).nullable().optional(),
  farmerCategory: z.enum(FARMER_CATEGORIES).nullable().optional(),
  landholdingAcres: money(0, 1000).nullable().optional(),
  primaryCrop: z.string().trim().max(60).nullable().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")
    .nullable()
    .optional()
    .or(z.literal("")),
  preferredLanguage: z.enum(["en", "hi"]).optional(),
});

export const operatorLinkSchema = z.object({
  farmerEmail: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the farmer"),
  consentConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Confirm that the farmer has agreed to your help" }),
  }),
});
