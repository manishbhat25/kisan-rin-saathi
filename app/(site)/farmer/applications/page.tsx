import { ApplicationTable } from "@/components/app/views";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { listApplications } from "@/server/domain/queries";

export const metadata = { title: "My applications" };

export default async function FarmerApplications() {
  const actor = await requirePageActor(["FARMER"], "/farmer/applications");
  const [apps, { t, lang }] = await Promise.all([listApplications(actor), getDict()]);
  return (
    <div>
      <PageHeader
        title={t.navApplications}
        subtitle="Every application you have started, newest first."
        actions={<LinkButton href="/farmer/applications/new">{t.newApplication}</LinkButton>}
      />
      {apps.length === 0 ? (
        <EmptyState title={t.noApplications} action={<LinkButton href="/farmer/applications/new">{t.newApplication}</LinkButton>} />
      ) : (
        <ApplicationTable items={apps} hrefBase="/farmer/applications" audience="farmer" lang={lang} />
      )}
    </div>
  );
}
