import Link from "next/link";
import { label, type FinancingRoute } from "@/lib/domain/constants";
import { fieldLabel, fieldsFor } from "@/lib/domain/fields";
import { stateName } from "@/lib/domain/states";
import { statusLabel, type Lang } from "@/lib/i18n";
import type { ApplicationListItem, ApplicationView } from "@/server/domain/queries";
import {
  Alert,
  Card,
  CardTitle,
  DescriptionList,
  EmptyState,
  OutcomeBadge,
  RouteBadge,
  StatusBadge,
  cx,
  formatDate,
  formatMoney,
} from "@/components/ui";

export function formatValue(route: FinancingRoute, key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const field = fieldsFor(route).find((item) => item.key === key);
  if (key === "stateCode") return stateName(String(value));
  if (field?.kind === "boolean") return value ? "Yes" : "No";
  if (field?.kind === "select") return label(String(value));
  if (field?.unit?.startsWith("₹")) return formatMoney(Number(value));
  if (field?.unit) return `${value} ${field.unit}`;
  return String(value);
}

export function DetailsSummary({
  view,
  details,
  highlight = [],
}: {
  view: Pick<ApplicationView, "route">;
  details: Record<string, unknown>;
  highlight?: string[];
}) {
  const fields = fieldsFor(view.route).filter((field) => !field.showIf || field.showIf(details));
  return (
    <DescriptionList
      items={fields.map((field) => ({
        term: field.label,
        value: formatValue(view.route, field.key, details[field.key]),
        highlight: highlight.includes(field.key),
      }))}
    />
  );
}

