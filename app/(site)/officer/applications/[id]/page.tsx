import Link from "next/link";
import { DecisionForm, InternalNoteForm, OfficerStatusActions, ReviewComposer } from "@/components/app/OfficerActions";
import { RevisionCompare } from "@/components/app/RevisionCompare";
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
import { fieldLabel } from "@/lib/domain/fields";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { loadViewOr404 } from "@/server/pages";

export const metadata = { title: "Review application" };

export default async function OfficerApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePageActor(["GOV_OFFICER", "BANK_OFFICER"], `/officer/applications/${id}`);
  const [view, { t, lang }] = await Promise.all([loadViewOr404(actor, id), getDict()]);
  const current = view.revisions.find((revision) => revision.revisionNo === view.currentRevisionNo);
  const changed = view.currentRevisionNo > 1 ? current?.changedFields ?? [] : [];
  const changedFields = changed.filter((key) => !key.startsWith("document:"));
  const openItems = view.openItems;
  const decided = view.status === "APPROVED" || view.status === "REJECTED" || view.status === "WITHDRAWN";

  return (
    <div>
      <Link href="/officer" className="text-sm font-semibold text-brand-700 underline">
        ← {t.navQueue}
      </Link>
      <div className="mt-3">
        <ApplicationHeader view={view} lang={lang} />
      </div>

      <div className="space-y-4">
        {view.status === "RESUBMITTED" && changed.length > 0 ? (
          <Alert tone="info" title={`Resubmitted as revision ${view.currentRevisionNo}`}>
            Changed: {changed.map((key) => (key.startsWith("document:") ? `document (${key.slice(9).toLowerCase().replace(/_/g, " ")})` : fieldLabel(view.route, key))).join(", ")}.
            Changed fields are highlighted below.
          </Alert>
        ) : null}
        {view.status === "CHANGES_REQUESTED" ? (
          <Alert tone="warning" title="Waiting for the farmer">
            {openItems.length} requested change(s) are open. You will be notified when the farmer resubmits.
          </Alert>
        ) : null}
        {view.status === "WITHDRAWN" ? <Alert tone="info">The farmer withdrew this application.</Alert> : null}

        <OfficerStatusActions view={view} />

        <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
          <div className="min-w-0 space-y-4">
            <SectionCard title="Eligibility assessment" id="assessment-heading">
              <AssessmentPanel view={view} audience="officer" />
            </SectionCard>
            <SectionCard title={`Submitted details${view.currentRevisionNo ? ` (revision ${view.currentRevisionNo})` : ""}`} id="details-heading">
              <DetailsSummary view={view} details={view.details} highlight={changedFields} />
              {view.applicant.email || view.applicant.phone ? (
                <p className="mt-4 text-sm text-muted">
                  Contact: {[view.applicant.email, view.applicant.phone].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </SectionCard>
            <SectionCard title="Documents" id="documents-heading">
              <DocumentsList view={view} />
            </SectionCard>
            {view.revisions.length > 1 ? (
              <SectionCard title="Compare revisions" id="compare-heading">
                <RevisionCompare view={view} />
              </SectionCard>
            ) : null}
            <SectionCard title="Reviews and notes" id="reviews-heading">
              <ReviewsList view={view} audience="officer" />
            </SectionCard>
          </div>

          <aside className="space-y-4">
            {view.decisions.length > 0 ? (
              <SectionCard title="Decisions" id="decisions-heading">
                <DecisionPanel view={view} />
              </SectionCard>
            ) : null}
            <ReviewComposer view={view} />
            <DecisionForm view={view} />
            {!decided ? (
              <SectionCard title="Internal notes" id="notes-heading">
                <InternalNoteForm view={view} />
              </SectionCard>
            ) : null}
            <SectionCard title="Timeline" id="timeline-heading">
              <Timeline view={view} lang={lang} />
            </SectionCard>
          </aside>
        </div>
      </div>
    </div>
  );
}
