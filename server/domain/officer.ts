import type { Application } from "@prisma/client";
import { STATUS_LABELS, label, type ApplicationStatus, type FinancingRoute } from "@/lib/domain/constants";
import { fieldsFor } from "@/lib/domain/fields";
import { canPerform } from "@/lib/domain/stateMachine";
import { decisionSchema, internalNoteSchema, sendReviewSchema, versionSchema } from "@/lib/domain/schemas";
import type { Actor } from "@/server/auth/actor";
import { json, prisma, type Tx } from "@/server/db";
import { ApiError, badRequest, conflict, staleVersion } from "@/server/errors";
import { runAssessment as computeAssessment } from "@/server/ml/assess";
import { DEFAULT_RULES, type RuleConfig } from "@/server/ml/rules";
import { activeAuthorization, assertOfficerFor, loadForActor } from "./access";
import type { RevisionSnapshot } from "./details";
import { audit, notifyUsers } from "./events";
import { applyTransition } from "./transition";

async function applicantRecipients(tx: Tx | typeof prisma, app: Application): Promise<string[]> {
  const operatorActive = app.assistedByOperatorId && (await activeAuthorization(tx, app.assistedByOperatorId, app.farmerId));
  return [app.farmerId, ...(operatorActive ? [app.assistedByOperatorId!] : [])];
}

async function officerApp(tx: Tx | typeof prisma, actor: Actor, id: string) {
  const app = await loadForActor(tx, actor, id);
  assertOfficerFor(actor, app);
  return app;
}

export async function startReview(actor: Actor, id: string, input: unknown) {
  const { expectedVersion } = versionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const app = await officerApp(tx, actor, id);
    const updated = await applyTransition(tx, {
      app,
      action: "START_REVIEW",
      machineActor: "OFFICER",
      actor,
      expectedVersion,
      note: app.status === "RESUBMITTED" ? `Review of revision ${app.currentRevisionNo} started` : "Review started",
    });
    await notifyUsers(tx, await applicantRecipients(tx, app), {
      type: "UNDER_REVIEW",
      title: `${app.reference} is under review`,
      body: `An officer from ${actor.organizationName ?? "the reviewing organization"} has started reviewing your application.`,
      link: `/applications/${app.id}`,
      applicationId: app.id,
      eventKey: `review-started:${app.id}:${updated.version}`,
    });
    return updated;
  });
}

async function ensureVersions(tx: Tx, route: FinancingRoute, computed: ReturnType<typeof computeAssessment>, rules: RuleConfig) {
  const model = await tx.modelVersion.upsert({
    where: { version: computed.model.version },
    create: {
      route,
      version: computed.model.version,
      algorithm: computed.model.algorithm,
      artifactPath: computed.model.file.replace(process.cwd(), "."),
      metrics: JSON.stringify(computed.model.metrics),
      trainedAt: new Date(computed.model.trainedAt),
      isActive: true,
    },
    update: {},
  });
  await tx.modelVersion.updateMany({ where: { route, id: { not: model.id } }, data: { isActive: false } });
  const ruleConfig = await tx.eligibilityRuleConfig.upsert({
    where: { version: rules.version },
    create: { route, version: rules.version, rules: JSON.stringify(rules), isActive: true },
    update: {},
  });
  return { model, ruleConfig };
}

async function activeRules(route: FinancingRoute): Promise<RuleConfig> {
  const row = await prisma.eligibilityRuleConfig.findFirst({ where: { route, isActive: true }, orderBy: { createdAt: "desc" } });
  return row ? json<RuleConfig>(row.rules, DEFAULT_RULES[route]) : DEFAULT_RULES[route];
}

