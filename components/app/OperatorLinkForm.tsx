"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FieldShell, Input } from "@/components/forms/fields";
import { Alert, Button, Card, CardTitle } from "@/components/ui";
import { ApiClientError, apiFetch } from "@/lib/client/api";

interface Values {
  farmerEmail: string;
  code: string;
  consentConfirmed: boolean;
}

export function OperatorLinkForm() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState, reset } = useForm<Values>({
    defaultValues: { farmerEmail: "", code: "", consentConfirmed: false },
  });
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    if (!values.consentConfirmed) {
      setError("consentConfirmed", { message: "Confirm that the farmer has agreed to your help." });
      return;
    }
    try {
      const result = await apiFetch<{ farmerName: string }>("/api/operator/authorizations", { body: values });
      setMessage({ tone: "success", text: `You can now help ${result.farmerName} for the next 24 hours.` });
      reset();
      router.refresh();
    } catch (error) {
      const err = error instanceof ApiClientError ? error : null;
      for (const [key, errors] of Object.entries(err?.details?.fieldErrors ?? {})) {
        if (errors?.[0]) setError(key as keyof Values, { message: errors[0] });
      }
      setMessage({ tone: "error", text: err?.message ?? "Could not link the farmer." });
    }
  });

  return (
    <Card>
      <CardTitle>Help a farmer</CardTitle>
      <p className="mb-4 text-sm text-muted">
        Ask the farmer to sign in, open their profile and create a one-time code. Enter their email and the code here. You can only act for
        farmers who have given you a code.
      </p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FieldShell id="farmerEmail" label="Farmer's email" error={formState.errors.farmerEmail?.message}>
          <Input id="farmerEmail" type="email" autoComplete="off" invalid={Boolean(formState.errors.farmerEmail)} {...register("farmerEmail", { required: "Enter the farmer's email" })} />
        </FieldShell>
        <FieldShell id="code" label="One-time code" hint="6 digits, valid for 30 minutes." error={formState.errors.code?.message}>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            invalid={Boolean(formState.errors.code)}
            {...register("code", { pattern: { value: /^\d{6}$/, message: "Enter the 6-digit code from the farmer" } })}
          />
        </FieldShell>
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand-700" {...register("consentConfirmed")} data-testid="operator-consent" />
            <span>
              The farmer is present or has asked me to help, and agrees that I may prepare and submit loan applications for them. I will not
              keep copies of their documents.
            </span>
          </label>
          {formState.errors.consentConfirmed ? (
            <p className="mt-1 text-sm font-medium text-red-700" role="alert">
              {formState.errors.consentConfirmed.message}
            </p>
          ) : null}
        </div>
        {message ? (
          <Alert tone={message.tone} role={message.tone === "success" ? "status" : "alert"}>
            {message.text}
          </Alert>
        ) : null}
        <Button type="submit" loading={formState.isSubmitting}>
          Link farmer
        </Button>
      </form>
    </Card>
  );
}
