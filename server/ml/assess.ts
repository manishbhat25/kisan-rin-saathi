import { label, type AssessmentOutcome, type FinancingRoute } from "@/lib/domain/constants";
import { documentRequirements, fieldLabel, fieldsFor } from "@/lib/domain/fields";
import { encodeFeatures, withEngineered, type RawInput } from "./features";
import { leafPath, loadModel, predictProbability, type ExportedModel } from "./model";
import { evaluateRules, type RuleConfig, type RuleResult } from "./rules";

export interface PathStep {
  feature: string;
  label: string;
  threshold: number;
  value: number;
  wentLeft: boolean;
  description: string;
}

export interface Factor {
  feature: string;
  label: string;
  contribution: number;
}

export interface Explanation {
  method: string;
  algorithm: string;
  probability: number;
  baseRate: number;
  topFactors: Factor[];
  decisionPath: PathStep[];
  note: string;
}

export interface AssessmentComputation {
  outcome: AssessmentOutcome;
  score: number;
  ruleResults: RuleResult[];
  explanation: Explanation;
  recommendation: string;
  suggestions: string[];
  model: { version: string; algorithm: string; trainedAt: string; file: string; metrics: unknown };
}

const ENGINEERED_LABELS: Record<string, string> = {
  repaymentBurden: "Share of monthly income going to repayments",
  loanToIncome: "Loan amount compared with yearly income",
  collateralCoverage: "Collateral value compared with loan amount",
};

function featureLabel(route: FinancingRoute, feature: string): string {
  if (ENGINEERED_LABELS[feature]) return ENGINEERED_LABELS[feature];
  const [key, category] = feature.split("=");
  const base = fieldLabel(route, key);
  return category ? `${base}: ${label(category)}` : base;
}

function formatValue(feature: string, value: number): string {
  if (feature.includes("=")) return value >= 0.5 ? "yes" : "no";
  if (feature === "repaymentBurden") return `${Math.round(value * 100)}%`;
  if (feature === "loanToIncome" || feature === "collateralCoverage") return `${value.toFixed(2)}×`;
  if (/Amount|Income|Emi|Value/.test(feature)) return `₹${Math.round(value).toLocaleString("en-IN")}`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Path-based contributions (Saabas method): change in predicted probability at each split, averaged over trees. */
function explain(model: ExportedModel, x: number[], probability: number): Explanation {
  const contributions = new Map<string, number>();
  let base = 0;
  for (const tree of model.trees) {
    const nodes = leafPath(tree, x);
    base += tree.probability[0];
    for (let i = 1; i < nodes.length; i += 1) {
      const parent = nodes[i - 1];
      const feature = model.featureNames[tree.feature[parent]];
      const delta = tree.probability[nodes[i]] - tree.probability[parent];
      contributions.set(feature, (contributions.get(feature) ?? 0) + delta);
    }
  }
  const treeCount = model.trees.length;
  const topFactors = [...contributions.entries()]
    .map(([feature, total]) => ({ feature, label: featureLabel(model.route, feature), contribution: total / treeCount }))
    .filter((factor) => Math.abs(factor.contribution) >= 0.005)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6);

  const first = model.trees[0];
  const nodes = leafPath(first, x);
  const decisionPath: PathStep[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const node = nodes[i];
    const feature = model.featureNames[first.feature[node]];
    const value = x[first.feature[node]];
    const wentLeft = nodes[i + 1] === first.childrenLeft[node];
    const threshold = first.threshold[node];
    const name = featureLabel(model.route, feature);
    const yesNo = feature.includes("=") || fieldsFor(model.route).find((field) => field.key === feature)?.kind === "boolean";
    const description = yesNo
      ? `${name} — ${value >= 0.5 ? "yes" : "no"}`
      : `${name} is ${formatValue(feature, value)} (${wentLeft ? "at or below" : "above"} ${formatValue(feature, threshold)})`;
    decisionPath.push({ feature, label: name, threshold, value, wentLeft, description });
  }

  return {
    method: treeCount === 1 ? "Decision path and per-split contributions" : "Average per-split contributions across trees",
    algorithm: model.algorithm,
    probability,
    baseRate: base / treeCount,
    topFactors,
    decisionPath: treeCount === 1 ? decisionPath : [],
    note: "Contributions show how each answer moved the model's estimate up or down from its starting point. The model was trained on synthetic data with eligible and ineligible cases weighted equally, so the starting point is not a real approval rate.",
  };
}

