import Link from "next/link";
import { ApplicationTable } from "@/components/app/views";
import { Alert, Card, CardTitle, EmptyState, LinkButton, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { getDict } from "@/lib/i18n-server";
import { requirePageActor } from "@/server/auth/actor";
import { getProfile } from "@/server/domain/accounts";
import { listApplications } from "@/server/domain/queries";

export const metadata = { title: "Dashboard" };

const PROFILE_FIELDS = 6;

const ACTIVE = new Set(["SUBMITTED", "UNDER_REVIEW", "ASSESSMENT_PENDING", "ASSESSMENT_COMPLETED", "RESUBMITTED", "HUMAN_REVIEW_REQUIRED"]);

const COPY = {
  en: {
    subtitle: "Track your loan applications, respond to officers and start a new application.",
    changes: (n: number) => `the officer asked for ${n} change(s).`,
    needAction: "Need your action",
    drafts: "Drafts",
    withOfficer: "With the officer",
    decided: "Decided",
    yourApplications: "Your applications",
    seeAll: "See all",
    compare: "Compare financing routes",
    emptyHint: "Not sure where to start? Compare the government scheme and bank loan routes first.",
    yourProfile: "Your profile",
    gaps: (n: number) => `${n} detail(s) missing. A complete profile fills in new applications for you.`,
    complete: "Your profile is complete and will prefill new applications.",
    completeProfile: "Complete profile",
    viewProfile: "View profile",
    help: "Getting help",
    helpBody:
      "A service-centre operator can fill in the form with you. From your profile, create a one-time code and share it only with the operator you trust.",
    startTitle: "Start a new application",
    startBody: "Choose a route. Your saved profile fills in the first details for you.",
    govHint: "Inputs, irrigation or small equipment",
    bankHint: "Credit sized to your repayment capacity",
    fixNow: "Fix now",
    needActionHint: "Officer asked for changes",
    draftsHint: "Not yet submitted",
    withOfficerHint: "Being reviewed",
    decidedHint: "Approved or rejected",
    profileComplete: "Profile completeness",
  },
  hi: {
    subtitle: "अपने ऋण आवेदनों की स्थिति देखें, अधिकारियों को जवाब दें और नया आवेदन शुरू करें।",
    changes: (n: number) => `अधिकारी ने ${n} बदलाव माँगे हैं।`,
    needAction: "आपकी कार्रवाई ज़रूरी",
    drafts: "ड्राफ़्ट",
    withOfficer: "अधिकारी के पास",
    decided: "निर्णय हो चुका",
    yourApplications: "आपके आवेदन",
    seeAll: "सभी देखें",
    compare: "वित्त विकल्पों की तुलना करें",
    emptyHint: "कहाँ से शुरू करें? पहले सरकारी योजना और बैंक ऋण की तुलना देखें।",
    yourProfile: "आपकी प्रोफ़ाइल",
    gaps: (n: number) => `${n} जानकारी बाकी है। पूरी प्रोफ़ाइल से नए आवेदन अपने आप भर जाते हैं।`,
    complete: "आपकी प्रोफ़ाइल पूरी है और नए आवेदनों में अपने आप भरी जाएगी।",
    completeProfile: "प्रोफ़ाइल पूरी करें",
    viewProfile: "प्रोफ़ाइल देखें",
    help: "मदद",
    helpBody: "सेवा केंद्र संचालक आपके साथ फ़ॉर्म भर सकते हैं। अपनी प्रोफ़ाइल से एक बार का कोड बनाएँ और केवल भरोसेमंद संचालक को दें।",
    startTitle: "नया आवेदन शुरू करें",
    startBody: "एक विकल्प चुनें। आपकी सहेजी गई प्रोफ़ाइल से शुरुआती जानकारी अपने आप भर जाएगी।",
    govHint: "खाद-बीज, सिंचाई या छोटे उपकरण",
    bankHint: "चुकाने की क्षमता के अनुसार ऋण",
    fixNow: "अभी सुधारें",
    needActionHint: "अधिकारी ने बदलाव माँगे",
    draftsHint: "अभी जमा नहीं हुए",
    withOfficerHint: "जाँच चल रही है",
    decidedHint: "स्वीकृत या अस्वीकृत",
    profileComplete: "प्रोफ़ाइल पूर्णता",
  },
};

export default async function FarmerDashboard() {
  const actor = await requirePageActor(["FARMER"], "/farmer");
  const [apps, profile, { t, lang }] = await Promise.all([listApplications(actor), getProfile(actor), getDict()]);
  const copy = COPY[lang];
  const actionRequired = apps.filter((app) => app.status === "CHANGES_REQUESTED");
  const drafts = apps.filter((app) => app.status === "DRAFT");
  const active = apps.filter((app) => ACTIVE.has(app.status));
  const decided = apps.filter((app) => app.status === "APPROVED" || app.status === "REJECTED");
  const p = profile.farmerProfile;
  const profileGaps = !p ? PROFILE_FIELDS : [p.age, p.stateCode, p.district, p.village, p.farmerCategory, p.landholdingAcres].filter((v) => v === null).length;

  return (
    <div>
      <PageHeader eyebrow={t.navDashboard} title={`${t.welcome}, ${profile.displayName.split(" ")[0]}`} subtitle={copy.subtitle} />

      {actionRequired.length > 0 ? (
        <Alert tone="warning" title={t.actionRequired} className="mb-6">
          <ul className="mt-2 space-y-2">
            {actionRequired.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <Link className="font-mono font-semibold underline" href={`/farmer/applications/${app.id}`}>
                    {app.reference}
                  </Link>{" "}
                  — {copy.changes(app.openCorrections)}
                </span>
                <LinkButton href={`/farmer/applications/${app.id}`} variant="warning" className="min-h-9 py-1">
                  {copy.fixNow}
                  <span className="sr-only"> {app.reference}</span>
                </LinkButton>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <section aria-labelledby="start-heading" className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
        <h2 id="start-heading" className="text-lg font-bold text-brand-900">
          {copy.startTitle}
        </h2>
        <p className="mt-1 text-sm text-brand-900/80">{copy.startBody}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-brand-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{copy.govHint}</p>
            <LinkButton href="/farmer/applications/new?route=GOVERNMENT" className="mt-3 w-full">
              {t.applyGov}
            </LinkButton>
          </div>
          <div className="rounded-xl border border-brand-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{copy.bankHint}</p>
            <LinkButton href="/farmer/applications/new?route=BANK" className="mt-3 w-full">
              {t.applyBank}
            </LinkButton>
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={copy.needAction} value={actionRequired.length} accent={actionRequired.length ? "amber" : "slate"} hint={copy.needActionHint} />
        <Stat label={copy.drafts} value={drafts.length} accent="slate" hint={copy.draftsHint} />
        <Stat label={copy.withOfficer} value={active.length} accent="sky" hint={copy.withOfficerHint} />
        <Stat label={copy.decided} value={decided.length} accent="brand" hint={copy.decidedHint} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="apps-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="apps-heading" className="text-lg font-bold">
              {copy.yourApplications}
            </h2>
            {apps.length > 5 ? (
              <Link href="/farmer/applications" className="text-sm font-semibold text-brand-700 underline">
                {copy.seeAll}
              </Link>
            ) : null}
          </div>
          {apps.length === 0 ? (
            <EmptyState title={t.noApplications} action={<LinkButton href="/compare">{copy.compare}</LinkButton>}>
              {copy.emptyHint}
            </EmptyState>
          ) : (
            <ApplicationTable items={apps.slice(0, 5)} hrefBase="/farmer/applications" audience="farmer" lang={lang} />
          )}
        </section>

        <aside className="space-y-4">
          <Card>
            <CardTitle>{copy.yourProfile}</CardTitle>
            <ProgressBar value={((PROFILE_FIELDS - profileGaps) / PROFILE_FIELDS) * 100} label={copy.profileComplete} />
            <p className="mt-3 text-sm text-muted">{profileGaps > 0 ? copy.gaps(profileGaps) : copy.complete}</p>
            <LinkButton href="/farmer/profile" variant={profileGaps > 0 ? "primary" : "secondary"} className="mt-3 w-full">
              {profileGaps > 0 ? copy.completeProfile : copy.viewProfile}
            </LinkButton>
          </Card>
          <Card>
            <CardTitle>{copy.help}</CardTitle>
            <p className="text-sm text-muted">{copy.helpBody}</p>
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
