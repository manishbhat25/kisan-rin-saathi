"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldShell, Input, Select, Textarea } from "@/components/forms/fields";
import { useI18n } from "@/components/providers";
import { Alert, Button, Card, CardTitle, cx } from "@/components/ui";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { DOCUMENT_TYPES, label } from "@/lib/domain/constants";
import { fieldsFor } from "@/lib/domain/fields";
import type { ApplicationView } from "@/server/domain/queries";

type Feedback = { tone: "success" | "error" | "warning"; text: string } | null;

function errorText(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) {
    if (error.code === "STALE_VERSION") return `${error.message} Reload the page to see the latest version.`;
    return error.message;
  }
  return fallback;
}

export function OfficerStatusActions({ view }: { view: ApplicationView }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function call(path: string, key: string, success: string) {
    setBusy(key);
    setFeedback(null);
    try {
      await apiFetch(`/api/applications/${view.id}/${path}`, { body: { expectedVersion: view.version } });
      setFeedback({ tone: "success", text: success });
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: errorText(error, "Something went wrong. Please try again.") });
    } finally {
      setBusy(null);
    }
  }

  const canStart = view.actions.includes("START_REVIEW");
  const canAssess = view.actions.includes("RUN_ASSESSMENT");
  if (!canStart && !canAssess && !feedback) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canStart ? (
          <Button onClick={() => void call("review/start", "start", "Marked as under review. The farmer has been notified.")} loading={busy === "start"} disabled={busy !== null} data-testid="start-review">
            {t.markUnderReview}
          </Button>
        ) : null}
        {canAssess ? (
          <Button
            variant={canStart ? "secondary" : "primary"}
            onClick={() => void call("assessments", "assess", "Eligibility analysis completed.")}
            loading={busy === "assess"}
            disabled={busy !== null}
            data-testid="run-assessment"
          >
            {view.assessments.length > 0 ? "Re-run eligibility analysis" : t.runAnalysis}
          </Button>
        ) : null}
      </div>
      {feedback ? (
        <Alert tone={feedback.tone} role={feedback.tone === "success" ? "status" : "alert"}>
          {feedback.text}
        </Alert>
      ) : null}
    </div>
  );
}

interface DraftItem {
  key: number;
  itemType: "FIELD" | "DOCUMENT" | "GENERAL";
  fieldKey: string;
  documentType: string;
  message: string;
}

