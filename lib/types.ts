export type LanguageCode =
  | "hi"
  | "en"
  | "mr"
  | "gu"
  | "pa"
  | "bn"
  | "ta"
  | "te"
  | "kn"
  | "ml"
  | "auto";

export type UiLanguage = Exclude<LanguageCode, "auto">;

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export type FarmerType =
  | "owner"
  | "tenant"
  | "sharecropper"
  | "oral_lessee"
  | "cultivator"
  | "other";

export type LandUnit = "acre" | "bigha" | "hectare";

export type Irrigation = "canal" | "tubewell" | "rain" | "well" | "mixed" | "none";

export type LoanPurpose = "crop_input" | "equipment" | "land_improvement" | "other";

export type DocumentKind = "aadhaar" | "land_record" | "passbook" | "crop" | "other";

export type EligibilityStatus =
  | "potentially_eligible"
  | "likely_match"
  | "potential_match"
  | "further_verification"
  | "more_info";

export type ConversationStep =
  | "name"
  | "state"
  | "district"
  | "village"
  | "landOwnership"
  | "selfCultivate"
  | "land"
  | "crop"
  | "irrigation"
  | "existingLoan"
  | "purpose"
  | "amount"
  | "done";

export type OwnershipHint =
  | "self"
  | "father"
  | "family"
  | "tenant"
  | "sharecropper"
  | "oral"
  | "other";

export interface DocumentRecord {
  kind: DocumentKind;
  fileName: string;
  uploadedAt: string;
}

export interface FarmerProfile {
  name: string | null;
  stateId: string | null;
  stateText: string | null;
  districtId: string | null;
  districtText: string | null;
  village: string | null;
  farmerType: FarmerType | null;
  landValue: number | null;
  landUnit: LandUnit | null;
  cropIds: string[];
  cropText: string | null;
  irrigation: Irrigation | null;
  amountRupees: number | null;
  purpose: LoanPurpose | null;
  existingLoan: string | null;
  documents: DocumentRecord[];
}

export interface LoanOption {
  id: "kcc" | "sbi-kcc" | "term";
  status: EligibilityStatus;
  missing: Array<
    | "name"
    | "village"
    | "irrigation"
    | "aadhaar"
    | "land_record"
    | "passbook"
    | "crop"
    | "termPurpose"
  >;
}

export interface ChatMessage {
  id: string;
  role: "ai" | "farmer";
  text: string;
  createdAt: string;
  loans?: LoanOption[];
}

export interface LoanApplication {
  id: string;
  loanId: LoanOption["id"];
  createdAt: string;
}

export interface SessionState {
  language: LanguageCode;
  profile: FarmerProfile;
  messages: ChatMessage[];
  step: ConversationStep;
  pendingOwnership: OwnershipHint | null;
  clarifyCount: number;
  applications: LoanApplication[];
  savedAt: string | null;
}

export interface TurnInput {
  utterance: string;
  step: ConversationStep;
  profile: FarmerProfile;
  language: LanguageCode;
  pendingOwnership: OwnershipHint | null;
  clarifyCount: number;
}

export interface TurnResult {
  reply: string;
  step: ConversationStep;
  profile: FarmerProfile;
  pendingOwnership: OwnershipHint | null;
  clarifyCount: number;
  loans: LoanOption[] | null;
}
