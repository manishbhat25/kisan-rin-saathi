import Link from "next/link";
import { FarmerActions } from "@/components/app/FarmerActions";
import {
  ApplicationHeader,
  AssessmentPanel,
  DecisionPanel,
  DetailsSummary,
  DocumentsList,
  ReviewsList,
  SectionCard,
  Timeline,
} from "@/components/app/views";
import { Alert } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { loadViewOr404 } from "@/server/pages";

export const metadata = { title: "Assisted application" };

export default async function OperatorApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const actor = await requirePageActor(["OPERATOR"], `/operator/applications/${id}`);
  const [view, { t, lang }] = await Promise.all([loadViewOr404(actor, id), getDict()]);

  return (
    <div>
      <Link href="/operator" className="text-sm font-semibold text-brand-700 underline">
        ← Service centre
      </Link>
      <div className="mt-3">
        <ApplicationHeader view={view} lang={lang} />
      </div>
      <div className="space-y-4">
        <Alert tone="info">
          You are acting for {view.applicant.name} with their consent. The farmer can see this application in their own account.
        </Alert>
        {query.submitted && view.status !== "DRAFT" ? (
          <Alert tone="success" title="Submitted" role="status">
            {view.reference} was submitted on behalf of {view.applicant.name}. The farmer has been notified.
          </Alert>
        ) : null}
        {view.status === "CHANGES_REQUESTED" ? <Alert tone="warning" title={t.actionRequired}>The officer asked for changes.</Alert> : null}
        <FarmerActions view={view} basePath="/operator/applications" />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-4">
            {view.decisions.length > 0 ? (
              <SectionCard title="Decision" id="decision-heading">
                <DecisionPanel view={view} />
              </SectionCard>
            ) : null}
            <SectionCard title="Eligibility assessment" id="assessment-heading">
              <AssessmentPanel view={view} audience="farmer" />
            </SectionCard>
            {view.reviews.length > 0 ? (
              <SectionCard title="Officer reviews" id="reviews-heading">
                <ReviewsList view={view} audience="farmer" />
              </SectionCard>
            ) : null}
            <SectionCard title="Details" id="details-heading">
              <DetailsSummary view={view} details={view.details} />
            </SectionCard>
            <SectionCard title="Documents" id="documents-heading">
              <DocumentsList view={view} />
            </SectionCard>
          </div>
          <aside>
            <SectionCard title="Progress" id="timeline-heading">
              <Timeline view={view} lang={lang} />
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
