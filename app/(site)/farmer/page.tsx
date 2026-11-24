import Link from "next/link";
import { ApplicationTable } from "@/components/app/views";
import { Alert, Card, CardTitle, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { getProfile } from "@/server/domain/accounts";
import { listApplications } from "@/server/domain/queries";

export const metadata = { title: "Dashboard" };

const ACTIVE = new Set(["SUBMITTED", "UNDER_REVIEW", "ASSESSMENT_PENDING", "ASSESSMENT_COMPLETED", "RESUBMITTED", "HUMAN_REVIEW_REQUIRED"]);

export default async function FarmerDashboard() {
  const actor = await requirePageActor(["FARMER"], "/farmer");
  const [apps, profile, { t, lang }] = await Promise.all([listApplications(actor), getProfile(actor), getDict()]);
  const actionRequired = apps.filter((app) => app.status === "CHANGES_REQUESTED");
  const drafts = apps.filter((app) => app.status === "DRAFT");
  const active = apps.filter((app) => ACTIVE.has(app.status));
  const decided = apps.filter((app) => app.status === "APPROVED" || app.status === "REJECTED");
  const p = profile.farmerProfile;
  const profileGaps = !p ? 6 : [p.age, p.stateCode, p.district, p.village, p.farmerCategory, p.landholdingAcres].filter((v) => v === null).length;

  return (
    <div>
      <PageHeader
        eyebrow={t.navDashboard}
        title={`${t.welcome}, ${profile.displayName.split(" ")[0]}`}
        subtitle="Track your loan applications, respond to officers and start a new application."
        actions={
          <>
            <LinkButton href="/farmer/applications/new?route=GOVERNMENT">{t.applyGov}</LinkButton>
            <LinkButton href="/farmer/applications/new?route=BANK" variant="secondary">
              {t.applyBank}
            </LinkButton>
          </>
        }
      />

      {actionRequired.length > 0 ? (
        <Alert tone="warning" title={t.actionRequired} className="mb-6">
          <ul className="mt-1 space-y-1">
            {actionRequired.map((app) => (
              <li key={app.id}>
                <Link className="font-semibold underline" href={`/farmer/applications/${app.id}`}>
                  {app.reference}
                </Link>{" "}
                — the officer asked for {app.openCorrections} change(s).
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Need your action" value={actionRequired.length} tone={actionRequired.length ? "text-amber-700" : undefined} />
        <Stat label="Drafts" value={drafts.length} />
        <Stat label="With the officer" value={active.length} />
        <Stat label="Decided" value={decided.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="apps-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="apps-heading" className="text-lg font-bold">
              Your applications
            </h2>
            {apps.length > 5 ? (
              <Link href="/farmer/applications" className="text-sm font-semibold text-brand-700 underline">
                See all
              </Link>
            ) : null}
          </div>
          {apps.length === 0 ? (
            <EmptyState
              title={t.noApplications}
              action={<LinkButton href="/compare">Compare financing routes</LinkButton>}
            >
              Not sure where to start? Compare the government scheme and bank loan routes first.
            </EmptyState>
          ) : (
            <ApplicationTable items={apps.slice(0, 5)} hrefBase="/farmer/applications" audience="farmer" lang={lang} />
          )}
        </section>

        <aside className="space-y-4">
          <Card>
            <CardTitle>Your profile</CardTitle>
            {profileGaps > 0 ? (
              <p className="text-sm text-muted">
                {profileGaps} detail(s) missing. A complete profile fills in new applications for you.
              </p>
            ) : (
              <p className="text-sm text-muted">Your profile is complete and will prefill new applications.</p>
            )}
            <LinkButton href="/farmer/profile" variant="secondary" className="mt-3 w-full">
              {profileGaps > 0 ? "Complete profile" : "View profile"}
            </LinkButton>
          </Card>
          <Card>
            <CardTitle>Getting help</CardTitle>
            <p className="text-sm text-muted">
              A service-centre operator can fill in the form with you. From your profile, create a one-time code and share
              it only with the operator you trust.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <LinkButton href="/assistant" variant="ghost">
                {t.navAssistant}
              </LinkButton>
              <LinkButton href="/eligibility" variant="ghost">
                {t.viewRequirements}
              </LinkButton>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
