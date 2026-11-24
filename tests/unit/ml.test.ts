import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAssessment } from "@/server/ml/assess";
import { encodeFeatures } from "@/server/ml/features";
import { ModelArtifactError, loadModel, predictProbability } from "@/server/ml/model";
import { DEFAULT_RULES } from "@/server/ml/rules";

function parity(name: string) {
  return JSON.parse(readFileSync(path.join("ml", "artifacts", `${name}_parity.json`), "utf-8")) as {
    version: string;
    rows: Record<string, unknown>[];
    probabilities: number[];
  };
}

describe("TypeScript inference matches scikit-learn", () => {
  for (const [route, name] of [
    ["GOVERNMENT", "government"],
    ["BANK", "bank"],
  ] as const) {
    it(`${route} predictions equal predict_proba on the held-out sample`, () => {
      const { model } = loadModel(route);
      const fixture = parity(name);
      expect(fixture.version).toBe(model.version);
      fixture.rows.forEach((row, index) => {
        const probability = predictProbability(model, encodeFeatures(model, row));
        expect(probability).toBeCloseTo(fixture.probabilities[index], 9);
      });
    });
  }
});

const strongGov = {
  fullName: "Test Farmer",
  age: 40,
  stateCode: "GJ",
  district: "Anand",
  village: "Test",
  farmerCategory: "OWNER",
  landholdingAcres: 2.5,
  cropCategory: "CEREAL",
  irrigationType: "RAINFED",
  annualAgriIncome: 120000,
  supportPurpose: "INPUT_SUPPORT",
  requestedAmount: 40000,
  hasBankAccount: true,
  priorSchemeDefault: false,
};

describe("assessment outcomes", () => {
  it("marks a strong government applicant with all documents as eligible", () => {
    const result = runAssessment({
      route: "GOVERNMENT",
      details: strongGov,
      documentTypes: ["IDENTITY_PROOF", "LAND_RECORD", "BANK_PASSBOOK"],
      rules: DEFAULT_RULES.GOVERNMENT,
    });
    expect(result.outcome).toBe("ELIGIBLE");
    expect(result.explanation.decisionPath.length).toBeGreaterThan(0);
  });

  it("flags missing documents as needing review rather than eligible", () => {
    const result = runAssessment({
      route: "GOVERNMENT",
      details: strongGov,
      documentTypes: ["IDENTITY_PROOF"],
      rules: DEFAULT_RULES.GOVERNMENT,
    });
    expect(result.outcome).toBe("NEEDS_REVIEW");
    expect(result.ruleResults.find((rule) => rule.id === "DOC_LAND_RECORD")?.passed).toBe(false);
  });

  it("marks a large farm with high income as not eligible with reasons", () => {
    const result = runAssessment({
      route: "GOVERNMENT",
      details: { ...strongGov, landholdingAcres: 22, annualAgriIncome: 900000, requestedAmount: 300000 },
      documentTypes: ["IDENTITY_PROOF", "LAND_RECORD", "BANK_PASSBOOK"],
      rules: DEFAULT_RULES.GOVERNMENT,
    });
    expect(result.outcome).toBe("NOT_ELIGIBLE");
    expect(result.ruleResults.filter((rule) => !rule.passed).map((rule) => rule.id)).toEqual(
      expect.arrayContaining(["SMALL_FARMER", "INCOME_LIMIT", "REQUEST_LIMIT"]),
    );
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("gives a concrete amount suggestion when bank repayments are too high", () => {
    const result = runAssessment({
      route: "BANK",
      details: {
        age: 35,
        annualIncome: 240000,
        existingMonthlyEmi: 2000,
        creditHistory: "GOOD",
        yearsFarming: 10,
        landholdingAcres: 4,
        loanPurpose: "EQUIPMENT",
        requestedAmount: 500000,
        tenureMonths: 24,
        collateralType: "LAND",
        collateralValue: 800000,
        stateCode: "PB",
      },
      documentTypes: ["IDENTITY_PROOF"],
      rules: DEFAULT_RULES.BANK,
    });
    expect(result.ruleResults.find((rule) => rule.id === "REPAYMENT_BURDEN")?.passed).toBe(false);
    expect(result.suggestions.join(" ")).toMatch(/loan of about ₹/);
  });
});

describe("model artifact errors", () => {
  const original = process.env.MODEL_DIR;
  afterEach(() => {
    process.env.MODEL_DIR = original;
  });

  it("raises a clear error when the artifact is missing", () => {
    process.env.MODEL_DIR = path.join("tests", "does-not-exist");
    expect(() => loadModel("BANK")).toThrow(ModelArtifactError);
  });
});
