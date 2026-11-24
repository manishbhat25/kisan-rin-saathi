import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { currentActor, homeFor } from "@/server/auth/actor";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const actor = await currentActor();
  if (actor) redirect(homeFor(actor.role));
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <h1 className="text-2xl font-bold">Create a farmer account</h1>
        <p className="mt-1 text-muted">
          One account lets you compare financing routes, apply, upload documents and follow every step of your application.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-6 text-sm text-muted">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-brand-700 underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-xs text-muted">
          Officer and service-centre accounts are created by their organizations, not through this form.
        </p>
      </Card>
    </div>
  );
}
