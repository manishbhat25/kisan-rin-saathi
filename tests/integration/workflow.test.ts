import { randomUUID } from "node:crypto";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { loadForActor } from "@/server/domain/access";
import { createAssistanceCode, linkFarmer, revokeAuthorizations } from "@/server/domain/accounts";
import {
  createApplication,
  resubmitApplication,
  startAlternative,
  submitApplication,
  updateDetails,
  uploadDocument,
  withdrawApplication,
} from "@/server/domain/applicant";
import { notifyUsers } from "@/server/domain/events";
import { recordDecision, runAssessment, sendReview, startReview } from "@/server/domain/officer";
import { getApplicationView, listApplications } from "@/server/domain/queries";
import { ApiError } from "@/server/errors";
import { GOOD_BANK, GOOD_GOV, pdf, submitted, world } from "../helpers";

type World = Awaited<ReturnType<typeof world>>;
let w: World;

beforeAll(async () => {
  w = await world();
});

async function code(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "OK";
  } catch (error) {
    if (error instanceof ApiError) return error.code;
    return error instanceof Error ? error.constructor.name : "UNKNOWN";
  }
}

describe("Journey 1 and 2: submission, assessment, approval", () => {
  it("government route works end to end and is visible to the farmer", async () => {
    let app = await submitted(w.farmer, "GOVERNMENT", GOOD_GOV, ["IDENTITY_PROOF", "LAND_RECORD", "BANK_PASSBOOK"]);
    expect(app.status).toBe("SUBMITTED");
    const details = await prisma.governmentApplicationDetails.findUnique({ where: { applicationId: app.id } });
    expect(details?.stateCode).toBe("GJ");

    app = await startReview(w.gov, app.id, { expectedVersion: app.version });
    const assessed = await runAssessment(w.gov, app.id, { expectedVersion: app.version });
    expect(assessed.application.status).toBe("ASSESSMENT_COMPLETED");
    expect(assessed.assessment.outcome).toBe("ELIGIBLE");

    const decided = await recordDecision(w.gov, app.id, {
      expectedVersion: assessed.application.version,
      decision: "APPROVED",
      reason: "",
    });
    expect(decided.application.status).toBe("APPROVED");

    const view = await getApplicationView(w.farmer, app.id);
    expect(view.status).toBe("APPROVED");
    expect(view.decisions[0].decision).toBe("APPROVED");
    expect(view.assessments[0].outcome).toBe("ELIGIBLE");
    expect(view.history.map((entry) => entry.toStatus)).toEqual([
      "DRAFT",
      "SUBMITTED",
      "UNDER_REVIEW",
      "ASSESSMENT_PENDING",
      "ASSESSMENT_COMPLETED",
      "APPROVED",
    ]);
    const notes = await prisma.notification.findMany({ where: { userId: w.farmer.id, applicationId: app.id } });
    expect(notes.map((note) => note.type)).toEqual(
      expect.arrayContaining(["APPLICATION_SUBMITTED", "UNDER_REVIEW", "ASSESSMENT_COMPLETED", "APPLICATION_APPROVED"]),
    );
  });

  it("bank route uses the bank model and only the bank officer can act", async () => {
    let app = await submitted(w.farmer, "BANK", GOOD_BANK, ["IDENTITY_PROOF", "INCOME_PROOF", "BANK_STATEMENT", "LAND_RECORD"]);
    expect(await code(startReview(w.gov, app.id, { expectedVersion: app.version }))).toBe("NOT_FOUND");
    app = await startReview(w.bank, app.id, { expectedVersion: app.version });
    const assessed = await runAssessment(w.bank, app.id, { expectedVersion: app.version });
    const model = await prisma.modelVersion.findUnique({ where: { id: assessed.assessment.modelVersionId } });
    expect(model?.route).toBe("BANK");
    const decided = await recordDecision(w.bank, app.id, {
      expectedVersion: assessed.application.version,
      decision: "APPROVED",
      reason: assessed.assessment.outcome === "ELIGIBLE" ? "" : "Checked documents and income in person.",
    });
    expect(decided.application.status).toBe("APPROVED");
  });
});

