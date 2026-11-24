"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FieldShell, Input, Select } from "@/components/forms/fields";
import { Alert, Button, Card, CardTitle, formatDate } from "@/components/ui";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { FARMER_CATEGORIES, label } from "@/lib/domain/constants";
import { STATE_OPTIONS } from "@/lib/domain/fields";

interface ProfileValues {
  fullName: string;
  phone: string;
  age: string;
  stateCode: string;
  district: string;
  village: string;
  farmerCategory: string;
  landholdingAcres: string;
  primaryCrop: string;
}

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const { register, handleSubmit, setError, formState } = useForm<ProfileValues>({ defaultValues: initial });
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    try {
      await apiFetch("/api/farmer/profile", {
        method: "PUT",
        body: {
          fullName: values.fullName.trim(),
          phone: values.phone.trim(),
          age: orNull(values.age) === null ? null : Number(values.age),
          stateCode: orNull(values.stateCode),
          district: orNull(values.district),
          village: orNull(values.village),
          farmerCategory: orNull(values.farmerCategory),
          landholdingAcres: orNull(values.landholdingAcres) === null ? null : Number(values.landholdingAcres),
          primaryCrop: orNull(values.primaryCrop),
        },
      });
      setMessage({ tone: "success", text: "Profile saved. New applications will use these details." });
      router.refresh();
    } catch (error) {
      const err = error instanceof ApiClientError ? error : null;
      for (const [key, errors] of Object.entries(err?.details?.fieldErrors ?? {})) {
        if (errors?.[0]) setError(key as keyof ProfileValues, { message: errors[0] });
      }
      setMessage({ tone: "error", text: err?.message ?? "Could not save your profile." });
    }
  });

  const field = (key: keyof ProfileValues, text: string, extra: Partial<React.ComponentProps<typeof Input>> = {}, hint?: string) => (
    <FieldShell id={`p-${key}`} label={text} hint={hint} error={formState.errors[key]?.message}>
      <Input id={`p-${key}`} invalid={Boolean(formState.errors[key])} {...extra} {...register(key)} />
    </FieldShell>
  );

  return (
    <Card>
      <CardTitle>Personal and farm details</CardTitle>
      <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
        {field("fullName", "Full name", { autoComplete: "name" })}
        {field("phone", "Mobile number", { inputMode: "tel", autoComplete: "tel" }, "10 digits. Use a demo number in this prototype.")}
        {field("age", "Age", { inputMode: "numeric" })}
        <FieldShell id="p-stateCode" label="State" error={formState.errors.stateCode?.message}>
          <Select id="p-stateCode" {...register("stateCode")}>
            <option value="">Choose…</option>
            {STATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FieldShell>
        {field("district", "District")}
        {field("village", "Village or town")}
        <FieldShell id="p-farmerCategory" label="How do you farm?" error={formState.errors.farmerCategory?.message}>
          <Select id="p-farmerCategory" {...register("farmerCategory")}>
            <option value="">Choose…</option>
            {FARMER_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </Select>
        </FieldShell>
        {field("landholdingAcres", "Land you cultivate (acres)", { inputMode: "decimal" })}
        {field("primaryCrop", "Main crop")}
        <div className="sm:col-span-2">
          {message ? (
            <Alert tone={message.tone} className="mb-3" role={message.tone === "success" ? "status" : "alert"}>
              {message.text}
            </Alert>
          ) : null}
          <Button type="submit" loading={formState.isSubmitting}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function AssistanceAccess({ authorizations }: { authorizations: { id: string; operatorName: string; grantedAt: string; expiresAt: string }[] }) {
  const router = useRouter();
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState<null | "code" | "revoke">(null);
  const [error, setError] = useState<string | null>(null);

  async function createCode() {
    setBusy("code");
    setError(null);
    try {
      setCode(await apiFetch<{ code: string; expiresAt: string }>("/api/farmer/assistance-code", { method: "POST" }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create a code.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    setBusy("revoke");
    setError(null);
    try {
      await apiFetch("/api/farmer/operator-access", { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not remove access.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardTitle>Help from a service centre</CardTitle>
      <p className="text-sm text-muted">
        If an operator at a common service centre is helping you, give them a one-time code. It works once, for 30 minutes, and lets them
        prepare and submit applications for you for 24 hours. Never share it with anyone else.
      </p>
      {code ? (
        <div className="mt-4 rounded-lg border-2 border-dashed border-brand-500 bg-brand-50 p-4 text-center" role="status">
          <p className="text-sm font-medium">Your one-time code</p>
          <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em]" data-testid="assistance-code">
            {code.code}
          </p>
          <p className="mt-1 text-sm text-muted">Expires at {formatDate(code.expiresAt, true)}</p>
        </div>
      ) : null}
      <Button variant="secondary" className="mt-4" onClick={() => void createCode()} loading={busy === "code"} data-testid="create-assistance-code">
        {code ? "Create a new code" : "Create one-time code"}
      </Button>

      <div className="mt-6 border-t border-line pt-4">
        <h3 className="font-semibold">Who can act for you now</h3>
        {authorizations.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No operator has access to your account.</p>
        ) : (
          <>
            <ul className="mt-2 space-y-1 text-sm">
              {authorizations.map((auth) => (
                <li key={auth.id}>
                  {auth.operatorName} — until {formatDate(auth.expiresAt, true)}
                </li>
              ))}
            </ul>
            <Button variant="danger" className="mt-3" onClick={() => void revoke()} loading={busy === "revoke"}>
              Remove operator access
            </Button>
          </>
        )}
      </div>
      {error ? (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </Card>
  );
}
