import type { ApplicationStatus, Role } from "./constants";

export type Actor = "APPLICANT" | "OFFICER" | "SYSTEM";

export type ActionName =
  | "SUBMIT"
  | "START_REVIEW"
  | "RUN_ASSESSMENT"
  | "COMPLETE_ASSESSMENT"
  | "FAIL_ASSESSMENT"
  | "REQUEST_CHANGES"
  | "RESUBMIT"
  | "ESCALATE"
  | "APPROVE"
  | "REJECT"
  | "WITHDRAW";

export interface Transition {
  from: ApplicationStatus;
  to: ApplicationStatus;
  action: ActionName;
  actor: Actor;
}

const OFFICER_OPEN: ApplicationStatus[] = ["UNDER_REVIEW", "ASSESSMENT_COMPLETED", "HUMAN_REVIEW_REQUIRED"];
const WITHDRAWABLE: ApplicationStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "ASSESSMENT_COMPLETED",
  "CHANGES_REQUESTED",
  "RESUBMITTED",
  "HUMAN_REVIEW_REQUIRED",
];

/** The complete table of allowed status changes. Anything not listed is rejected by the backend. */
export const TRANSITIONS: Transition[] = [
  { from: "DRAFT", to: "SUBMITTED", action: "SUBMIT", actor: "APPLICANT" },
  { from: "SUBMITTED", to: "UNDER_REVIEW", action: "START_REVIEW", actor: "OFFICER" },
  { from: "RESUBMITTED", to: "UNDER_REVIEW", action: "START_REVIEW", actor: "OFFICER" },
  ...OFFICER_OPEN.map((from) => ({ from, to: "ASSESSMENT_PENDING" as const, action: "RUN_ASSESSMENT" as const, actor: "OFFICER" as const })),
  { from: "ASSESSMENT_PENDING", to: "ASSESSMENT_COMPLETED", action: "COMPLETE_ASSESSMENT", actor: "SYSTEM" },
  { from: "ASSESSMENT_PENDING", to: "UNDER_REVIEW", action: "FAIL_ASSESSMENT", actor: "SYSTEM" },
  ...OFFICER_OPEN.map((from) => ({ from, to: "CHANGES_REQUESTED" as const, action: "REQUEST_CHANGES" as const, actor: "OFFICER" as const })),
  { from: "CHANGES_REQUESTED", to: "RESUBMITTED", action: "RESUBMIT", actor: "APPLICANT" },
  { from: "UNDER_REVIEW", to: "HUMAN_REVIEW_REQUIRED", action: "ESCALATE", actor: "OFFICER" },
  { from: "ASSESSMENT_COMPLETED", to: "HUMAN_REVIEW_REQUIRED", action: "ESCALATE", actor: "OFFICER" },
  { from: "ASSESSMENT_COMPLETED", to: "APPROVED", action: "APPROVE", actor: "OFFICER" },
  { from: "HUMAN_REVIEW_REQUIRED", to: "APPROVED", action: "APPROVE", actor: "OFFICER" },
  { from: "UNDER_REVIEW", to: "REJECTED", action: "REJECT", actor: "OFFICER" },
  { from: "ASSESSMENT_COMPLETED", to: "REJECTED", action: "REJECT", actor: "OFFICER" },
  { from: "HUMAN_REVIEW_REQUIRED", to: "REJECTED", action: "REJECT", actor: "OFFICER" },
  ...WITHDRAWABLE.map((from) => ({ from, to: "WITHDRAWN" as const, action: "WITHDRAW" as const, actor: "APPLICANT" as const })),
];

export function actorForRole(role: Role): Actor {
  return role === "GOV_OFFICER" || role === "BANK_OFFICER" ? "OFFICER" : "APPLICANT";
}

export function findTransition(
  from: ApplicationStatus,
  action: ActionName,
): Transition | undefined {
  return TRANSITIONS.find((transition) => transition.from === from && transition.action === action);
}

export function canPerform(from: ApplicationStatus, action: ActionName, actor: Actor): boolean {
  const transition = findTransition(from, action);
  return Boolean(transition && transition.actor === actor);
}

export function availableActions(from: ApplicationStatus, actor: Actor): ActionName[] {
  return TRANSITIONS.filter((transition) => transition.from === from && transition.actor === actor).map(
    (transition) => transition.action,
  );
}
