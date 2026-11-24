import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { currentActor, homeFor } from "@/server/auth/actor";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const DEMO_ACCOUNTS = [
  { role: "Farmer", email: "farmer@demo.in" },
  { role: "Government officer", email: "gov.officer@demo.in" },
  { role: "Bank officer", email: "bank.officer@demo.in" },
  { role: "Service-centre operator", email: "operator@demo.in" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const actor = await currentActor();
  if (actor) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : homeFor(actor.role));

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_320px]">
      <Card>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-muted">Farmers, officers and service-centre operators use the same sign-in.</p>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-sm text-muted">
          New farmer?{" "}
          <Link href="/register" className="font-semibold text-brand-700 underline">
            Create an account
          </Link>
        </p>
      </Card>
      <Card className="bg-brand-50">
        <h2 className="font-semibold">Demo accounts</h2>
        <p className="mt-1 text-sm text-muted">
          Password for all: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-ink">Demo@1234</code>
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <span className="block font-medium">{account.role}</span>
              <code className="font-mono text-brand-800">{account.email}</code>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">Synthetic accounts for demonstration only.</p>
      </Card>
    </div>
  );
}
