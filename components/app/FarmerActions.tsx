"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { useI18n } from "@/components/providers";
import { Alert, Button, LinkButton } from "@/components/ui";
import { ApiClientError, apiFetch, newRequestId } from "@/lib/client/api";
import type { FinancingRoute } from "@/lib/domain/constants";
import { fieldLabel } from "@/lib/domain/fields";
import { OPTIONAL_PREFILL, SHARED_PREFILL_FIELDS } from "@/lib/domain/prefill";
import type { ApplicationView } from "@/server/domain/queries";
import { formatValue } from "./views";

export function FarmerActions({ view, basePath }: { view: ApplicationView; basePath: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [dialog, setDialog] = useState<null | "withdraw" | "alternative">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otherRoute: FinancingRoute = view.route === "GOVERNMENT" ? "BANK" : "GOVERNMENT";
  const prefillOptions = [
    ...SHARED_PREFILL_FIELDS.filter((key) => view.details[key] !== null && view.details[key] !== undefined).map((key) => ({
      key: key as string,
      text: `${fieldLabel(view.route, key)}: ${formatValue(view.route, key, view.details[key])}`,
    })),
    ...(OPTIONAL_PREFILL[`${view.route}->${otherRoute}`] ?? [])
      .filter((mapping) => view.details[mapping.from] !== null && view.details[mapping.from] !== undefined)
      .map((mapping) => ({ key: mapping.from, text: `${mapping.label}: ${formatValue(view.route, mapping.from, view.details[mapping.from])}` })),
  ];
  const [selected, setSelected] = useState<Set<string>>(new Set(prefillOptions.map((option) => option.key)));
  const requestId = useRef(newRequestId());

  const canEdit = view.actions.includes("SUBMIT") || view.actions.includes("RESUBMIT");
  const canWithdraw = view.actions.includes("WITHDRAW");

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/applications/${view.id}/withdraw`, { body: { expectedVersion: view.version } });
      setDialog(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not withdraw. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startAlternative() {
    setBusy(true);
    setError(null);
    try {
      const app = await apiFetch<{ id: string }>(`/api/applications/${view.id}/alternative`, {
        body: { clientRequestId: requestId.current, prefillFields: [...selected] },
      });
      router.push(`${basePath}/${app.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start the new application. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canEdit ? (
        <LinkButton href={`${basePath}/${view.id}/edit`} variant={view.status === "CHANGES_REQUESTED" ? "warning" : "primary"} data-testid="edit-application">
          {view.status === "CHANGES_REQUESTED" ? "Fix and resubmit" : view.status === "DRAFT" ? "Continue application" : t.editApplication}
        </LinkButton>
      ) : null}
      {view.canStartAlternative ? (
        <Button variant="secondary" onClick={() => setDialog("alternative")} data-testid="explore-other-route">
          {t.exploreOther}
        </Button>
      ) : null}
      {canWithdraw ? (
        <Button variant="ghost" onClick={() => setDialog("withdraw")}>
          {t.withdraw}
        </Button>
      ) : null}

      <Dialog
        open={dialog === "withdraw"}
        onClose={() => setDialog(null)}
        title="Withdraw this application?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep application
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void withdraw()}>
              Yes, withdraw
            </Button>
          </>
        }
      >
        <p>The officer will stop reviewing it. You cannot reopen a withdrawn application, but you can start a new one.</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
      </Dialog>

      <Dialog
        open={dialog === "alternative"}
        onClose={() => setDialog(null)}
        title={otherRoute === "BANK" ? "Apply through a bank instead" : "Apply through a government scheme instead"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void startAlternative()} data-testid="confirm-alternative">
              Start {otherRoute === "BANK" ? "bank" : "government scheme"} application
            </Button>
          </>
        }
      >
        <p>
          {otherRoute === "BANK"
            ? "A bank loan has different checks: repayment capacity, credit history and security. Interest and repayment terms are set by the bank."
            : "Government schemes focus on small and marginal farmers and have their own limits."}{" "}
          This starts a new draft. Your current application is kept as it is.
        </p>
        {prefillOptions.length > 0 ? (
          <fieldset>
            <legend className="font-semibold">Copy these details into the new application?</legend>
            <p className="text-muted">Untick anything you do not want copied. You can edit everything later.</p>
            <ul className="mt-2 space-y-1.5">
              {prefillOptions.map((option) => (
                <li key={option.key}>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-brand-700"
                      checked={selected.has(option.key)}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(option.key);
                        else next.delete(option.key);
                        setSelected(next);
                      }}
                    />
                    {option.text}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}
      </Dialog>
    </div>
  );
}