export function DocumentsList({ view }: { view: ApplicationView }) {
  const provided = new Set(view.documents.map((doc) => doc.docType));
  const missing = view.documentRequirements.filter((req) => !provided.has(req.type));
  return (
    <div className="space-y-3">
      {view.documents.length === 0 ? (
        <p className="text-sm text-muted">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {view.documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="block font-medium">{label(doc.docType)}</span>
                <span className="block truncate text-muted">
                  {doc.originalName} · {Math.ceil(doc.sizeBytes / 1024)} KB · {formatDate(doc.uploadedAt)}
                </span>
              </span>
              <a
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-2 py-1 font-semibold text-brand-700 hover:bg-brand-50"
              >
                View<span className="sr-only"> {label(doc.docType)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 ? (
        <Alert tone="warning" title="Not yet provided">
          <ul className="list-inside list-disc">
            {missing.map((req) => (
              <li key={req.type}>
                {label(req.type)} — {req.reason}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}

export function Timeline({ view, lang = "en" }: { view: ApplicationView; lang?: Lang }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-line pl-5" aria-label="Application history">
      {view.history.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-200" aria-hidden />
          <p className="text-sm font-semibold">
            {entry.fromStatus ? `${statusLabel(entry.fromStatus, lang)} → ` : ""}
            {statusLabel(entry.toStatus, lang)}
          </p>
          <p className="text-xs text-muted">
            {formatDate(entry.createdAt, true)} · {entry.actorRole === "SYSTEM" ? "System" : entry.actorName ?? label(entry.actorRole)}
            {entry.revisionNo > 0 ? ` · revision ${entry.revisionNo}` : ""}
          </p>
          {entry.note ? <p className="mt-0.5 text-sm text-muted">{entry.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function AssessmentPanel({ view, audience }: { view: ApplicationView; audience: "farmer" | "officer" }) {
  const latest = view.assessments[0];
  if (!latest) {
    return (
      <EmptyState title="No eligibility assessment yet">
        {audience === "officer"
          ? "Run the eligibility analysis once you have checked the application."
          : "The officer will run an eligibility assessment during review. You will be notified."}
      </EmptyState>
    );
  }
  const failed = latest.ruleResults.filter((rule) => !rule.passed);
  const passed = latest.ruleResults.filter((rule) => rule.passed);
  return (
    <div className="space-y-4" data-testid="assessment-panel">
      <div className="flex flex-wrap items-center gap-3">
        <OutcomeBadge outcome={latest.outcome} stale={latest.isStale} />
        <span className="text-sm text-muted">
          Revision {latest.revisionNo} · {formatDate(latest.createdAt, true)}
        </span>
      </div>
      {latest.isStale ? (
        <Alert tone="warning">
          This assessment was made on an earlier version of the application. {audience === "officer" ? "Run a fresh assessment before deciding." : "The officer will reassess your updated application."}
        </Alert>
      ) : null}
      <p className="text-sm">{latest.recommendation}</p>

      {failed.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold">{audience === "farmer" ? "What needs attention" : "Conditions not met"}</h3>
          <ul className="mt-2 space-y-2">
            {failed.map((rule) => {
              const hard = rule.severity === "HARD";
              return (
                <li
                  key={rule.id}
                  className={cx("rounded-lg border px-3 py-2 text-sm", hard ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-950")}
                >
                  <span className="font-semibold">{rule.label}</span>
                  <span className="ml-2 text-xs font-medium">{hard ? "required" : "recommended"}</span>
                  {rule.message ? <span className="block">{rule.message}</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {latest.suggestions.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold">Suggested next steps</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {latest.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {passed.length > 0 ? (
        <details className="rounded-lg border border-line px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold">Conditions met ({passed.length})</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {passed.map((rule) => (
              <li key={rule.id} className="text-emerald-900">
                ✓ {rule.label}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {latest.explanation ? (
        <details className="rounded-lg border border-line px-3 py-2" open={audience === "officer"}>
          <summary className="cursor-pointer text-sm font-semibold">How the model reached this estimate</summary>
          <div className="mt-2 space-y-3 text-sm">
            <p>
              Model estimate of eligibility: <strong>{Math.round(latest.score * 100)}%</strong>
              {audience === "officer" ? (
                <span className="text-muted"> (model starting point: {Math.round(latest.explanation.baseRate * 100)}%)</span>
              ) : null}
            </p>
            {latest.explanation.topFactors.length > 0 ? (
              <ul className="space-y-1.5">
                {latest.explanation.topFactors.map((factor) => {
                  const pct = Math.round(factor.contribution * 100);
                  return (
                    <li key={factor.feature} className="flex items-center gap-2">
                      <span
                        className={cx(
                          "w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-xs font-bold",
                          pct >= 0 ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900",
                        )}
                      >
                        {pct >= 0 ? "+" : ""}
                        {pct}%
                      </span>
                      <span>{factor.label}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {audience === "officer" && latest.explanation.decisionPath.length > 0 ? (
              <div>
                <p className="font-semibold">Decision path</p>
                <ol className="mt-1 list-inside list-decimal space-y-0.5 text-muted">
                  {latest.explanation.decisionPath.map((step, index) => (
                    <li key={index}>{step.description}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <p className="text-xs text-muted">{latest.explanation.note}</p>
          </div>
        </details>
      ) : null}

      <p className="text-xs text-muted">
        Model {latest.modelVersion} ({latest.modelAlgorithm === "DecisionTreeClassifier" ? "decision tree" : "random forest"}), rules{" "}
        {latest.ruleVersion}. Trained on synthetic data; advisory only.
      </p>
      {view.assessments.length > 1 && audience === "officer" ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold">Earlier assessments ({view.assessments.length - 1})</summary>
          <ul className="mt-2 space-y-1">
            {view.assessments.slice(1).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <OutcomeBadge outcome={item.outcome} stale={item.isStale} />
                <span className="text-muted">
                  Revision {item.revisionNo} · {Math.round(item.score * 100)}% · {formatDate(item.createdAt, true)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function DecisionPanel({ view }: { view: ApplicationView }) {
  if (view.decisions.length === 0) return null;
  return (
    <div className="space-y-3">
      {view.decisions.map((decision) => (
        <div
          key={decision.id}
          data-testid={`decision-${decision.decision}`}
          className={cx(
            "rounded-lg border px-4 py-3",
            decision.decision === "APPROVED" && "border-emerald-300 bg-emerald-50",
            decision.decision === "REJECTED" && "border-red-300 bg-red-50",
            decision.decision === "ESCALATED" && "border-orange-300 bg-orange-50",
          )}
        >
          <p className="font-semibold">
            {decision.decision === "APPROVED"
              ? "Approved in the demonstration workflow"
              : decision.decision === "REJECTED"
                ? "Not approved"
                : "Escalated for additional review"}
          </p>
          <p className="text-xs text-muted">
            {decision.organizationName}
            {decision.officerName ? ` · ${decision.officerName}` : ""} · {formatDate(decision.createdAt, true)} · revision {decision.revisionNo}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">Reason: </span>
            {decision.reason}
          </p>
          {decision.conditions ? (
            <p className="mt-1 text-sm">
              <span className="font-medium">Conditions: </span>
              {decision.conditions}
            </p>
          ) : null}
          {decision.overridesAssessment ? (
            <p className="mt-1 text-xs font-medium text-orange-900">The officer decided differently from the model assessment and recorded why.</p>
          ) : null}
          {decision.decision === "APPROVED" ? (
            <p className="mt-2 text-xs text-muted">This is a prototype. A demonstration approval is not a real loan sanction or disbursement.</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ReviewsList({ view, audience }: { view: ApplicationView; audience: "farmer" | "officer" }) {
  const reviews = view.reviews;
  if (reviews.length === 0) return <p className="text-sm text-muted">No reviews yet.</p>;
  return (
    <ul className="space-y-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className={cx(
            "rounded-lg border px-4 py-3",
            review.kind === "INTERNAL_NOTE" ? "border-slate-300 bg-slate-50" : "border-amber-300 bg-amber-50/60",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {review.kind === "INTERNAL_NOTE" ? "Internal note (not visible to farmer)" : `Changes requested on revision ${review.revisionNo}`}
          </p>
          <p className="text-xs text-muted">
            {review.officerName} · {formatDate(review.createdAt, true)}
            {review.deadline ? ` · respond by ${formatDate(review.deadline)}` : ""}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm">{review.summary}</p>
          {review.nextSteps ? (
            <p className="mt-1 text-sm">
              <span className="font-medium">Next steps: </span>
              {review.nextSteps}
            </p>
          ) : null}
          {review.items.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {review.items.map((item) => (
                <li key={item.id} className="rounded-md bg-white px-3 py-2 ring-1 ring-line">
                  <span className="font-semibold">
                    {item.itemType === "FIELD"
                      ? fieldLabel(view.route, item.fieldKey ?? "")
                      : item.itemType === "DOCUMENT"
                        ? label(item.documentType)
                        : "General"}
                    :
                  </span>{" "}
                  {item.message}
                  {item.farmerResponse ? (
                    <span className="mt-1 block text-muted">
                      {audience === "farmer" ? "Your reply" : "Farmer's reply"}: {item.farmerResponse}
                    </span>
                  ) : null}
                  <span className={cx("mt-1 block text-xs font-medium", item.resolvedAt ? "text-emerald-800" : "text-amber-900")}>
                    {item.resolvedAt ? `Addressed in revision ${item.resolvedInRevisionNo}` : "Open"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ApplicationHeader({ view, lang = "en" }: { view: ApplicationView; lang?: Lang }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <RouteBadge route={view.route} />
          <StatusBadge status={view.status} lang={lang} />
          {view.assistedBy ? (
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-900">
              Assisted submission{view.assistedBy.ref ? ` · ${view.assistedBy.ref}` : ""}
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Application <span className="font-mono" data-testid="app-reference">{view.reference}</span>
        </h1>
        <p className="text-sm text-muted">
          {view.applicant.name} · Created {formatDate(view.createdAt)}
          {view.submittedAt ? ` · Submitted ${formatDate(view.submittedAt)}` : ""}
          {view.currentRevisionNo > 0 ? ` · Revision ${view.currentRevisionNo}` : ""}
        </p>
        {view.parent ? (
          <p className="mt-1 text-sm">
            Started as an alternative to{" "}
            <Link className="font-medium text-brand-700 underline" href={`/applications/${view.parent.id}`}>
              {view.parent.reference}
            </Link>
          </p>
        ) : null}
        {view.children.length > 0 ? (
          <p className="mt-1 text-sm">
            Alternative route application:{" "}
            {view.children.map((child) => (
              <Link key={child.id} className="font-medium text-brand-700 underline" href={`/applications/${child.id}`}>
                {child.reference}
              </Link>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ApplicationTable({
  items,
  hrefBase,
  audience,
  lang = "en",
}: {
  items: ApplicationListItem[];
  hrefBase: string;
  audience: "farmer" | "officer" | "operator";
  lang?: Lang;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="hidden bg-surface text-xs uppercase tracking-wide text-muted md:table-header-group">
          <tr>
            <th scope="col" className="px-4 py-3">Application</th>
            {audience !== "farmer" ? <th scope="col" className="px-4 py-3">Applicant</th> : null}
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Assessment</th>
            <th scope="col" className="px-4 py-3">Updated</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="block border-t border-line px-4 py-3 md:table-row md:p-0" data-testid="application-row">
              <td className="block md:table-cell md:px-4 md:py-3">
                <span className="font-mono font-semibold">{item.reference}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <RouteBadge route={item.route} />
                  {item.submissionMethod === "ASSISTED" ? <span className="text-xs text-violet-800">Assisted</span> : null}
                  {item.revisionNo > 1 ? <span className="text-xs text-muted">rev. {item.revisionNo}</span> : null}
                </span>
              </td>
              {audience !== "farmer" ? (
                <td className="block pt-1 md:table-cell md:px-4 md:py-3">
                  <span className="font-medium">{item.applicantName}</span>
                  <span className="block text-xs text-muted">
                    {[item.district, item.stateCode ? stateName(item.stateCode) : null].filter(Boolean).join(", ") || "—"}
                  </span>
                </td>
              ) : null}
              <td className="block pt-2 md:table-cell md:px-4 md:py-3">
                <StatusBadge status={item.status} lang={lang} />
                {item.openCorrections > 0 && item.status === "CHANGES_REQUESTED" ? (
                  <span className="mt-1 block text-xs font-medium text-amber-900">{item.openCorrections} change(s) requested</span>
                ) : null}
              </td>
              <td className="block pt-2 md:table-cell md:px-4 md:py-3">
                {item.latestOutcome ? <OutcomeBadge outcome={item.latestOutcome} stale={item.latestOutcomeStale} /> : <span className="text-muted">—</span>}
              </td>
              <td className="block pt-1 text-muted md:table-cell md:px-4 md:py-3">{formatDate(item.updatedAt)}</td>
              <td className="block pt-2 md:table-cell md:px-4 md:py-3 md:text-right">
                <Link
                  href={`${hrefBase}/${item.id}`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 font-semibold text-brand-800 hover:bg-brand-50"
                >
                  {item.status === "CHANGES_REQUESTED" && audience !== "officer"
                    ? "Fix and resubmit"
                    : item.status === "DRAFT" && audience !== "officer"
                      ? "Continue"
                      : "Open"}
                  <span className="sr-only"> {item.reference}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionCard({ title, id, children, action }: { title: string; id: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card aria-labelledby={id}>
      <CardTitle id={id} action={action}>
        {title}
      </CardTitle>
      {children}
    </Card>
  );
}
