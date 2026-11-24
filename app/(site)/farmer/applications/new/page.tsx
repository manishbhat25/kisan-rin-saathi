import { NewApplication } from "@/components/app/NewApplication";
import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";

export const metadata = { title: "New application" };

export default async function NewFarmerApplication({
  searchParams,
}: {
  searchParams: Promise<{ route?: string; from?: string }>;
}) {
  const params = await searchParams;
  await requirePageActor(["FARMER"], `/farmer/applications/new${params.route ? `?route=${params.route}` : ""}`);
  const { t } = await getDict();
  const route = params.route === "GOVERNMENT" || params.route === "BANK" ? params.route : null;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t.newApplication} subtitle="Your answers are saved as a draft. You can return and finish later." />
      <NewApplication initialRoute={route} fromAssistant={params.from === "assistant"} basePath="/farmer/applications" />
    </div>
  );
}
