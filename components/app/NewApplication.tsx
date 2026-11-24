"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/providers";
import { Alert, Button, Card, cx } from "@/components/ui";
import { ApiClientError, apiFetch, newRequestId } from "@/lib/client/api";
import type { FinancingRoute } from "@/lib/domain/constants";
import { normalizeState, stateName } from "@/lib/domain/states";

const ASSISTANT_KEY = "kisan-rin-saathi-v1";
const HECTARE_TO_ACRE = 2.471;

interface AssistantProfile {
  name?: string | null;
  stateText?: string | null;
  districtText?: string | null;
  village?: string | null;
  farmerType?: string | null;
  landValue?: number | null;
  landUnit?: string | null;
  amountRupees?: number | null;
}

/** Maps the voice assistant's notes to form fields. Values that cannot be converted reliably are left out. */
function assistantPrefill(route: FinancingRoute): Record<string, string | number> {
  try {
    const raw = window.localStorage.getItem(ASSISTANT_KEY);
    if (!raw) return {};
    const profile = (JSON.parse(raw) as { profile?: AssistantProfile }).profile;
    if (!profile) return {};
    const out: Record<string, string | number> = {};
    if (profile.name) out.fullName = profile.name;
    const state = profile.stateText ? normalizeState(profile.stateText) : null;
    if (state) out.stateCode = state.code;
    if (profile.districtText) out.district = profile.districtText;
    if (profile.village) out.village = profile.village;
    if (typeof profile.landValue === "number" && profile.landValue >= 0) {
      if (profile.landUnit === "acre") out.landholdingAcres = profile.landValue;
      if (profile.landUnit === "hectare") out.landholdingAcres = Math.round(profile.landValue * HECTARE_TO_ACRE * 100) / 100;
    }
    if (route === "GOVERNMENT" && profile.farmerType) {
      const category = { owner: "OWNER", tenant: "TENANT", sharecropper: "SHARECROPPER" }[profile.farmerType];
      if (category) out.farmerCategory = category;
    }
    if (typeof profile.amountRupees === "number" && profile.amountRupees > 0) out.requestedAmount = profile.amountRupees;
    return out;
  } catch {
    return {};
  }
}

const PREFILL_LABELS: Record<string, string> = {
  fullName: "Name",
  stateCode: "State",
  district: "District",
  village: "Village",
  landholdingAcres: "Land (acres)",
  farmerCategory: "How you farm",
  requestedAmount: "Amount needed",
};

export function NewApplication({
  initialRoute,
  fromAssistant,
  farmerId,
  farmerName,
  basePath,
}: {
  initialRoute: FinancingRoute | null;
  fromAssistant: boolean;
  farmerId?: string;
  farmerName?: string;
  basePath: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [route, setRoute] = useState<FinancingRoute | null>(initialRoute);
  const [prefill, setPrefill] = useState<Record<string, string | number>>({});
  const [usePrefill, setUsePrefill] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef<string>("");

  useEffect(() => {
    if (fromAssistant && route) setPrefill(assistantPrefill(route));
  }, [fromAssistant, route]);

  async function create() {
    if (!route) return;
    if (!requestId.current) requestId.current = newRequestId();
    setBusy(true);
    setError(null);
    try {
      const app = await apiFetch<{ id: string }>("/api/applications", {
        body: {
          route,
          clientRequestId: requestId.current,
          farmerId,
          details: usePrefill ? prefill : undefined,
        },
      });
      router.replace(`${basePath}/${app.id}/edit`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start the application. Please try again.");
      setBusy(false);
    }
  }

  const options: { route: FinancingRoute; title: string; body: string }[] = [
    {
      route: "GOVERNMENT",
      title: t.applyGov,
      body: "For small and marginal farmers seeking support for inputs, irrigation or equipment. Reviewed by the agriculture department.",
    },
    {
      route: "BANK",
      title: t.applyBank,
      body: "For crop, equipment or development loans repaid in instalments. Reviewed by the bank's agricultural lending officer.",
    },
  ];

  return (
    <div className="space-y-6">
      {farmerName ? (
        <Alert tone="info" title={`Applying on behalf of ${farmerName}`}>
          The farmer has authorised you with a one-time code. The application stays in their account and they can see it.
        </Alert>
      ) : null}
      <fieldset>
        <legend className="mb-3 text-lg font-bold">Choose a financing route</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {options.map((option) => (
            <label
              key={option.route}
              className={cx(
                "block cursor-pointer rounded-xl border-2 bg-white p-5 shadow-sm transition-colors",
                route === option.route ? "border-brand-600 ring-2 ring-brand-200" : "border-line hover:border-brand-400",
              )}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="route"
                  value={option.route}
                  checked={route === option.route}
                  onChange={() => {
                    setRoute(option.route);
                    requestId.current = "";
                  }}
                  className="mt-1 h-5 w-5 accent-brand-700"
                />
                <span>
                  <span className="block text-lg font-semibold">{option.title}</span>
                  <span className="mt-1 block text-sm text-muted">{option.body}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm">
          Not sure?{" "}
          <Link href="/compare" className="font-semibold text-brand-700 underline">
            Compare the two routes
          </Link>
        </p>
      </fieldset>

      {fromAssistant && route && Object.keys(prefill).length > 0 ? (
        <Card>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={usePrefill} onChange={(event) => setUsePrefill(event.target.checked)} className="mt-1 h-5 w-5 accent-brand-700" />
            <span>
              <span className="block font-semibold">Use details from your voice assistant conversation</span>
              <span className="block text-sm text-muted">You can change any of these in the form.</span>
              <span className="mt-2 block text-sm">
                {Object.entries(prefill)
                  .map(([key, value]) => `${PREFILL_LABELS[key] ?? key}: ${key === "stateCode" ? stateName(String(value)) : value}`)
                  .join(" · ")}
              </span>
            </span>
          </label>
        </Card>
      ) : null}

      <p className="text-sm text-muted">
        {farmerId ? "Details saved in the farmer's profile will be filled in." : "Details from your profile will be filled in for you."} Nothing is
        sent to an officer until you submit.
      </p>

      {error ? <Alert tone="error">{error}</Alert> : null}
      <Button onClick={() => void create()} disabled={!route || busy} loading={busy} data-testid="start-application">
        Start application
      </Button>
    </div>
  );
}