export async function runAssessment(actor: Actor, id: string, input: unknown) {
  const { expectedVersion } = versionSchema.parse(input);
  const pending = await prisma.$transaction(async (tx) => {
    const app = await officerApp(tx, actor, id);
    return applyTransition(tx, {
      app,
      action: "RUN_ASSESSMENT",
      machineActor: "OFFICER",
      actor,
      expectedVersion,
      note: `Eligibility assessment started for revision ${app.currentRevisionNo}`,
    });
  });

  const route = pending.route as FinancingRoute;
  try {
    const revision = await prisma.applicationRevision.findUniqueOrThrow({
      where: { applicationId_revisionNo: { applicationId: pending.id, revisionNo: pending.currentRevisionNo } },
    });
    const snapshot = json<RevisionSnapshot>(revision.snapshot, { details: {}, documents: [] });
    const rules = await activeRules(route);
    const computed = computeAssessment({
      route,
      details: snapshot.details,
      documentTypes: snapshot.documents.map((doc) => doc.docType),
      rules,
    });

    return await prisma.$transaction(async (tx) => {
      const { model, ruleConfig } = await ensureVersions(tx, route, computed, rules);
      const app = await tx.application.findUniqueOrThrow({ where: { id: pending.id } });
      await tx.assessmentResult.updateMany({
        where: { applicationId: app.id, isStale: false, revisionNo: { lt: app.currentRevisionNo } },
        data: { isStale: true },
      });
      const assessment = await tx.assessmentResult.create({
        data: {
          applicationId: app.id,
          revisionNo: app.currentRevisionNo,
          modelVersionId: model.id,
          ruleConfigId: ruleConfig.id,
          outcome: computed.outcome,
          score: computed.score,
          ruleResults: JSON.stringify(computed.ruleResults),
          explanation: JSON.stringify(computed.explanation),
          recommendation: computed.recommendation,
          suggestions: JSON.stringify(computed.suggestions),
          triggeredById: actor.id,
        },
      });
      const updated = await applyTransition(tx, {
        app,
        action: "COMPLETE_ASSESSMENT",
        machineActor: "SYSTEM",
        actor,
        expectedVersion: app.version,
        note: `Assessment result: ${label(computed.outcome)} (model ${computed.model.version})`,
      });
      await audit(tx, actor, "ASSESSMENT_COMPLETED", { type: "AssessmentResult", id: assessment.id, applicationId: app.id }, {
        outcome: computed.outcome,
        score: computed.score,
        modelVersion: computed.model.version,
        rulesVersion: rules.version,
      });
      await notifyUsers(tx, await applicantRecipients(tx, app), {
        type: "ASSESSMENT_COMPLETED",
        title: `Eligibility assessment ready for ${app.reference}`,
        body: `Result: ${label(computed.outcome)}. This is advisory; the officer will make the final decision.`,
        link: `/applications/${app.id}`,
        applicationId: app.id,
        eventKey: `assessment:${assessment.id}`,
      });
      return { application: updated, assessment };
    });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      const app = await tx.application.findUniqueOrThrow({ where: { id: pending.id } });
      if (app.status !== "ASSESSMENT_PENDING") return;
      await applyTransition(tx, {
        app,
        action: "FAIL_ASSESSMENT",
        machineActor: "SYSTEM",
        actor,
        expectedVersion: app.version,
        note: "Assessment could not be completed; no result was stored.",
      });
      await audit(tx, actor, "ASSESSMENT_FAILED", { type: "Application", id: app.id, applicationId: app.id }, {
        reason: error instanceof Error ? error.message.slice(0, 200) : "unknown",
      });
    });
    throw error;
  }
}

export async function sendReview(actor: Actor, id: string, input: unknown) {
  const data = sendReviewSchema.parse(input);
  if (data.deadline) {
    const deadline = new Date(`${data.deadline}T23:59:59`);
    if (Number.isNaN(deadline.getTime()) || deadline < new Date()) throw badRequest("The deadline must be a future date.");
  }
  return prisma.$transaction(async (tx) => {
    const app = await officerApp(tx, actor, id);
    const knownFields = new Set(fieldsFor(app.route as FinancingRoute).map((field) => field.key));
    const badField = data.items.find((item) => item.itemType === "FIELD" && !knownFields.has(item.fieldKey ?? ""));
    if (badField) throw badRequest(`"${badField.fieldKey}" is not a field on this application.`);
    const updated = await applyTransition(tx, {
      app,
      action: "REQUEST_CHANGES",
      machineActor: "OFFICER",
      actor,
      expectedVersion: data.expectedVersion,
      note: `${data.items.length} change(s) requested`,
    });
    const review = await tx.officerReview.create({
      data: {
        applicationId: app.id,
        revisionNo: app.currentRevisionNo,
        officerId: actor.id,
        kind: "CHANGES_REQUESTED",
        visibleToFarmer: true,
        summary: data.summary,
        nextSteps: data.nextSteps || null,
        deadline: data.deadline ? new Date(`${data.deadline}T23:59:59`) : null,
        items: {
          create: data.items.map((item) => ({
            itemType: item.itemType,
            fieldKey: item.itemType === "FIELD" ? item.fieldKey : null,
            documentType: item.itemType === "DOCUMENT" ? item.documentType : null,
            message: item.message,
          })),
        },
      },
    });
    await audit(tx, actor, "REVIEW_SENT", { type: "OfficerReview", id: review.id, applicationId: app.id }, {
      items: data.items.length,
      revisionNo: app.currentRevisionNo,
    });
    await notifyUsers(tx, await applicantRecipients(tx, app), {
      type: "CHANGES_REQUESTED",
      title: `Action required on ${app.reference}`,
      body: `The officer has asked for ${data.items.length} change(s). Please review and resubmit your application.`,
      link: `/applications/${app.id}`,
      applicationId: app.id,
      eventKey: `review:${review.id}`,
    });
    return { application: updated, review };
  });
}

