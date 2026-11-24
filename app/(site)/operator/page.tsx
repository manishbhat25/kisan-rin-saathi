import { OperatorLinkForm } from "@/components/app/OperatorLinkForm";
import { ApplicationTable } from "@/components/app/views";
import { Card, CardTitle, EmptyState, LinkButton, PageHeader, formatDate } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { operatorFarmers } from "@/server/domain/accounts";
import { listApplications } from "@/server/domain/queries";

export const metadata = { title: "Service centre" };

export default async function OperatorHome() {
  const actor = await requirePageActor(["OPERATOR"], "/operator");
  const [farmers, apps, { lang }] = await Promise.all([operatorFarmers(actor), listApplications(actor), getDict()]);
  const active = farmers.filter((farmer) => farmer.active);
  const activeIds = new Set<string>();
  const uniqueActive = active.filter((farmer) => (activeIds.has(farmer.farmerId) ? false : (activeIds.add(farmer.farmerId), true)));

  return (
    <div>
      <PageHeader
        eyebrow="Service-centre operator"
        title={`Welcome, ${actor.displayName}`}
        subtitle="Help farmers prepare and submit applications. Every action you take is recorded against your account."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardTitle>Farmers you can help now</CardTitle>
            {uniqueActive.length === 0 ? (
              <p className="text-sm text-muted">No active authorisations. Link a farmer with their one-time code.</p>
            ) : (
              <ul className="divide-y divide-line">
                {uniqueActive.map((farmer) => (
                  <li key={farmer.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-semibold">{farmer.farmerName}</span>
                      <span className="block text-sm text-muted">
                        {farmer.farmerEmail} · access until {formatDate(farmer.expiresAt, true)}
                      </span>
                    </span>
                    <LinkButton href={`/operator/applications/new?farmerId=${farmer.farmerId}`} data-testid="operator-start">
                      Start application
                    </LinkButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <section aria-labelledby="assisted-heading">
            <h2 id="assisted-heading" className="mb-3 text-lg font-bold">
              Applications you assisted
            </h2>
            {apps.length === 0 ? (
              <EmptyState title="None yet">Applications you start for farmers appear here.</EmptyState>
            ) : (
              <ApplicationTable items={apps} hrefBase="/operator/applications" audience="operator" lang={lang} />
            )}
          </section>
        </div>
        <aside>
          <OperatorLinkForm />
        </aside>
      </div>
    </div>
  );
}
