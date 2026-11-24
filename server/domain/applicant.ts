import { randomBytes } from "node:crypto";
import type { Application } from "@prisma/client";
import { z } from "zod";
import { DOCUMENT_TYPES, label, type DocumentType, type FinancingRoute } from "@/lib/domain/constants";
import { ASSESSMENT_FIELDS, documentRequirements, fieldLabel } from "@/lib/domain/fields";
import {
  createApplicationSchema,
  draftSchemaFor,
  submitSchemaFor,
  updateDetailsSchema,
  versionSchema,
} from "@/lib/domain/schemas";
import { normalizeState } from "@/lib/domain/states";
import type { Actor } from "@/server/auth/actor";
import { json, prisma, type Tx } from "@/server/db";
import { ApiError, badRequest, conflict, forbidden, notFound } from "@/server/errors";
import { detectFile, saveFile } from "@/server/storage";
import { activeAuthorization, assertApplicant, loadForActor } from "./access";
import {
  activeDocuments,
  buildSnapshot,
  diffSnapshots,
  readDetails,
  writeDetails,
  type RevisionSnapshot,
} from "./details";
import { audit, notifyUsers, officerIdsForRoute } from "./events";
import { applyTransition, bumpVersion } from "./transition";

const EDITABLE = ["DRAFT", "CHANGES_REQUESTED"];

/** Fields that may be copied into a new application, with the farmer's consent. */
export const SHARED_PREFILL_FIELDS = ["fullName", "age", "stateCode", "district", "village", "landholdingAcres"] as const;
export const OPTIONAL_PREFILL: Record<string, { from: string; to: string; label: string }[]> = {
  "GOVERNMENT->BANK": [{ from: "annualAgriIncome", to: "annualIncome", label: "Yearly farm income → household income" }],
  "BANK->GOVERNMENT": [],
};

