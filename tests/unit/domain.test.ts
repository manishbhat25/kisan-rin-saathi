import { describe, expect, it } from "vitest";
import { STATUSES } from "@/lib/domain/constants";
import { bankSubmitSchema, governmentDraftSchema } from "@/lib/domain/schemas";
import { TRANSITIONS, availableActions, canPerform } from "@/lib/domain/stateMachine";
import { normalizeState } from "@/lib/domain/states";
import { ASSESSMENT_FIELDS } from "@/lib/domain/fields";
import { safeNextPath } from "@/lib/domain/redirect";

describe("safeNextPath", () => {
  it.each(["/farmer", "/farmer/applications?x=1"])("allows same-site path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "/\tx", "", undefined])("rejects %s", (path) => {
    expect(safeNextPath(path)).toBeNull();
  });
});

describe("ASSESSMENT_FIELDS", () => {
  it("includes every model input, including support purpose", () => {
    expect(ASSESSMENT_FIELDS.GOVERNMENT).toContain("supportPurpose");
    expect(ASSESSMENT_FIELDS.BANK).toContain("collateralValue");
    expect(ASSESSMENT_FIELDS.GOVERNMENT).not.toContain("fullName");
  });
});

describe("normalizeState", () => {
  it.each([
    ["Gujarat", "GJ"],
    ["GUJ", "GJ"],
    ["Gujrat", "GJ"],
    ["gj", "GJ"],
    ["Orissa", "OD"],
    ["U.P.", "UP"],
    ["Tamilnadu", "TN"],
    ["गुजरात", "GJ"],
  ])("maps %s to %s", (input, code) => {
    expect(normalizeState(input)?.code).toBe(code);
  });

  it.each(["", "Unknown", "Atlantis", "xyz"])("returns null for %s instead of guessing", (input) => {
    expect(normalizeState(input)).toBeNull();
  });
});

describe("state machine", () => {
  it("uses only known statuses", () => {
    for (const transition of TRANSITIONS) {
      expect(STATUSES).toContain(transition.from);
      expect(STATUSES).toContain(transition.to);
    }
  });

  it("never lets an applicant approve or reject", () => {
    for (const status of STATUSES) {
      expect(canPerform(status, "APPROVE", "APPLICANT")).toBe(false);
      expect(canPerform(status, "REJECT", "APPLICANT")).toBe(false);
    }
  });

  it("requires an assessment or escalation before approval", () => {
    expect(canPerform("SUBMITTED", "APPROVE", "OFFICER")).toBe(false);
    expect(canPerform("UNDER_REVIEW", "APPROVE", "OFFICER")).toBe(false);
    expect(canPerform("ASSESSMENT_COMPLETED", "APPROVE", "OFFICER")).toBe(true);
  });

  it("blocks all actions on terminal statuses", () => {
    for (const status of ["APPROVED", "REJECTED", "WITHDRAWN"] as const) {
      expect(availableActions(status, "OFFICER")).toEqual([]);
      expect(availableActions(status, "APPLICANT")).toEqual([]);
    }
  });

  it("supports the correction loop", () => {
    expect(canPerform("ASSESSMENT_COMPLETED", "REQUEST_CHANGES", "OFFICER")).toBe(true);
    expect(canPerform("CHANGES_REQUESTED", "RESUBMIT", "APPLICANT")).toBe(true);
    expect(canPerform("RESUBMITTED", "START_REVIEW", "OFFICER")).toBe(true);
  });
});

describe("schemas", () => {
  it("drafts reject wrong types and unknown fields", () => {
    expect(governmentDraftSchema.safeParse({ age: "forty" }).success).toBe(false);
    expect(governmentDraftSchema.safeParse({ approved: true }).success).toBe(false);
    expect(governmentDraftSchema.safeParse({ age: 40 }).success).toBe(true);
  });

  it("bank submission requires collateral value when collateral is offered", () => {
    const base = {
      fullName: "A B",
      age: 30,
      stateCode: "GJ",
      district: "Anand",
      village: "X",
      annualIncome: 300000,
      existingMonthlyEmi: 0,
      creditHistory: "GOOD",
      yearsFarming: 5,
      landholdingAcres: 3,
      loanPurpose: "EQUIPMENT",
      requestedAmount: 200000,
      tenureMonths: 36,
      collateralType: "LAND",
    };
    expect(bankSubmitSchema.safeParse(base).success).toBe(false);
    expect(bankSubmitSchema.safeParse({ ...base, collateralValue: 400000 }).success).toBe(true);
    expect(bankSubmitSchema.safeParse({ ...base, collateralType: "NONE", requestedAmount: -5 }).success).toBe(false);
  });
});