export async function addInternalNote(actor: Actor, id: string, input: unknown) {
  const data = internalNoteSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const app = await officerApp(tx, actor, id);
    const note = await tx.officerReview.create({
      data: {
        applicationId: app.id,
        revisionNo: app.currentRevisionNo,
        officerId: actor.id,
        kind: "INTERNAL_NOTE",
        visibleToFarmer: false,
        summary: data.summary,
      },
    });
    await audit(tx, actor, "INTERNAL_NOTE_ADDED", { type: "OfficerReview", id: note.id, applicationId: app.id });
    return note;
  });
}

export async function recordDecision(actor: Actor, id: string, input: unknown) {
  const data = decisionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const app = await officerApp(tx, actor, id);
    const action = data.decision === "APPROVED" ? "APPROVE" : data.decision === "REJECTED" ? "REJECT" : "ESCALATE";
    if (app.version !== data.expectedVersion) throw staleVersion();
    if (!canPerform(app.status as ApplicationStatus, action, "OFFICER")) {
      throw conflict("INVALID_TRANSITION", `This decision is not available while the application is "${STATUS_LABELS[app.status as ApplicationStatus]}".`);
    }
    const latest = await tx.assessmentResult.findFirst({
      where: { applicationId: app.id, isStale: false },
      orderBy: { createdAt: "desc" },
    });

    let overridesAssessment = false;
    if (data.decision === "APPROVED") {
      if (!latest) {
        throw conflict(
          "ASSESSMENT_REQUIRED",
          "Run an eligibility assessment on the current revision before approving.",
        );
      }
      if (latest.outcome !== "ELIGIBLE") {
        overridesAssessment = true;
        if (data.reason.length < 15) {
          throw badRequest("The assessment did not find the applicant eligible. Explain why you are approving anyway.", {
            fieldErrors: { reason: ["Give a reason of at least 15 characters for approving against the assessment."] },
          });
        }
      }
    } else if (data.reason.length < 10) {
      throw badRequest("Give a clear reason the farmer can understand.", {
        fieldErrors: { reason: ["Write at least 10 characters."] },
      });
    }

    const final = data.decision !== "ESCALATED";
    const updated = await applyTransition(tx, {
      app,
      action,
      machineActor: "OFFICER",
      actor,
      expectedVersion: data.expectedVersion,
      note: data.decision === "APPROVED" ? "Approved in the demonstration workflow" : data.reason.slice(0, 200),
      data: final ? { decidedAt: new Date() } : undefined,
    });
    const decision = await tx.applicationDecision.create({
      data: {
        applicationId: app.id,
        decision: data.decision,
        finalKey: final ? app.id : null,
        reason: data.reason || "Meets the demonstration criteria after officer review.",
        conditions: data.conditions || null,
        overridesAssessment,
        officerId: actor.id,
        organizationId: actor.organizationId!,
        revisionNo: app.currentRevisionNo,
        assessmentId: latest?.id ?? null,
      },
    });
    await audit(tx, actor, `DECISION_${data.decision}`, { type: "ApplicationDecision", id: decision.id, applicationId: app.id }, {
      overridesAssessment,
      assessmentId: latest?.id ?? null,
    });
    const messages = {
      APPROVED: {
        title: `${app.reference} approved (demonstration)`,
        body: "Your application was approved in this demonstration workflow. This is not a real loan sanction.",
      },
      REJECTED: {
        title: `${app.reference} was not approved`,
        body: "See the reasons and suggested next steps, including the option to try the other financing route.",
      },
      ESCALATED: {
        title: `${app.reference} sent for additional review`,
        body: "Your application needs a closer look by a senior reviewer. No action is needed from you right now.",
      },
    }[data.decision];
    await notifyUsers(tx, await applicantRecipients(tx, app), {
      type: `APPLICATION_${data.decision}`,
      ...messages,
      link: `/applications/${app.id}`,
      applicationId: app.id,
      eventKey: `decision:${decision.id}`,
    });
    return { application: updated, decision };
  }).catch((error) => {
    if (error instanceof ApiError) throw error;
    if (error?.code === "P2002") {
      throw conflict("ALREADY_DECIDED", "A final decision has already been recorded for this application.");
    }
    throw error;
  });
}
