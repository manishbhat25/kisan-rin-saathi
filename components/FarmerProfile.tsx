"use client";

import Link from "next/link";
import { copyFor } from "@/lib/copy";
import {
  displayAmount,
  displayCrop,
  displayDistrict,
  displayExistingLoan,
  displayFarmerType,
  displayIrrigation,
  displayLand,
  displayPurpose,
  displayState,
  documentsReadyLabel,
  infoCompleteLabel,
  readinessPercent,
} from "@/lib/profile";
import type { DocumentKind, FarmerProfile as Profile, LanguageCode } from "@/lib/types";
import { DocumentUpload } from "./DocumentUpload";
import { ProfileField } from "./ProfileField";
import { ProgressIndicator } from "./ProgressIndicator";

export function FarmerProfile({
  language,
  profile,
  savedAt,
  onUpload,
  onReset,
}: {
  language: LanguageCode;
  profile: Profile;
  savedAt: string | null;
  onUpload: (kind: DocumentKind, file: File) => void;
  onReset: () => void;
}) {
  const copy = copyFor(language);
  const percent = readinessPercent(profile);
  const documentCount = new Set(profile.documents.map((item) => item.kind)).size;
  const savedTime = savedAt
    ? new Date(savedAt).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
    : "";

  const rows: { label: string; value: string | null }[] = [
    { label: copy.fields.name, value: profile.name },
    { label: copy.fields.state, value: displayState(profile, language) },
    { label: copy.fields.district, value: displayDistrict(profile, language) },
    { label: copy.fields.village, value: profile.village },
    { label: copy.fields.farmerType, value: displayFarmerType(profile, language) },
    { label: copy.fields.land, value: displayLand(profile, language) },
    { label: copy.fields.crop, value: displayCrop(profile, language) },
    { label: copy.fields.irrigation, value: displayIrrigation(profile, language) },
    { label: copy.fields.loanNeed, value: displayAmount(profile, language) },
    { label: copy.fields.purpose, value: displayPurpose(profile, language) },
    { label: copy.fields.existingLoan, value: displayExistingLoan(profile, language) },
  ];

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-2xl font-semibold text-[#1C1916]">{copy.profileTitle}</h2>
      </div>
      {savedAt ? (
        <p className="mb-2 text-base text-[#5C574F]">
          {copy.saved} · {savedTime}
        </p>
      ) : null}

      {rows.map((row) => (
        <ProfileField
          key={row.label}
          label={row.label}
          value={row.value ?? copy.notProvided}
          filled={Boolean(row.value)}
        />
      ))}
      <ProfileField
        label={copy.fields.documents}
        value={documentsReadyLabel(profile, language)}
        filled={documentCount > 0}
      />

      <DocumentUpload language={language} documents={profile.documents} onUpload={onUpload} />

      <div className="mt-6">
        <ProgressIndicator percent={percent} label={infoCompleteLabel(percent, language)} />
      </div>
      <Link href="/applications" className="mt-4 inline-flex text-base text-[#1B6B45] underline decoration-[#1B6B45]/30 underline-offset-4 sm:hidden">
        {copy.myApplications}
      </Link>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 text-base text-[#5C574F] underline decoration-black/20 underline-offset-4"
      >
        {copy.startOver}
      </button>
    </section>
  );
}
