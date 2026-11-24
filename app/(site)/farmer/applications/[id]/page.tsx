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
import { label } from "@/lib/domain/constants";
import { fieldLabel } from "@/lib/domain/fields";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { loadViewOr404 } from "@/server/pages";

export const metadata = { title: "Application" };

const WITH_OFFICER = new Set(["SUBMITTED", "UNDER_REVIEW", "ASSESSMENT_PENDING", "ASSESSMENT_COMPLETED", "RESUBMITTED", "HUMAN_REVIEW_REQUIRED"]);

export default async function FarmerApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const actor = await requirePageActor(["FARMER"], `/farmer/applications/${id}`);
  const [view, { t, lang }] = await Promise.all([loadViewOr404(actor, id), getDict()]);
  const correcting = view.status === "CHANGES_REQUESTED";
  const changeRequests = view.reviews.filter((review) => review.kind === "CHANGES_REQUESTED");

  return (
    <div>
      <Link href="/farmer/applications" className="text-sm font-semibold text-brand-700 underline">
        ← {t.navApplications}
      </Link>
      <div className="mt-3">
        <ApplicationHeader view={view} lang={lang} />
      </div>

      <div className="space-y-4">
        {query.submitted && WITH_OFFICER.has(view.status) ? (
          <Alert tone="success" title={view.currentRevisionNo > 1 ? "Resubmitted" : "Submitted"} role="status">
            Your application {view.reference} was sent to the {view.route === "GOVERNMENT" ? "agriculture department" : "bank"}. We will notify you
            when the officer responds.
          </Alert>
        ) : null}

        {correcting ? (
          <Alert tone="warning" title={t.actionRequired}>
            <p>The officer reviewed your application and asked for the following:</p>
            <ul className="mt-2 list-inside list-disc">
              {view.openItems.map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">
                    {item.itemType === "FIELD"
                      ? fieldLabel(view.route, item.fieldKey ?? "")
                      : item.itemType === "DOCUMENT"
                        ? label(item.documentType)
                        : "General"}
                    :
                  </span>{" "}
                  {item.message}
                </li>
              ))}
            </ul>
            {changeRequests[0]?.deadline ? <p className="mt-2 font-medium">Please respond by {new Date(changeRequests[0].deadline).toLocaleDateString("en-IN")}.</p> : null}
          </Alert>
        ) : null}

        {view.status === "DRAFT" ? (
          <Alert tone="info" title="Draft — not yet submitted">
            Nobody else can see this application until you submit it.
          </Alert>
        ) : null}

        {view.status === "REJECTED" || view.status === "WITHDRAWN" || view.assessments[0]?.outcome === "NOT_ELIGIBLE" ? (
          view.canStartAlternative ? (
            <Alert tone="info" title="Other options">
              You can apply through the {view.route === "GOVERNMENT" ? "bank" : "government scheme"} route instead. We will copy only the details you
              choose.
            </Alert>
          ) : null
        ) : null}

        <FarmerActions view={view} basePath="/farmer/applications" />

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-4">
            {view.decisions.length > 0 ? (
              <SectionCard title="Decision" id="decision-heading">
                <DecisionPanel view={view} />
              </SectionCard>
            ) : null}
            <SectionCard title="Eligibility assessment" id="assessment-heading">
              <AssessmentPanel view={view} audience="farmer" />
              <p className="mt-3 text-xs text-muted">{t.advisory}</p>
            </SectionCard>
            {changeRequests.length > 0 ? (
              <SectionCard title="Officer reviews" id="reviews-heading">
                <ReviewsList view={view} audience="farmer" />
              </SectionCard>
            ) : null}
            <SectionCard title="Your details" id="details-heading">
              <DetailsSummary view={view} details={view.details} highlight={view.openItems.map((item) => item.fieldKey ?? "")} />
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