describe("Journey 3: correction and resubmission", () => {
  it("supports request, correction, revision comparison, stale assessment and reassessment", async () => {
    let app = await submitted(w.farmer, "GOVERNMENT", { ...GOOD_GOV, requestedAmount: 140000 }, ["IDENTITY_PROOF"]);
    app = await startReview(w.gov, app.id, { expectedVersion: app.version });
    const first = await runAssessment(w.gov, app.id, { expectedVersion: app.version });
    expect(first.assessment.outcome).not.toBe("ELIGIBLE");

    const review = await sendReview(w.gov, app.id, {
      expectedVersion: first.application.version,
      summary: "Please upload your land record and reduce the amount to the scheme limit.",
      nextSteps: "Resubmit within two weeks.",
      items: [
        { itemType: "DOCUMENT", documentType: "LAND_RECORD", message: "Upload the current land record." },
        { itemType: "FIELD", fieldKey: "requestedAmount", message: "The limit is ₹1,00,000." },
      ],
    });
    expect(review.application.status).toBe("CHANGES_REQUESTED");

    const farmerView = await getApplicationView(w.farmer, app.id);
    expect(farmerView.openItems).toHaveLength(2);
    expect(farmerView.actions).toContain("RESUBMIT");

    let version = review.application.version;
    expect(await code(resubmitApplication(w.farmer, app.id, { expectedVersion: version }))).toBe("CORRECTIONS_INCOMPLETE");

    const edited = await updateDetails(w.farmer, app.id, { expectedVersion: version, details: { requestedAmount: 80000 } });
    version = edited.version;
    await uploadDocument(w.farmer, app.id, "LAND_RECORD", pdf("land.pdf"));
    const resubmitted = await resubmitApplication(w.farmer, app.id, { expectedVersion: version });
    expect(resubmitted.status).toBe("RESUBMITTED");
    expect(resubmitted.currentRevisionNo).toBe(2);

    const officerView = await getApplicationView(w.gov, app.id);
    expect(officerView.revisions).toHaveLength(2);
    expect(officerView.revisions[1].changedFields).toEqual(expect.arrayContaining(["requestedAmount", "document:LAND_RECORD"]));
    expect(officerView.revisions[0].snapshot.details.requestedAmount).toBe(140000);
    expect(officerView.assessments.every((assessment) => assessment.isStale)).toBe(true);
    expect(officerView.reviews[0].items.every((item) => item.resolvedInRevisionNo === 2)).toBe(true);

    const underReview = await startReview(w.gov, app.id, { expectedVersion: resubmitted.version });
    const reassessed = await runAssessment(w.gov, app.id, { expectedVersion: underReview.version });
    expect(reassessed.assessment.revisionNo).toBe(2);
    const decided = await recordDecision(w.gov, app.id, {
      expectedVersion: reassessed.application.version,
      decision: "APPROVED",
      reason: "Corrections received and verified against documents.",
    });
    expect(decided.application.status).toBe("APPROVED");
  });

  it("blocks approval while the only assessment is stale", async () => {
    let app = await submitted(w.farmer, "GOVERNMENT", GOOD_GOV, ["IDENTITY_PROOF"]);
    app = await startReview(w.gov, app.id, { expectedVersion: app.version });
    const assessed = await runAssessment(w.gov, app.id, { expectedVersion: app.version });
    await prisma.assessmentResult.update({ where: { id: assessed.assessment.id }, data: { isStale: true } });
    expect(
      await code(recordDecision(w.gov, app.id, { expectedVersion: assessed.application.version, decision: "APPROVED", reason: "Looks good to me overall." })),
    ).toBe("ASSESSMENT_REQUIRED");
  });
});

