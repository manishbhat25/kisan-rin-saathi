"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { FieldShell, Input } from "@/components/forms/fields";
import { Alert, Button } from "@/components/ui";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { safeNextPath } from "@/lib/domain/redirect";
import { loginSchema } from "@/lib/domain/schemas";

type Values = { email: string; password: string };

export function LoginForm({ next }: { next?: string }) {
  const { register, handleSubmit, setError, formState } = useForm<Values>({ defaultValues: { email: "", password: "" } });
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(values: Values) {
    setMessage(null);
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      for (const [key, errors] of Object.entries(parsed.error.flatten().fieldErrors)) {
        setError(key as keyof Values, { message: errors?.[0] });
      }
      return;
    }
    try {
      const result = await apiFetch<{ home: string }>("/api/auth/login", { body: parsed.data });
      const target = safeNextPath(next) ?? result.home;
      window.location.assign(target);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : "Sign-in failed. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {message ? <Alert tone="error">{message}</Alert> : null}
      <FieldShell id="email" label="Email" error={formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" invalid={Boolean(formState.errors.email)} {...register("email")} />
      </FieldShell>
      <FieldShell id="password" label="Password" error={formState.errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          invalid={Boolean(formState.errors.password)}
          {...register("password")}
        />
      </FieldShell>
      <Button type="submit" loading={formState.isSubmitting} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
