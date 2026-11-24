import type { Metadata } from "next";
import { Alert, Card, PageHeader } from "@/components/ui";
import { label, type FinancingRoute } from "@/lib/domain/constants";
import { documentRequirements } from "@/lib/domain/fields";
import { loadModel } from "@/server/ml/model";
import { DEFAULT_RULES } from "@/server/ml/rules";

export const metadata: Metadata = { title: "Eligibility requirements" };

function modelSummary(route: FinancingRoute) {
  try {
    const { model } = loadModel(route);
    const metrics = model.metrics as { selected: string; test: { accuracy: number; f1: number; rocAuc: number } };
    return { version: model.version, algorithm: model.algorithm, trainedAt: model.trainedAt, ...metrics.test };
  } catch {
    return null;
  }
}

export default function EligibilityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Requirements"
        title="What each route looks for"
        subtitle="These are the demonstration conditions used in this prototype. Real schemes and banks set their own rules."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {(["GOVERNMENT", "BANK"] as const).map((route) => {
          const rules = DEFAULT_RULES[route];
          const docs = documentRequirements(route, route === "BANK" ? { landholdingAcres: 1, collateralType: "LAND" } : {});
          const model = modelSummary(route);
          return (
            <Card key={route}>
              <h2 className="text-xl font-bold">{label(route)}</h2>
              <p className="mt-1 text-sm text-muted">{rules.disclaimer}</p>
              <h3 className="mt-5 font-semibold">Conditions checked</h3>
              <ul className="mt-2 space-y-2">
                {rules.rules.map((rule) => (
                  <li key={rule.id} className="flex gap-2 text-sm">
                    <span className={rule.severity === "HARD" ? "text-red-700" : "text-amber-700"} aria-hidden>
                      ●
                    </span>
                    <span>
                      {rule.label}
                      <span className="ml-1 text-xs text-muted">({rule.severity === "HARD" ? "required" : "recommended"})</span>
                    </span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-5 font-semibold">Documents</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {docs.map((doc) => (
                  <li key={doc.type}>
                    <span className="font-medium">{label(doc.type)}</span>
                    {doc.requiredToSubmit ? <span className="ml-1 text-xs font-semibold text-red-700">needed to submit</span> : null}
                    <span className="block text-muted">{doc.reason}</span>
                  </li>
                ))}
                {route === "GOVERNMENT" ? (
                  <li className="text-muted">Tenants and sharecroppers provide a tenancy or lease agreement instead of a land record.</li>
                ) : (
                  <li className="text-muted">Land and collateral documents are only needed if they apply to you.</li>
                )}
              </ul>
              <h3 className="mt-5 font-semibold">Eligibility model</h3>
              {model ? (
                <p className="mt-1 text-sm text-muted">
                  {model.algorithm === "DecisionTreeClassifier" ? "Decision tree" : "Random forest"} <code>{model.version}</code>, trained{" "}
                  {new Date(model.trainedAt).toLocaleDateString("en-IN")}. On held-out synthetic data: accuracy {model.accuracy}, F1{" "}
                  {model.f1}, ROC AUC {model.rocAuc}.
                </p>
              ) : (
                <p className="mt-1 text-sm text-red-700">Model artifact not available.</p>
              )}
            </Card>
          );
        })}
      </div>
      <Alert tone="info" className="mt-6" title="How the assessment is used">
        The officer runs the assessment after opening your application. It combines the conditions above with a model trained
        on synthetic data, and explains which details mattered. The result is advice: the officer decides, and you will see the
        reasons either way.
      </Alert>
    </div>
  );
}