describe("Journey 4: rejection and alternative route", () => {
  it("records reasons and starts a linked application with only consented fields copied", async () => {
    let app = await submitted(
      w.farmer,
      "GOVERNMENT",
      { ...GOOD_GOV, landholdingAcres: 20, annualAgriIncome: 900000 },
      ["IDENTITY_PROOF", "LAND_RECORD"],
    );
    app = await startReview(w.gov, app.id, { expectedVersion: app.version });
    const assessed = await runAssessment(w.gov, app.id, { expectedVersion: app.version });
    expect(assessed.assessment.outcome).toBe("NOT_ELIGIBLE");
    expect(await code(recordDecision(w.gov, app.id, { expectedVersion: assessed.application.version, decision: "REJECTED", reason: "no" }))).toBe(
      "VALIDATION_ERROR",
    );
    await recordDecision(w.gov, app.id, {
      expectedVersion: assessed.application.version,
      decision: "REJECTED",
      reason: "Land and income are above the scheme limits.",
    });
    const view = await getApplicationView(w.farmer, app.id);
    expect(view.canStartAlternative).toBe(true);
    expect(view.assessments[0].suggestions.length).toBeGreaterThan(0);

    const alt = await startAlternative(w.farmer, app.id, {
      clientRequestId: randomUUID(),
      prefillFields: ["fullName", "stateCode", "district"],
    });
    expect(alt.route).toBe("BANK");
    expect(alt.parentApplicationId).toBe(app.id);
    const altDetails = await prisma.bankApplicationDetails.findUnique({ where: { applicationId: alt.id } });
    expect(altDetails?.fullName).toBe("Test Farmer");
    expect(altDetails?.stateCode).toBe("GJ");
    expect(altDetails?.annualIncome).toBeNull();
    const list = await listApplications(w.farmer);
    expect(list.map((item) => item.id)).toEqual(expect.arrayContaining([app.id, alt.id]));

    expect(await code(startAlternative(w.farmer, app.id, { clientRequestId: randomUUID(), prefillFields: [] }))).toBe("DUPLICATE");
  });

  it("does not allow the other route while the application is still in progress", async () => {
    const app = await submitted(w.farmer, "GOVERNMENT", GOOD_GOV, ["IDENTITY_PROOF"]);
    expect(await code(startAlternative(w.farmer, app.id, { clientRequestId: randomUUID(), prefillFields: ["fullName"] }))).toBe(
      "INVALID_TRANSITION",
    );
    const direct = createApplication(w.farmer, { route: "BANK", clientRequestId: randomUUID(), parentApplicationId: app.id, prefillFields: ["fullName"] });
    expect(await code(direct)).toBe("INVALID_TRANSITION");
  });
});