export function ReviewComposer({ view }: { view: ApplicationView }) {
  const router = useRouter();
  const { t } = useI18n();
  const fields = fieldsFor(view.route);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [deadline, setDeadline] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ key: 1, itemType: "FIELD", fieldKey: "", documentType: "", message: "" }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  if (!view.actions.includes("REQUEST_CHANGES")) return null;

  const update = (key: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  function validate() {
    const next: Record<string, string> = {};
    if (summary.trim().length < 10) next.summary = "Write a short summary for the farmer (at least 10 characters).";
    items.forEach((item, index) => {
      if (item.itemType === "FIELD" && !item.fieldKey) next[`item-${index}-target`] = "Choose the field to correct.";
      if (item.itemType === "DOCUMENT" && !item.documentType) next[`item-${index}-target`] = "Choose the document.";
      if (item.message.trim().length < 5) next[`item-${index}-message`] = "Explain what needs to change.";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function send() {
    if (!validate()) {
      setFeedback({ tone: "error", text: "Please complete the highlighted parts of the review." });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/applications/${view.id}/reviews`, {
        body: {
          expectedVersion: view.version,
          summary: summary.trim(),
          nextSteps: nextSteps.trim() || undefined,
          deadline: deadline || undefined,
          items: items.map((item) => ({
            itemType: item.itemType,
            fieldKey: item.itemType === "FIELD" ? item.fieldKey : undefined,
            documentType: item.itemType === "DOCUMENT" ? item.documentType : undefined,
            message: item.message.trim(),
          })),
        },
      });
      setOpen(false);
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: errorText(error, "Could not send the review.") });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="warning" onClick={() => setOpen(true)} data-testid="open-review-composer">
        {t.requestChanges}
      </Button>
    );
  }

  return (
    <Card className="border-amber-300" aria-labelledby="composer-heading">
      <CardTitle id="composer-heading">Request changes from the farmer</CardTitle>
      <p className="mb-4 text-sm text-muted">
        The farmer sees your summary and each requested change, and the matching fields are highlighted in their form. Use plain language.
      </p>
      <div className="space-y-4">
        <FieldShell id="review-summary" label="Summary for the farmer" error={errors.summary}>
          <Textarea id="review-summary" value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={2000} invalid={Boolean(errors.summary)} />
        </FieldShell>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Requested changes</legend>
          {items.map((item, index) => (
            <div key={item.key} className="rounded-lg border border-line bg-surface p-3" data-testid="review-item">
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <FieldShell id={`item-${item.key}-type`} label="Type">
                  <Select
                    id={`item-${item.key}-type`}
                    value={item.itemType}
                    onChange={(event) => update(item.key, { itemType: event.target.value as DraftItem["itemType"] })}
                  >
                    <option value="FIELD">A field</option>
                    <option value="DOCUMENT">A document</option>
                    <option value="GENERAL">General</option>
                  </Select>
                </FieldShell>
                {item.itemType === "FIELD" ? (
                  <FieldShell id={`item-${item.key}-field`} label="Field" error={errors[`item-${index}-target`]}>
                    <Select id={`item-${item.key}-field`} value={item.fieldKey} onChange={(event) => update(item.key, { fieldKey: event.target.value })}>
                      <option value="">Choose a field…</option>
                      {fields.map((field) => (
                        <option key={field.key} value={field.key}>
                          {field.label}
                        </option>
                      ))}
                    </Select>
                  </FieldShell>
                ) : item.itemType === "DOCUMENT" ? (
                  <FieldShell id={`item-${item.key}-doc`} label="Document" error={errors[`item-${index}-target`]}>
                    <Select id={`item-${item.key}-doc`} value={item.documentType} onChange={(event) => update(item.key, { documentType: event.target.value })}>
                      <option value="">Choose a document…</option>
                      {DOCUMENT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {label(type)}
                        </option>
                      ))}
                    </Select>
                  </FieldShell>
                ) : (
                  <div />
                )}
              </div>
              <div className="mt-3">
                <FieldShell id={`item-${item.key}-message`} label="What should the farmer do?" error={errors[`item-${index}-message`]}>
                  <Input
                    id={`item-${item.key}-message`}
                    value={item.message}
                    maxLength={500}
                    onChange={(event) => update(item.key, { message: event.target.value })}
                    invalid={Boolean(errors[`item-${index}-message`])}
                  />
                </FieldShell>
              </div>
              {items.length > 1 ? (
                <button
                  type="button"
                  className="mt-2 text-sm font-semibold text-red-700 underline"
                  onClick={() => setItems((prev) => prev.filter((other) => other.key !== item.key))}
                >
                  Remove this change
                </button>
              ) : null}
            </div>
          ))}
          {items.length < 20 ? (
            <Button
              variant="ghost"
              onClick={() =>
                setItems((prev) => [...prev, { key: Math.max(...prev.map((other) => other.key)) + 1, itemType: "FIELD", fieldKey: "", documentType: "", message: "" }])
              }
            >
              + Add another change
            </Button>
          ) : null}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <FieldShell id="review-next" label="Next steps (optional)">
            <Input id="review-next" value={nextSteps} maxLength={1000} onChange={(event) => setNextSteps(event.target.value)} />
          </FieldShell>
          <FieldShell id="review-deadline" label="Respond by (optional)">
            <Input id="review-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </FieldShell>
        </div>

        {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="warning" onClick={() => void send()} loading={busy} data-testid="send-review">
            {t.sendReview}
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function DecisionForm({ view }: { view: ApplicationView }) {
  const router = useRouter();
  const { t } = useI18n();
  const options = (
    [
      ["APPROVED", "APPROVE", t.approve],
      ["REJECTED", "REJECT", t.reject],
      ["ESCALATED", "ESCALATE", t.escalate],
    ] as const
  ).filter(([, action]) => view.actions.includes(action));
  const [decision, setDecision] = useState<string>("");
  const [reason, setReason] = useState("");
  const [conditions, setConditions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (options.length === 0) return null;

  const latest = view.assessments.find((assessment) => !assessment.isStale);
  const overriding = decision === "APPROVED" && latest && latest.outcome !== "ELIGIBLE";
  const minReason = decision === "APPROVED" ? (overriding ? 15 : 0) : 10;

  async function submit() {
    setError(null);
    setReasonError(null);
    if (!decision) {
      setError("Choose a decision.");
      return;
    }
    if (reason.trim().length < minReason) {
      setReasonError(
        overriding
          ? "The assessment did not find the applicant eligible. Explain why you are approving (at least 15 characters)."
          : `Write a reason of at least ${minReason} characters.`,
      );
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/api/applications/${view.id}/decision`, {
        body: { expectedVersion: view.version, decision, reason: reason.trim(), conditions: conditions.trim() || undefined },
      });
      router.refresh();
    } catch (err) {
      const fieldError = err instanceof ApiClientError ? err.details?.fieldErrors?.reason?.[0] : undefined;
      if (fieldError) setReasonError(fieldError);
      setError(errorText(err, "Could not record the decision."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card aria-labelledby="decision-form-heading">
      <CardTitle id="decision-form-heading">Record a decision</CardTitle>
      {view.approveBlockedReason ? (
        <Alert tone="warning" className="mb-3">
          {view.approveBlockedReason}
        </Alert>
      ) : null}
      <fieldset>
        <legend className="sr-only">Decision</legend>
        <div className="grid gap-2">
          {options.map(([value, action, text]) => {
            const blocked = action === "APPROVE" && Boolean(view.approveBlockedReason);
            return (
              <label
                key={value}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3",
                  decision === value ? "border-brand-600 bg-brand-50" : "border-line",
                  blocked && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="radio"
                  name="decision"
                  value={value}
                  disabled={blocked}
                  checked={decision === value}
                  onChange={() => setDecision(value)}
                  className="h-4 w-4 accent-brand-700"
                  data-testid={`decision-${action}`}
                />
                <span className="font-medium">{text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {decision ? (
        <div className="mt-4 space-y-3">
          {overriding ? (
            <Alert tone="warning">
              The latest assessment was “{label(latest!.outcome)}”. You can still approve, but you must record why. The override is recorded in the audit log, and your reason is shown to the farmer.
            </Alert>
          ) : null}
          <FieldShell
            id="decision-reason"
            label={decision === "APPROVED" ? (overriding ? "Reason for approving against the assessment (shown to the farmer)" : "Note for the farmer (optional)") : "Reason (shown to the farmer)"}
            error={reasonError ?? undefined}
          >
            <Textarea id="decision-reason" value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} invalid={Boolean(reasonError)} />
          </FieldShell>
          {decision === "APPROVED" ? (
            <FieldShell id="decision-conditions" label="Conditions (optional)">
              <Input id="decision-conditions" value={conditions} maxLength={1000} onChange={(event) => setConditions(event.target.value)} />
            </FieldShell>
          ) : null}
          {decision === "APPROVED" ? (
            <p className="text-xs text-muted">Demonstration only: approving here does not sanction or disburse any real loan.</p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <Button
        className="mt-4"
        variant={decision === "REJECTED" ? "danger" : "primary"}
        onClick={() => void submit()}
        loading={busy}
        disabled={!decision}
        data-testid="confirm-decision"
      >
        Confirm decision
      </Button>
    </Card>
  );
}

export function InternalNoteForm({ view }: { view: ApplicationView }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (note.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/applications/${view.id}/notes`, { body: { summary: note.trim() } });
      setNote("");
      router.refresh();
    } catch (err) {
      setError(errorText(err, "Could not save the note."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <FieldShell id="internal-note" label="Internal note" hint="Visible to officers only. Not shown to the farmer.">
        <Textarea id="internal-note" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} />
      </FieldShell>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button variant="secondary" onClick={() => void save()} loading={busy} disabled={note.trim().length < 2}>
        Add note
      </Button>
    </div>
  );
}
