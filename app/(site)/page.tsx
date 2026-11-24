import Link from "next/link";
import { Card, LinkButton } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { currentActor, homeFor } from "@/server/auth/actor";

const ROUTE_CARD = "rounded-xl border border-brand-200 bg-brand-100 p-5 shadow-sm";

const STEPS = [
  { title: "Compare", body: "See the government scheme and bank loan side by side in plain language." },
  { title: "Apply", body: "Fill a short form step by step, save drafts and upload documents from your phone." },
  { title: "Review", body: "An officer checks your application and runs an eligibility assessment." },
  { title: "Correct if needed", body: "If something is missing, you get a clear list of changes and can resubmit." },
  { title: "Decision", body: "See the officer's decision with reasons, and other options if it is not approved." },
];

export default async function LandingPage() {
  const actor = await currentActor();
  const { t } = await getDict();
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">{t.tagline}</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Find the right farm financing — and follow your application to the end.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Compare a government support scheme with an agricultural bank loan, apply online or at a service centre, and
            see exactly what the reviewing officer needs from you.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {actor ? (
              <LinkButton href={homeFor(actor.role)}>Go to your dashboard</LinkButton>
            ) : (
              <>
                <LinkButton href="/register">{t.register}</LinkButton>
                <LinkButton href="/login" variant="secondary">
                  {t.login}
                </LinkButton>
              </>
            )}
            <LinkButton href="/compare" variant="ghost">
              {t.navCompare} →
            </LinkButton>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <section className={ROUTE_CARD}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Route 1</p>
            <h2 className="mt-1 text-xl font-bold text-brand-900">Government scheme</h2>
            <p className="mt-1 text-sm text-brand-900/80">For small and marginal farmers needing inputs, irrigation or small equipment.</p>
            <LinkButton href="/farmer/applications/new?route=GOVERNMENT" className="mt-4">
              {t.applyGov}
            </LinkButton>
          </section>
          <section className={ROUTE_CARD}>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Route 2</p>
            <h2 className="mt-1 text-xl font-bold text-brand-900">Agricultural bank loan</h2>
            <p className="mt-1 text-sm text-brand-900/80">Credit sized to your repayment capacity for crops, equipment, dairy or storage.</p>
            <LinkButton href="/farmer/applications/new?route=BANK" className="mt-4">
              {t.applyBank}
            </LinkButton>
          </section>
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-line bg-white p-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{index + 1}</span>
              <p className="mt-3 font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Need help filling the form?</h2>
          <p className="mt-1 text-sm text-muted">
            Visit a service centre. Share a one-time code from your profile so the operator can apply on your behalf — the
            application always stays in your account.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Prefer to talk?</h2>
          <p className="mt-1 text-sm text-muted">
            Use the <Link href="/assistant" className="font-medium text-brand-700 underline">voice assistant</Link> in Hindi and other
            languages to understand your options, then continue to the form.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Clear about what the model does</h2>
          <p className="mt-1 text-sm text-muted">
            Eligibility models are trained on synthetic data and only advise officers. See the{" "}
            <Link href="/eligibility" className="font-medium text-brand-700 underline">requirements and model details</Link>.
          </p>
        </Card>
      </section>
    </div>
  );
}