describe("Journey 5: assisted submission", () => {
  it("requires farmer consent and keeps the application linked to the farmer", async () => {
    expect(
      await code(createApplication(w.operator, { route: "BANK", clientRequestId: randomUUID(), farmerId: w.farmer2.id })),
    ).toBe("FORBIDDEN");
    const { code: assistCode } = await createAssistanceCode(w.farmer2);
    expect(await code(linkFarmer(w.operator, { farmerEmail: w.farmer2.email, code: "000000", consentConfirmed: true }))).toBe(
      assistCode === "000000" ? "OK" : "VALIDATION_ERROR",
    );
    await linkFarmer(w.operator, { farmerEmail: w.farmer2.email, code: assistCode, consentConfirmed: true });
    expect(await code(linkFarmer(w.operator, { farmerEmail: w.farmer2.email, code: assistCode, consentConfirmed: true }))).toBe(
      "VALIDATION_ERROR",
    );

    const app = await createApplication(w.operator, { route: "BANK", clientRequestId: randomUUID(), farmerId: w.farmer2.id, details: GOOD_BANK });
    await uploadDocument(w.operator, app.id, "IDENTITY_PROOF", pdf());
    const sent = await submitApplication(w.operator, app.id, { expectedVersion: app.version });
    expect(sent.farmerId).toBe(w.farmer2.id);
    expect(sent.submissionMethod).toBe("ASSISTED");
    expect(sent.operatorAuthorizationId).toBeTruthy();

    const farmerView = await getApplicationView(w.farmer2, app.id);
    expect(farmerView.assistedBy?.label).toBe("Service-centre operator");
    const officerView = await getApplicationView(w.bank, app.id);
    expect(officerView.assistedBy?.ref).toMatch(/^OP-/);
    expect(JSON.stringify(officerView)).not.toContain(w.operator.email);
    expect(await code(withdrawApplication(w.operator, app.id, { expectedVersion: sent.version }))).toBe("FORBIDDEN");

    const farmerOwn = await submitted(w.farmer2, "GOVERNMENT", GOOD_GOV, ["IDENTITY_PROOF"]);
    const copy = createApplication(w.operator, {
      route: "BANK",
      clientRequestId: randomUUID(),
      farmerId: w.farmer2.id,
      parentApplicationId: farmerOwn.id,
      prefillFields: ["fullName"],
    });
    expect(await code(copy)).toBe("FORBIDDEN");

    await revokeAuthorizations(w.farmer2);
    expect(await code(getApplicationView(w.operator, app.id))).toBe("NOT_FOUND");
    expect(await listApplications(w.operator)).toHaveLength(0);
    const doc = await prisma.document.findFirstOrThrow({ where: { applicationId: app.id } });
    expect(await code(loadForActor(prisma, w.operator, doc.applicationId))).toBe("NOT_FOUND");
  });
});

describe("Journey 6: unauthorized access", () => {
  it("denies cross-route officers, other farmers and applicant-side officer actions", async () => {
    const govApp = await submitted(w.farmer, "GOVERNMENT", GOOD_GOV, ["IDENTITY_PROOF"]);
    const bankApp = await submitted(w.farmer, "BANK", GOOD_BANK, ["IDENTITY_PROOF"]);
    expect(await code(getApplicationView(w.bank, govApp.id))).toBe("NOT_FOUND");
    expect(await code(getApplicationView(w.gov, bankApp.id))).toBe("NOT_FOUND");
    expect(await code(getApplicationView(w.farmer2, govApp.id))).toBe("NOT_FOUND");
    expect(await code(recordDecision(w.bank, govApp.id, { expectedVersion: govApp.version, decision: "REJECTED", reason: "Not allowed here" }))).toBe(
      "NOT_FOUND",
    );
    expect(await code(startReview(w.farmer, govApp.id, { expectedVersion: govApp.version }))).toBe("FORBIDDEN");
    expect(await code(updateDetails(w.farmer2, govApp.id, { expectedVersion: govApp.version, details: { age: 30 } }))).toBe("NOT_FOUND");
    expect(await code(updateDetails(w.farmer, govApp.id, { expectedVersion: govApp.version, details: { age: 30 } }))).toBe("NOT_EDITABLE");

    const draft = await createApplication(w.farmer, { route: "GOVERNMENT", clientRequestId: randomUUID() });
    expect(await code(getApplicationView(w.gov, draft.id))).toBe("NOT_FOUND");
    await withdrawApplication(w.farmer, draft.id, { expectedVersion: draft.version });
    expect(await code(getApplicationView(w.gov, draft.id))).toBe("NOT_FOUND");
    expect((await listApplications(w.gov)).some((item) => item.id === draft.id)).toBe(false);

    expect(
      await code(
        sendReview(w.gov, govApp.id, {
          expectedVersion: (await startReview(w.gov, govApp.id, { expectedVersion: govApp.version })).version,
          summary: "Please check the details below.",
          items: [{ itemType: "FIELD", fieldKey: "creditHistory", message: "This is a bank-only field." }],
        }),
      ),
    ).toBe("VALIDATION_ERROR");
    const queue = await listApplications(w.gov);
    expect(queue.every((item) => item.route === "GOVERNMENT" && item.status !== "DRAFT")).toBe(true);
  });
});

