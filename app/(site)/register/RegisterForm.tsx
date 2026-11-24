"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { FieldShell, Input } from "@/components/forms/fields";
import { Alert, Button } from "@/components/ui";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { registerSchema } from "@/lib/domain/schemas";

type Values = { displayName: string; email: string; phone: string; password: string };

export function RegisterForm() {
  const { register, handleSubmit, setError, formState } = useForm<Values>({
    defaultValues: { displayName: "", email: "", phone: "", password: "" },
  });
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(values: Values) {
    setMessage(null);
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      for (const [key, errors] of Object.entries(parsed.error.flatten().fieldErrors)) {
        setError(key as keyof Values, { message: errors?.[0] });
      }
      return;
    }
    try {
      const result = await apiFetch<{ home: string }>("/api/auth/register", { body: parsed.data });
      window.location.assign(result.home);
    } catch (error) {
      if (error instanceof ApiClientError && error.details?.fieldErrors) {
        for (const [key, errors] of Object.entries(error.details.fieldErrors)) {
          setError(key as keyof Values, { message: errors?.[0] });
        }
      }
      setMessage(error instanceof ApiClientError ? error.message : "Registration failed. Please try again.");
    }
  }

  const e = formState.errors;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {message ? <Alert tone="error">{message}</Alert> : null}
      <FieldShell id="displayName" label="Full name" required error={e.displayName?.message}>
        <Input id="displayName" autoComplete="name" invalid={Boolean(e.displayName)} {...register("displayName")} />
      </FieldShell>
      <FieldShell id="email" label="Email" required error={e.email?.message}>
        <Input id="email" type="email" autoComplete="email" invalid={Boolean(e.email)} {...register("email")} />
      </FieldShell>
      <FieldShell id="phone" label="Mobile number" hint="Optional. 10 digits." error={e.phone?.message}>
        <Input id="phone" inputMode="numeric" autoComplete="tel-national" invalid={Boolean(e.phone)} {...register("phone")} />
      </FieldShell>
      <FieldShell id="password" label="Password" required hint="At least 8 characters with a letter and a number." error={e.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" invalid={Boolean(e.password)} {...register("password")} />
      </FieldShell>
      <Button type="submit" loading={formState.isSubmitting} className="w-full">
        Create account
      </Button>
    </form>
  );
}
