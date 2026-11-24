import { DOCUMENT_KINDS } from "./profile";
import type { FarmerProfile, LoanOption } from "./types";

const REQUIRED_DOCS = ["aadhaar", "land_record", "passbook", "crop"] as const;

export function buildLoans(profile: FarmerProfile): LoanOption[] {
  const cultivating =
    profile.farmerType === "owner" ||
    profile.farmerType === "cultivator" ||
    profile.farmerType === "tenant" ||
    profile.farmerType === "sharecropper";

  const cropPurpose = profile.purpose === "crop_input";
  const oralOrOther =
    profile.farmerType === "oral_lessee" || profile.farmerType === "other";

  let kccStatus: LoanOption["status"] = "further_verification";
  if (cultivating && cropPurpose) kccStatus = "potentially_eligible";
  else if (cultivating && profile.purpose === "equipment") kccStatus = "more_info";
  else if (oralOrOther) kccStatus = "further_verification";
  else if (profile.purpose && !cropPurpose) kccStatus = "more_info";

  const sbiStatus: LoanOption["status"] =
    kccStatus === "potentially_eligible" ? "potential_match" : "further_verification";

  const termStatus: LoanOption["status"] =
    profile.purpose === "equipment" || profile.purpose === "land_improvement"
      ? "likely_match"
      : "more_info";

  const sharedMissing = missingFor(profile);

  return [
    { id: "kcc", status: kccStatus, missing: sharedMissing },
    { id: "sbi-kcc", status: sbiStatus, missing: sharedMissing },
    {
      id: "term",
      status: termStatus,
      missing:
        termStatus === "more_info"
          ? [...sharedMissing, "termPurpose"]
          : sharedMissing,
    },
  ];
}

function missingFor(profile: FarmerProfile): LoanOption["missing"] {
  const missing: LoanOption["missing"] = [];
  if (!profile.name) missing.push("name");
  if (!profile.village) missing.push("village");
  if (!profile.irrigation) missing.push("irrigation");
  for (const kind of REQUIRED_DOCS) {
    if (!profile.documents.some((doc) => doc.kind === kind)) missing.push(kind);
  }
  return missing;
}

export function uploadedDocumentCount(profile: FarmerProfile): number {
  return DOCUMENT_KINDS.filter((kind) =>
    profile.documents.some((doc) => doc.kind === kind),
  ).length;
}
