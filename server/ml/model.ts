import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { FinancingRoute } from "@/lib/domain/constants";

export interface ExportedTree {
  childrenLeft: number[];
  childrenRight: number[];
  feature: number[];
  threshold: number[];
  probability: number[];
  samples: number[];
}

export interface ExportedModel {
  route: FinancingRoute;
  algorithm: "DecisionTreeClassifier" | "RandomForestClassifier";
  version: string;
  trainedAt: string;
  sklearnVersion: string;
  syntheticData: boolean;
  featureNames: string[];
  encoding: {
    numeric: string[];
    engineered: string[];
    boolean: string[];
    categorical: Record<string, string[]>;
  };
  imputation: Record<string, number | string>;
  trees: ExportedTree[];
  metrics: Record<string, unknown>;
  labelingCriteria: Record<string, unknown>;
}

export class ModelArtifactError extends Error {}

const cache = new Map<string, { model: ExportedModel; checksum: string }>();

export function modelDir(): string {
  return process.env.MODEL_DIR ?? path.join(process.cwd(), "ml", "artifacts");
}

export function artifactPath(route: FinancingRoute): string {
  return path.join(modelDir(), route === "GOVERNMENT" ? "government_model.json" : "bank_model.json");
}

function validate(model: ExportedModel, route: FinancingRoute): void {
  if (model.route !== route) throw new ModelArtifactError(`Artifact is for ${model.route}, expected ${route}`);
  if (!Array.isArray(model.trees) || model.trees.length === 0) throw new ModelArtifactError("Artifact has no trees");
  const width = model.featureNames.length;
  for (const tree of model.trees) {
    const n = tree.childrenLeft.length;
    for (const key of ["childrenRight", "feature", "threshold", "probability"] as const) {
      if (tree[key].length !== n) throw new ModelArtifactError("Artifact tree arrays have inconsistent lengths");
    }
    for (let i = 0; i < n; i += 1) {
      const left = tree.childrenLeft[i];
      if (left !== -1 && (left <= i || left >= n || tree.feature[i] < 0 || tree.feature[i] >= width)) {
        throw new ModelArtifactError("Artifact tree structure is invalid");
      }
    }
  }
}

export function loadModel(route: FinancingRoute): { model: ExportedModel; checksum: string; file: string } {
  const file = artifactPath(route);
  let raw: string;
  try {
    raw = readFileSync(file, "utf-8");
  } catch {
    throw new ModelArtifactError(`Model artifact not found for ${route}. Run "npm run ml:train".`);
  }
  const checksum = createHash("sha256").update(raw).digest("hex");
  const cached = cache.get(file);
  if (cached && cached.checksum === checksum) return { ...cached, file };
  let model: ExportedModel;
  try {
    model = JSON.parse(raw) as ExportedModel;
  } catch {
    throw new ModelArtifactError(`Model artifact for ${route} is not valid JSON`);
  }
  validate(model, route);
  cache.set(file, { model, checksum });
  return { model, checksum, file };
}

/** Walks one tree. Comparison uses float32 inputs to match scikit-learn exactly. */
export function leafPath(tree: ExportedTree, x: number[]): number[] {
  const path: number[] = [0];
  let node = 0;
  while (tree.childrenLeft[node] !== -1) {
    const value = Math.fround(x[tree.feature[node]]);
    node = value <= tree.threshold[node] ? tree.childrenLeft[node] : tree.childrenRight[node];
    path.push(node);
  }
  return path;
}

export function predictProbability(model: ExportedModel, x: number[]): number {
  let total = 0;
  for (const tree of model.trees) {
    const nodes = leafPath(tree, x);
    total += tree.probability[nodes[nodes.length - 1]];
  }
  return total / model.trees.length;
}
