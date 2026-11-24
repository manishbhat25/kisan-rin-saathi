import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationForm } from "@/components/app/ApplicationForm";
import { RouteBadge, StatusBadge } from "@/components/ui";
import { getLang } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { loadViewOr404 } from "@/server/pages";

export const metadata = { title: "Edit application" };

export default async function EditFarmerApplication({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor(["FARMER"], `/farmer/applications/${id}/edit`);
  const [view, lang] = await Promise.all([loadViewOr404(actor, id), getLang()]);
  if (view.status !== "DRAFT" && view.status !== "CHANGES_REQUESTED") redirect(`/farmer/applications/${id}`);
  return (
    <div>
      <Link href={`/farmer/applications/${id}`} className="text-sm font-semibold text-brand-700 underline">
        ← Back to application
      </Link>
      <div className="mb-6 mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <RouteBadge route={view.route} />
          <StatusBadge status={view.status} lang={lang} />
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          {view.status === "CHANGES_REQUESTED" ? "Update and resubmit" : "Complete your application"}{" "}
          <span className="font-mono text-xl text-muted">{view.reference}</span>
        </h1>
      </div>
      <ApplicationForm view={view} detailHref={`/farmer/applications/${id}`} />
    </div>
  );
}
