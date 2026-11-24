import bankRules from "@/lib/data/rules/bank_rules_v1.json";
import governmentRules from "@/lib/data/rules/government_rules_v1.json";
import type { FinancingRoute } from "@/lib/domain/constants";
import type { RawInput } from "./features";

type Op = "between" | "lte" | "gte" | "eq" | "notIn" | "anyOf";

interface Condition {
  field?: string;
  op: Op;
  value?: unknown;
  conditions?: Condition[];
}

export interface RuleDef extends Condition {
  id: string;
  label: string;
  severity: "HARD" | "SOFT";
  failMessage: string;
  suggestion: string;
}

export interface RuleConfig {
  version: string;
  route: FinancingRoute;
  disclaimer: string;
  decisionPolicy: { eligibleMinProbability: number; hardFailOverrideProbability: number };
  rules: RuleDef[];
}

export interface RuleResult {
  id: string;
  label: string;
  severity: "HARD" | "SOFT";
  passed: boolean;
  actual: unknown;
  message: string | null;
  suggestion: string | null;
}

export const DEFAULT_RULES: Record<FinancingRoute, RuleConfig> = {
  GOVERNMENT: governmentRules as RuleConfig,
  BANK: bankRules as RuleConfig,
};

function check(condition: Condition, input: RawInput): boolean {
  if (condition.op === "anyOf") return (condition.conditions ?? []).some((inner) => check(inner, input));
  const actual = input[condition.field ?? ""];
  switch (condition.op) {
    case "between": {
      const [min, max] = condition.value as [number, number];
      return typeof actual === "number" && actual >= min && actual <= max;
    }
    case "lte":
      return typeof actual === "number" && Number.isFinite(actual) && actual <= (condition.value as number);
    case "gte":
      return typeof actual === "number" && Number.isFinite(actual) && actual >= (condition.value as number);
    case "eq":
      return actual === condition.value;
    case "notIn":
      return !(condition.value as unknown[]).includes(actual);
    default:
      return false;
  }
}

export function evaluateRules(config: RuleConfig, input: RawInput): RuleResult[] {
  return config.rules.map((rule) => {
    const passed = check(rule, input);
    return {
      id: rule.id,
      label: rule.label,
      severity: rule.severity,
      passed,
      actual: rule.field ? input[rule.field] ?? null : null,
      message: passed ? null : rule.failMessage,
      suggestion: passed ? null : rule.suggestion,
    };
  });
}