function reference(route: FinancingRoute): string {
  const prefix = route === "GOVERNMENT" ? "GOV" : "BNK";
  return `${prefix}-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

function cleanDetails(route: FinancingRoute, raw: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    values[key] = typeof value === "string" && value.trim() === "" ? null : value;
  }
  if (typeof values.stateCode === "string") {
    const state = normalizeState(values.stateCode);
    if (!state) {
      throw badRequest("Some details need fixing.", {
        fieldErrors: { stateCode: ["We could not recognise this state. Choose one from the list."] },
      });
    }
    values.stateCode = state.code;
  }
  const parsed = draftSchemaFor(route).safeParse(values);
  if (!parsed.success) throw badRequest("Some details need fixing.", parsed.error.flatten());
  return parsed.data as Record<string, unknown>;
}

async function resolveFarmer(tx: Tx, actor: Actor, farmerId?: string) {
  if (actor.role === "FARMER") {
    if (farmerId && farmerId !== actor.id) throw forbidden();
    return { farmerId: actor.id, authorizationId: null as string | null };
  }
  if (actor.role === "OPERATOR") {
    if (!farmerId) throw badRequest("Choose the farmer you are helping.");
    const auth = await activeAuthorization(tx, actor.id, farmerId);
    if (!auth) throw forbidden("You need the farmer's current authorization code before starting an application.");
    return { farmerId, authorizationId: auth.id };
  }
  throw forbidden("Only farmers or authorized service-centre operators can create applications.");
}

export async function createApplication(actor: Actor, input: unknown): Promise<Application> {
  const data = createApplicationSchema.parse(input);
  const existing = await prisma.application.findUnique({ where: { clientRequestId: data.clientRequestId } });
  if (existing) {
    const own = existing.farmerId === actor.id || existing.assistedByOperatorId === actor.id;
    if (!own) throw conflict("DUPLICATE", "This request was already used.");
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    const { farmerId, authorizationId } = await resolveFarmer(tx, actor, data.farmerId);
    const profile = await tx.farmerProfile.findUnique({ where: { userId: farmerId } });
    const prefill: Record<string, unknown> = {};
    if (profile) {
      for (const key of ["fullName", "age", "stateCode", "district", "village", "landholdingAcres"] as const) {
        if (profile[key] !== null && profile[key] !== undefined) prefill[key] = profile[key];
      }
      if (data.route === "GOVERNMENT" && profile.farmerCategory) prefill.farmerCategory = profile.farmerCategory;
    }

    let parent: Application | null = null;
    if (data.parentApplicationId) {
      parent = await tx.application.findUnique({ where: { id: data.parentApplicationId } });
      if (!parent || parent.farmerId !== farmerId) throw notFound("The earlier application was not found.");
      if (parent.route === data.route) throw badRequest("Choose the other financing route.");
      const parentDetails = await readDetails(tx, parent);
      const allowed = new Set(data.prefillFields ?? []);
      for (const key of SHARED_PREFILL_FIELDS) {
        if (allowed.has(key) && parentDetails[key] !== null) prefill[key] = parentDetails[key];
      }
      for (const mapping of OPTIONAL_PREFILL[`${parent.route}->${data.route}`] ?? []) {
        if (allowed.has(mapping.from) && parentDetails[mapping.from] !== null) prefill[mapping.to] = parentDetails[mapping.from];
      }
    }

    const details = cleanDetails(data.route, { ...prefill, ...(data.details ?? {}) });
    const app = await tx.application.create({
      data: {
        reference: reference(data.route),
        clientRequestId: data.clientRequestId,
        farmerId,
        route: data.route,
        status: "DRAFT",
        submissionMethod: actor.role === "OPERATOR" ? "ASSISTED" : "SELF",
        assistedByOperatorId: actor.role === "OPERATOR" ? actor.id : null,
        operatorAuthorizationId: authorizationId,
        parentApplicationId: parent?.id ?? null,
        prefillConsentAt: parent && (data.prefillFields?.length ?? 0) > 0 ? new Date() : null,
      },
    });
    await writeDetails(tx, app, details);
    await tx.statusHistory.create({
      data: {
        applicationId: app.id,
        fromStatus: null,
        toStatus: "DRAFT",
        actorId: actor.id,
        actorRole: actor.role,
        note: parent ? `Started as an alternative to ${parent.reference}` : "Draft created",
        revisionNo: 0,
      },
    });
    await audit(tx, actor, "APPLICATION_CREATED", { type: "Application", id: app.id, applicationId: app.id }, {
      route: app.route,
      assisted: actor.role === "OPERATOR",
      parentApplicationId: parent?.id ?? null,
      prefilledFields: Object.keys(prefill),
    });
    return app;
  });
}

export async function updateDetails(actor: Actor, id: string, input: unknown) {
  const data = updateDetailsSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const app = await loadForActor(tx, actor, id);
    await assertApplicant(tx, actor, app);
    if (!EDITABLE.includes(app.status)) {
      throw conflict("NOT_EDITABLE", "This application can only be edited while it is a draft or when changes are requested.");
    }
    const details = cleanDetails(app.route as FinancingRoute, data.details);
    await writeDetails(tx, app, details);
    if (data.responses && app.status === "CHANGES_REQUESTED") {
      const openItems = await tx.reviewRequestItem.findMany({
        where: { resolvedAt: null, review: { applicationId: app.id, kind: "CHANGES_REQUESTED" } },
      });
      for (const item of openItems) {
        const response = data.responses[item.id];
        if (response !== undefined) {
          await tx.reviewRequestItem.update({ where: { id: item.id }, data: { farmerResponse: response.trim() || null } });
        }
      }
    }
    const updated = await bumpVersion(tx, app, data.expectedVersion);
    await audit(tx, actor, "DETAILS_UPDATED", { type: "Application", id: app.id, applicationId: app.id }, {
      fields: Object.keys(details),
    });
    return updated;
  });
}

export async function uploadDocument(actor: Actor, id: string, docType: string, file: File) {
  if (!DOCUMENT_TYPES.includes(docType as DocumentType)) throw badRequest("Choose a valid document type.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFile(buffer);
  const app = await loadForActor(prisma, actor, id);
  await assertApplicant(prisma, actor, app);
  if (!EDITABLE.includes(app.status)) {
    throw conflict("NOT_EDITABLE", "Documents can only be changed while the application is a draft or when changes are requested.");
  }
  const stored = await saveFile(buffer, detected.ext);
  const safeName = file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120) || `document${detected.ext}`;
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.document.updateMany({
      where: { applicationId: app.id, docType, supersededAt: null },
      data: { supersededAt: now },
    });
    const doc = await tx.document.create({
      data: {
        applicationId: app.id,
        docType,
        originalName: safeName,
        storedName: stored.storedName,
        mimeType: detected.mime,
        sizeBytes: buffer.length,
        sha256: stored.sha256,
        uploadedById: actor.id,
        revisionNo: app.currentRevisionNo + 1,
      },
    });
    await audit(tx, actor, "DOCUMENT_UPLOADED", { type: "Document", id: doc.id, applicationId: app.id }, {
      docType,
      sizeBytes: buffer.length,
    });
    return doc;
  });
}

function validateForSubmission(route: FinancingRoute, details: Record<string, unknown>, docTypes: string[]) {
  const parsed = submitSchemaFor(route).safeParse(details);
  const fieldErrors: Record<string, string[]> = parsed.success
    ? {}
    : (parsed.error.flatten().fieldErrors as Record<string, string[]>);
  const missingDocs = documentRequirements(route, details)
    .filter((req) => req.requiredToSubmit && !docTypes.includes(req.type))
    .map((req) => req.type);
  if (!parsed.success || missingDocs.length > 0) {
    throw new ApiError(400, "INCOMPLETE_APPLICATION", "Please complete the highlighted items before submitting.", {
      fieldErrors,
      missingDocuments: missingDocs,
      fieldLabels: Object.fromEntries(Object.keys(fieldErrors).map((key) => [key, fieldLabel(route, key)])),
    });
  }
}

export async function submitApplication(actor: Actor, id: string, input: unknown) {
  const { expectedVersion } = versionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const app = await loadForActor(tx, actor, id);
    await assertApplicant(tx, actor, app);
    const details = await readDetails(tx, app);
    const docs = await activeDocuments(tx, app.id);
    validateForSubmission(app.route as FinancingRoute, details, docs.map((doc) => doc.docType));
    const snapshot = await buildSnapshot(tx, app);
    const updated = await applyTransition(tx, {
      app,
      action: "SUBMIT",
      machineActor: "APPLICANT",
      actor,
      expectedVersion,
      note: actor.role === "OPERATOR" ? "Submitted by service-centre operator with farmer consent" : "Submitted by farmer",
      data: { currentRevisionNo: 1, submittedAt: new Date() },
    });
    await tx.applicationRevision.create({
      data: {
        applicationId: app.id,
        revisionNo: 1,
        snapshot: JSON.stringify(snapshot),
        changedFields: "[]",
        createdById: actor.id,
      },
    });
    const link = `/applications/${app.id}`;
    await notifyUsers(tx, await officerIdsForRoute(tx, app.route as FinancingRoute), {
      type: "NEW_APPLICATION",
      title: `New application ${app.reference}`,
      body: `A new ${label(app.route).toLowerCase()} application is waiting for review.`,
      link,
      applicationId: app.id,
      eventKey: `submitted:${app.id}`,
    });
    await notifyUsers(tx, [app.farmerId], {
      type: "APPLICATION_SUBMITTED",
      title: `Application ${app.reference} submitted`,
      body: "Your application has been received. We will notify you when an officer reviews it.",
      link: `/applications/${app.id}`,
      applicationId: app.id,
      eventKey: `submitted:${app.id}`,
    });
    return updated;
  });
}

export async function resubmitApplication(actor: Actor, id: string, input: unknown) {
  const { expectedVersion } = versionSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const app = await loadForActor(tx, actor, id);
    await assertApplicant(tx, actor, app);
    if (app.status !== "CHANGES_REQUESTED") {
      throw conflict("INVALID_TRANSITION", "Only applications returned for correction can be resubmitted.");
    }
    const route = app.route as FinancingRoute;
    const details = await readDetails(tx, app);
    const docs = await activeDocuments(tx, app.id);
    validateForSubmission(route, details, docs.map((doc) => doc.docType));

    const previous = await tx.applicationRevision.findUniqueOrThrow({
      where: { applicationId_revisionNo: { applicationId: app.id, revisionNo: app.currentRevisionNo } },
    });
    const previousSnapshot = json<RevisionSnapshot>(previous.snapshot, { details: {}, documents: [] });
    const snapshot = await buildSnapshot(tx, app);
    const changed = diffSnapshots(previousSnapshot, snapshot);

    const openItems = await tx.reviewRequestItem.findMany({
      where: { resolvedAt: null, review: { applicationId: app.id, kind: "CHANGES_REQUESTED" } },
    });
    const unresolved = openItems.filter((item) => {
      if (item.itemType === "DOCUMENT") return !changed.includes(`document:${item.documentType}`);
      if (item.itemType === "FIELD") return !changed.includes(item.fieldKey ?? "") && !item.farmerResponse;
      return !item.farmerResponse && changed.length === 0;
    });
    if (unresolved.length > 0) {
      throw new ApiError(400, "CORRECTIONS_INCOMPLETE", "Some requested changes have not been addressed yet.", {
        unresolvedItems: unresolved.map((item) => ({ id: item.id, itemType: item.itemType, fieldKey: item.fieldKey, documentType: item.documentType, message: item.message })),
      });
    }

    const revisionNo = app.currentRevisionNo + 1;
    const updated = await applyTransition(tx, {
      app,
      action: "RESUBMIT",
      machineActor: "APPLICANT",
      actor,
      expectedVersion,
      note: `Revision ${revisionNo} submitted with ${changed.length} change(s)`,
      data: { currentRevisionNo: revisionNo },
    });
    await tx.applicationRevision.create({
      data: {
        applicationId: app.id,
        revisionNo,
        snapshot: JSON.stringify(snapshot),
        changedFields: JSON.stringify(changed),
        createdById: actor.id,
      },
    });
    const now = new Date();
    await tx.reviewRequestItem.updateMany({
      where: { id: { in: openItems.map((item) => item.id) } },
      data: { resolvedAt: now, resolvedInRevisionNo: revisionNo },
    });
    const relevant = changed.some((key) => key.startsWith("document:") || ASSESSMENT_FIELDS[route].includes(key));
    if (relevant) {
      await tx.assessmentResult.updateMany({ where: { applicationId: app.id, isStale: false }, data: { isStale: true } });
    }
    await audit(tx, actor, "APPLICATION_RESUBMITTED", { type: "Application", id: app.id, applicationId: app.id }, {
      revisionNo,
      changed,
      assessmentsMarkedStale: relevant,
    });
    await notifyUsers(tx, await officerIdsForRoute(tx, route), {
      type: "APPLICATION_RESUBMITTED",
      title: `${app.reference} resubmitted`,
      body: `The applicant sent revision ${revisionNo} with ${changed.length} change(s).${relevant ? " A fresh assessment is required." : ""}`,
      link: `/applications/${app.id}`,
      applicationId: app.id,
      eventKey: `resubmitted:${app.id}:${revisionNo}`,
    });
    return updated;
  });
}

export async function withdrawApplication(actor: Actor, id: string, input: unknown) {
  const { expectedVersion } = versionSchema.parse(input);
  if (actor.role !== "FARMER") throw forbidden("Only the farmer can withdraw an application.");
  return prisma.$transaction(async (tx) => {
    const app = await loadForActor(tx, actor, id);
    const updated = await applyTransition(tx, {
      app,
      action: "WITHDRAW",
      machineActor: "APPLICANT",
      actor,
      expectedVersion,
      note: "Withdrawn by farmer",
    });
    if (app.status !== "DRAFT") {
      await notifyUsers(tx, await officerIdsForRoute(tx, app.route as FinancingRoute), {
        type: "APPLICATION_WITHDRAWN",
        title: `${app.reference} withdrawn`,
        body: "The applicant withdrew this application.",
        link: `/applications/${app.id}`,
        applicationId: app.id,
        eventKey: `withdrawn:${app.id}`,
      });
    }
    return updated;
  });
}

export const alternativeSchema = z.object({
  clientRequestId: z.string().uuid(),
  prefillFields: z.array(z.string()).max(30),
});

export async function startAlternative(actor: Actor, id: string, input: unknown) {
  const data = alternativeSchema.parse(input);
  if (actor.role !== "FARMER") throw forbidden("Only the farmer can start an application on the other route.");
  const parent = await loadForActor(prisma, actor, id);
  const otherRoute: FinancingRoute = parent.route === "GOVERNMENT" ? "BANK" : "GOVERNMENT";
  return createApplication(actor, {
    route: otherRoute,
    clientRequestId: data.clientRequestId,
    parentApplicationId: parent.id,
    prefillFields: data.prefillFields,
  });
}
