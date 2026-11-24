import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationForm } from "@/components/app/ApplicationForm";
import { Alert, RouteBadge, StatusBadge } from "@/components/ui";
import { getLang } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { loadViewOr404 } from "@/server/pages";

export const metadata = { title: "Assisted application" };

export default async function OperatorEditApplication({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor(["OPERATOR"], `/operator/applications/${id}/edit`);
  const [view, lang] = await Promise.all([loadViewOr404(actor, id), getLang()]);
  if (view.status !== "DRAFT" && view.status !== "CHANGES_REQUESTED") redirect(`/operator/applications/${id}`);
  return (
    <div>
      <Link href={`/operator/applications/${id}`} className="text-sm font-semibold text-brand-700 underline">
        ← Back to application
      </Link>
      <div className="mb-4 mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <RouteBadge route={view.route} />
          <StatusBadge status={view.status} lang={lang} />
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Application for {view.applicant.name} <span className="font-mono text-xl text-muted">{view.reference}</span>
        </h1>
      </div>
      <Alert tone="info" className="mb-6">
        Assisted submission. Check each answer with the farmer before you submit.
      </Alert>
      <ApplicationForm view={view} detailHref={`/operator/applications/${id}`} />
    </div>
  );
}