describe("Journey 8: reliability", () => {
  it("is idempotent for repeated create requests", async () => {
    const id = randomUUID();
    const a = await createApplication(w.farmer, { route: "BANK", clientRequestId: id });
    const b = await createApplication(w.farmer, { route: "BANK", clientRequestId: id });
    expect(a.id).toBe(b.id);
  });

  it("rejects invalid transitions, invalid numbers and incomplete submissions", async () => {
    const app = await submitted(w.farmer, "GOVERNMENT", GOOD_GOV, ["IDENTITY_PROOF"]);
    const reviewing = await startReview(w.gov, app.id, { expectedVersion: app.version });
    expect(
      await code(recordDecision(w.gov, app.id, { expectedVersion: reviewing.version, decision: "APPROVED", reason: "Trying without assessment" })),
    ).toBe("INVALID_TRANSITION");
    const draft = await createApplication(w.farmer, { route: "BANK", clientRequestId: randomUUID() });
    expect(await code(updateDetails(w.farmer, draft.id, { expectedVersion: draft.version, details: { requestedAmount: -100 } }))).toBe(
      "VALIDATION_ERROR",
    );
    expect(await code(updateDetails(w.farmer, draft.id, { expectedVersion: draft.version, details: { stateCode: "Atlantis" } }))).toBe(
      "VALIDATION_ERROR",
    );
    expect(await code(submitApplication(w.farmer, draft.id, { expectedVersion: draft.version }))).toBe("INCOMPLETE_APPLICATION");
  });

  it("allows only one of two concurrent decisions and prevents duplicates", async () => {
    let app = await submitted(w.farmer, "GOVERNMENT", GOOD_GOV, ["IDENTITY_PROOF", "LAND_RECORD", "BANK_PASSBOOK"]);
    app = await startReview(w.gov, app.id, { expectedVersion: app.version });
    const assessed = await runAssessment(w.gov, app.id, { expectedVersion: app.version });
    const version = assessed.application.version;
    const results = await Promise.all([
      code(recordDecision(w.gov, app.id, { expectedVersion: version, decision: "APPROVED", reason: "" })),
      code(recordDecision(w.gov, app.id, { expectedVersion: version, decision: "REJECTED", reason: "Conflicting decision attempt" })),
    ]);
    expect(results.filter((result) => result === "OK")).toHaveLength(1);
    expect(await prisma.applicationDecision.count({ where: { applicationId: app.id } })).toBe(1);
    expect(await code(recordDecision(w.gov, app.id, { expectedVersion: version, decision: "APPROVED", reason: "" }))).toBe("STALE_VERSION");
  });

  it("deduplicates notifications for the same event", async () => {
    await prisma.$transaction(async (tx) => {
      const input = { type: "T", title: "t", body: "b", link: "/", eventKey: `dup-${randomUUID()}` };
      await notifyUsers(tx, [w.farmer.id], input);
      await notifyUsers(tx, [w.farmer.id, w.farmer.id], input);
    });
    const count = await prisma.notification.count({ where: { userId: w.farmer.id, type: "T" } });
    expect(count).toBe(1);
  });

  it("returns the application to review if the model artifact is broken", async () => {
    let app = await submitted(w.farmer, "BANK", GOOD_BANK, ["IDENTITY_PROOF"]);
    app = await startReview(w.bank, app.id, { expectedVersion: app.version });
    const original = process.env.MODEL_DIR;
    process.env.MODEL_DIR = path.join("tests", "missing-models");
    try {
      expect(await code(runAssessment(w.bank, app.id, { expectedVersion: app.version }))).toBe("ModelArtifactError");
    } finally {
      process.env.MODEL_DIR = original;
    }
    const after = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    expect(after.status).toBe("UNDER_REVIEW");
    expect(await prisma.assessmentResult.count({ where: { applicationId: app.id } })).toBe(0);
  });
});
