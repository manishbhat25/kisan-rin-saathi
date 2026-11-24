import { DISTRICTS, STATES, CROPS, labelOf } from "./catalog";
import { fill, resolveLang } from "./languages";
import { copyFor } from "./copy";
import type {
  DocumentKind,
  FarmerProfile,
  LandUnit,
  LanguageCode,
  LoanApplication,
} from "./types";

export const DOCUMENT_KINDS: DocumentKind[] = [
  "aadhaar",
  "land_record",
  "passbook",
  "crop",
  "other",
];

export function emptyProfile(): FarmerProfile {
  return {
    name: null,
    stateId: null,
    stateText: null,
    districtId: null,
    districtText: null,
    village: null,
    farmerType: null,
    landValue: null,
    landUnit: null,
    cropIds: [],
    cropText: null,
    irrigation: null,
    amountRupees: null,
    purpose: null,
    existingLoan: null,
    documents: [],
  };
}

export function hasState(profile: FarmerProfile): boolean {
  return Boolean(profile.stateId || profile.stateText);
}

export function hasDistrict(profile: FarmerProfile): boolean {
  return Boolean(profile.districtId || profile.districtText);
}

export function hasCrop(profile: FarmerProfile): boolean {
  return profile.cropIds.length > 0 || Boolean(profile.cropText);
}

export function hasLand(profile: FarmerProfile): boolean {
  return profile.landValue !== null && profile.landUnit !== null;
}

export function isReadyForResults(profile: FarmerProfile): boolean {
  return (
    hasState(profile) &&
    hasDistrict(profile) &&
    profile.farmerType !== null &&
    hasLand(profile) &&
    hasCrop(profile) &&
    profile.purpose !== null &&
    profile.amountRupees !== null
  );
}

export function readinessPercent(profile: FarmerProfile): number {
  const checks = [
    Boolean(profile.name),
    hasState(profile),
    hasDistrict(profile),
    Boolean(profile.village),
    profile.farmerType !== null,
    hasLand(profile),
    hasCrop(profile),
    profile.irrigation !== null,
    profile.amountRupees !== null,
    profile.purpose !== null,
    profile.existingLoan !== null,
    ...DOCUMENT_KINDS.map((kind) =>
      profile.documents.some((doc) => doc.kind === kind),
    ),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function displayState(profile: FarmerProfile, language: LanguageCode): string | null {
  const lang = resolveLang(language);
  if (profile.stateId) {
    return labelOf(STATES.find((state) => state.id === profile.stateId), lang);
  }
  return profile.stateText;
}

export function displayDistrict(profile: FarmerProfile, language: LanguageCode): string | null {
  const lang = resolveLang(language);
  if (profile.districtId) {
    return labelOf(
      DISTRICTS.find((district) => district.id === profile.districtId),
      lang,
    );
  }
  return profile.districtText;
}

export function displayLand(profile: FarmerProfile, language: LanguageCode): string | null {
  if (profile.landValue === null || !profile.landUnit) return null;
  const copy = copyFor(language);
  const unit = landUnitLabel(profile.landValue, profile.landUnit, copy.landUnit[profile.landUnit], language);
  return `${trimNumber(profile.landValue)} ${unit}`;
}

function landUnitLabel(
  value: number,
  unit: LandUnit,
  label: string,
  language: LanguageCode,
): string {
  if (resolveLang(language) === "en" && unit === "acre") {
    return value === 1 ? "acre" : "acres";
  }
  return label;
}

export function displayCrop(profile: FarmerProfile, language: LanguageCode): string | null {
  const lang = resolveLang(language);
  if (profile.cropIds.length > 0) {
    return profile.cropIds
      .map((id) => labelOf(CROPS.find((crop) => crop.id === id), lang, id))
      .join(", ");
  }
  return profile.cropText;
}

export function displayAmount(profile: FarmerProfile, language: LanguageCode): string | null {
  if (profile.amountRupees === null) return null;
  const copy = copyFor(language);
  const lakhs = profile.amountRupees / 100000;
  if (lakhs >= 1 && profile.amountRupees % 1000 === 0) {
    const shown = Number.isInteger(lakhs) ? String(lakhs) : trimNumber(lakhs);
    return `₹${shown} ${copy.lakh}`;
  }
  return `₹${profile.amountRupees.toLocaleString("en-IN")}`;
}

export function displayFarmerType(profile: FarmerProfile, language: LanguageCode): string | null {
  if (!profile.farmerType) return null;
  return copyFor(language).farmerType[profile.farmerType];
}

export function displayIrrigation(profile: FarmerProfile, language: LanguageCode): string | null {
  if (!profile.irrigation) return null;
  return copyFor(language).irrigation[profile.irrigation];
}

export function displayPurpose(profile: FarmerProfile, language: LanguageCode): string | null {
  if (!profile.purpose) return null;
  return copyFor(language).purpose[profile.purpose];
}

export function displayExistingLoan(profile: FarmerProfile, language: LanguageCode): string | null {
  if (!profile.existingLoan) return null;
  const copy = copyFor(language);
  if (profile.existingLoan === "none") return copy.existingNone;
  if (profile.existingLoan === "yes") return copy.existingYes;
  return profile.existingLoan;
}

export function documentsReadyLabel(profile: FarmerProfile, language: LanguageCode): string {
  const count = new Set(profile.documents.map((doc) => doc.kind)).size;
  return fill(copyFor(language).docsReady, { n: count });
}

export function infoCompleteLabel(percent: number, language: LanguageCode): string {
  return fill(copyFor(language).infoComplete, { n: percent });
}

export function applicationTitle(app: LoanApplication, language: LanguageCode): string {
  return copyFor(language).loans[app.loanId === "sbi-kcc" ? "sbi" : app.loanId === "term" ? "term" : "kcc"].name;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}