function rupees(value: number): string {
  return `₹${Math.max(0, Math.floor(value / 1000) * 1000).toLocaleString("en-IN")}`;
}

function numericSuggestions(route: FinancingRoute, input: RawInput, results: RuleResult[]): string[] {
  const failed = new Set(results.filter((rule) => !rule.passed).map((rule) => rule.id));
  const out: string[] = [];
  if (route === "BANK") {
    const income = Number(input.annualIncome);
    const tenure = Number(input.tenureMonths);
    const emi = Number(input.existingMonthlyEmi ?? 0);
    if (failed.has("REPAYMENT_BURDEN")) {
      const room = 0.5 * (income / 12) - emi;
      if (room > 0) {
        out.push(
          `With a ${tenure}-month repayment period, a loan of about ${rupees(room * tenure)} or less would keep repayments within half of monthly income (before interest).`,
        );
      } else {
        out.push("Existing loan repayments already use half of monthly income. Closing or reducing an existing loan would help.");
      }
    }
    if (failed.has("LOAN_TO_INCOME")) out.push(`A loan of ${rupees(income * 3)} or less stays within 3 times yearly income.`);
  }
  return out;
}

export function runAssessment(params: {
  route: FinancingRoute;
  details: RawInput;
  documentTypes: string[];
  rules: RuleConfig;
}): AssessmentComputation {
  const { route, details, documentTypes, rules } = params;
  const { model, file } = loadModel(route);
  const x = encodeFeatures(model, details);
  const probability = predictProbability(model, x);
  const enriched = withEngineered(model, details);

  const ruleResults = evaluateRules(rules, enriched);
  for (const requirement of documentRequirements(route, details)) {
    const present = documentTypes.includes(requirement.type);
    ruleResults.push({
      id: `DOC_${requirement.type}`,
      label: `${label(requirement.type)} provided`,
      severity: "SOFT",
      passed: present,
      actual: present,
      message: present ? null : `${label(requirement.type)} has not been uploaded. ${requirement.reason}`,
      suggestion: present ? null : `Upload a clear copy of your ${label(requirement.type).toLowerCase()}.`,
    });
  }

  const hardFails = ruleResults.filter((rule) => !rule.passed && rule.severity === "HARD");
  const softFails = ruleResults.filter((rule) => !rule.passed && rule.severity === "SOFT");
  const policy = rules.decisionPolicy;

  let outcome: AssessmentOutcome;
  let recommendation: string;
  if (hardFails.length > 0) {
    if (probability >= policy.hardFailOverrideProbability) {
      outcome = "NEEDS_REVIEW";
      recommendation =
        "The model estimate is positive but one or more required conditions are not met. An officer should check the failed conditions before deciding.";
    } else {
      outcome = "NOT_ELIGIBLE";
      recommendation =
        "This application does not meet the demonstration criteria for this route. Review the reasons below; the farmer may correct information or explore the other financing route.";
    }
  } else if (probability >= policy.eligibleMinProbability && softFails.length === 0) {
    outcome = "ELIGIBLE";
    recommendation =
      "All demonstration conditions are met and the model estimate is positive. The officer may proceed to a decision after checking the documents.";
  } else if (probability >= policy.eligibleMinProbability) {
    outcome = "NEEDS_REVIEW";
    recommendation =
      "Conditions are met and the model estimate is positive, but some documents or details are missing. Consider requesting them from the farmer.";
  } else {
    outcome = "NEEDS_REVIEW";
    recommendation =
      "Required conditions are met but the model estimate is low. An officer should review the application details carefully.";
  }

  const suggestions = [
    ...numericSuggestions(route, details, ruleResults),
    ...[...hardFails, ...softFails].map((rule) => rule.suggestion).filter((text): text is string => Boolean(text)),
  ];

  return {
    outcome,
    score: Math.round(probability * 10000) / 10000,
    ruleResults,
    explanation: explain(model, x, probability),
    recommendation,
    suggestions: [...new Set(suggestions)],
    model: {
      version: model.version,
      algorithm: model.algorithm,
      trainedAt: model.trainedAt,
      file,
      metrics: model.metrics,
    },
  };
}
