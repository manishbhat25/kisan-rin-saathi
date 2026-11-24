"use client";

import { copyFor, SOURCE_URLS } from "@/lib/copy";
import { displayAmount, displayPurpose } from "@/lib/profile";
import type { FarmerProfile, LanguageCode, LoanOption } from "@/lib/types";

const REQUIRED = ["aadhaar", "land_record", "passbook", "crop"] as const;

export function LoanCard({
  loan,
  profile,
  language,
  added,
  onListen,
  onStart,
}: {
  loan: LoanOption;
  profile: FarmerProfile;
  language: LanguageCode;
  added: boolean;
  onListen: (text: string) => void;
  onStart: () => void;
}) {
  const copy = copyFor(language);
  const key = loan.id === "sbi-kcc" ? "sbi" : loan.id;
  const details = copy.loans[key];
  const purpose = displayPurpose(profile, language);
  const amount = displayAmount(profile, language);
  const documents = REQUIRED.map((kind) => copy.docs[kind]).join(", ");
  const missing =
    loan.missing.length > 0
      ? loan.missing.map((item) => copy.missing[item]).join(", ")
      : copy.noneMissing;
  const cautious = loan.status === "further_verification" || loan.status === "more_info";
  const spoken = [
    details.name,
    copy.status[loan.status],
    purpose ? `${copy.purposeLabel}. ${purpose}` : "",
    amount ? `${copy.amountLabel}. ${amount}. ${copy.bankConfirms}` : copy.bankConfirms,
    `${copy.requiredDocsLabel}. ${documents}`,
    `${copy.missingLabel}. ${missing}`,
    `${copy.sourceLabel}. ${details.source}`,
    copy.notApproval,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <article className="rounded-3xl border border-black/5 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-[#1C1916]">{details.name}</h3>
        <p
          className={`rounded-full px-3 py-1 text-base ${
            cautious ? "bg-[#F8EFD8] text-[#6D5310]" : "bg-[#E5F2EA] text-[#1B6B45]"
          }`}
        >
          {copy.status[loan.status]}
        </p>
      </div>
      <p className="mt-3 text-base text-[#5C574F]">
        {copy.lenderLabel}: {details.lender}
      </p>
      {purpose ? (
        <p className="mt-2 text-base text-[#1C1916]">
          {copy.purposeLabel}: {purpose}
        </p>
      ) : null}
      <p className="mt-2 text-base text-[#1C1916]">
        {copy.amountLabel}: {amount ? `${amount}. ${copy.bankConfirms}` : copy.bankConfirms}
      </p>
      <p className="mt-3 text-base text-[#1C1916]">
        {copy.requiredDocsLabel}: {documents}
      </p>
      <p className="mt-2 text-base text-[#1C1916]">
        {copy.missingLabel}: {missing}
      </p>
      <p className="mt-3 text-base">
        <span className="text-[#5C574F]">{copy.sourceLabel}: </span>
        <a
          href={SOURCE_URLS[key]}
          target="_blank"
          rel="noreferrer"
          className="text-[#1B6B45] underline decoration-[#1B6B45]/30 underline-offset-4"
        >
          {details.source}
        </a>
      </p>
      <p className="mt-3 text-base text-[#5C574F]">{copy.notApproval}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onListen(spoken)}
          className="h-12 rounded-2xl bg-[#1B6B45] px-4 text-base font-medium text-white"
        >
          {copy.listenDetails}
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={added}
          className="h-12 rounded-2xl border border-black/10 bg-white px-4 text-base text-[#1C1916] disabled:text-[#8A847C]"
        >
          {added ? copy.addedApplication : copy.startApplication}
        </button>
      </div>
    </article>
  );
}
