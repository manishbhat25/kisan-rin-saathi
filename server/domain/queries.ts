import type { Prisma } from "@prisma/client";
import { isOfficer, type ApplicationStatus, type FinancingRoute } from "@/lib/domain/constants";
import { documentRequirements } from "@/lib/domain/fields";
import { availableActions, type ActionName } from "@/lib/domain/stateMachine";
import type { Actor } from "@/server/auth/actor";
import { json, prisma } from "@/server/db";
import type { Explanation } from "@/server/ml/assess";
import type { RuleResult } from "@/server/ml/rules";
import { loadForActor } from "./access";
import { activeDocuments, readDetails, type Details, type RevisionSnapshot } from "./details";

export interface ListFilters {
  status?: string;
  q?: string;
  route?: string;
}

export async function listApplications(actor: Actor, filters: ListFilters = {}) {
  const where: Prisma.ApplicationWhereInput = {};
  if (actor.role === "FARMER") where.farmerId = actor.id;
  else if (actor.role === "OPERATOR") where.assistedByOperatorId = actor.id;
  else if (isOfficer(actor.role)) {
    where.route = actor.route!;
    where.status = { not: "DRAFT" };
  } else return [];

  if (filters.status && filters.status !== "ALL") {
    if (isOfficer(actor.role) && filters.status === "DRAFT") return [];
    where.status = filters.status;
  }
  if (filters.route && actor.role !== "GOV_OFFICER" && actor.role !== "BANK_OFFICER") where.route = filters.route;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { reference: { contains: q.toUpperCase() } },
      { governmentDetails: { fullName: { contains: q } } },
      { bankDetails: { fullName: { contains: q } } },
      { governmentDetails: { district: { contains: q } } },
      { bankDetails: { district: { contains: q } } },
    ];
  }

  const apps = await prisma.application.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
    include: {
      governmentDetails: { select: { fullName: true, district: true, stateCode: true, requestedAmount: true } },
      bankDetails: { select: { fullName: true, district: true, stateCode: true, requestedAmount: true } },
      assessments: { orderBy: { createdAt: "desc" }, take: 1, select: { outcome: true, isStale: true, score: true } },
      reviews: {
        where: { kind: "CHANGES_REQUESTED" },
        select: { items: { where: { resolvedAt: null }, select: { id: true } } },
      },
      decisions: { orderBy: { createdAt: "desc" }, take: 1, select: { decision: true } },
    },
  });

  return apps.map((app) => {
    const details = app.governmentDetails ?? app.bankDetails;
    const latest = app.assessments[0];
    return {
      id: app.id,
      reference: app.reference,
      route: app.route as FinancingRoute,
      status: app.status as ApplicationStatus,
      version: app.version,
      applicantName: details?.fullName ?? "—",
      district: details?.district ?? null,
      stateCode: details?.stateCode ?? null,
      requestedAmount: details?.requestedAmount ?? null,
      submissionMethod: app.submissionMethod,
      revisionNo: app.currentRevisionNo,
      latestOutcome: latest ? latest.outcome : null,
      latestOutcomeStale: latest?.isStale ?? false,
      openCorrections: app.reviews.reduce((sum, review) => sum + review.items.length, 0),
      lastDecision: app.decisions[0]?.decision ?? null,
      createdAt: app.createdAt.toISOString(),
      submittedAt: app.submittedAt?.toISOString() ?? null,
      updatedAt: app.updatedAt.toISOString(),
    };
  });
}

export type ApplicationListItem = Awaited<ReturnType<typeof listApplications>>[number];

export async function getApplicationView(actor: Actor, id: string) {
  const app = await loadForActor(prisma, actor, id);
  const officer = isOfficer(actor.role);
  const route = app.route as FinancingRoute;

  const [revisions, allDocs, assessments, reviews, decisions, history, farmer, parent, children, workingDetails] =
    await Promise.all([
      prisma.applicationRevision.findMany({ where: { applicationId: app.id }, orderBy: { revisionNo: "asc" } }),
      prisma.document.findMany({ where: { applicationId: app.id }, orderBy: { uploadedAt: "asc" } }),
      prisma.assessmentResult.findMany({
        where: { applicationId: app.id },
        orderBy: { createdAt: "desc" },
        include: { modelVersion: true, ruleConfig: { select: { version: true } } },
      }),
      prisma.officerReview.findMany({
        where: { applicationId: app.id, ...(officer ? {} : { visibleToFarmer: true }) },
        orderBy: { createdAt: "desc" },
        include: { items: true, officer: { select: { displayName: true } } },
      }),
      prisma.applicationDecision.findMany({
        where: { applicationId: app.id },
        orderBy: { createdAt: "desc" },
        include: { officer: { select: { displayName: true } }, organization: { select: { name: true } } },
      }),
      prisma.statusHistory.findMany({
        where: { applicationId: app.id },
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { displayName: true, role: true } } },
      }),
      prisma.user.findUnique({ where: { id: app.farmerId }, select: { displayName: true, email: true, phone: true } }),
      app.parentApplicationId
        ? prisma.application.findUnique({
            where: { id: app.parentApplicationId },
            select: { id: true, reference: true, route: true, status: true, farmerId: true },
          })
        : null,
      prisma.application.findMany({
        where: { parentApplicationId: app.id },
        select: { id: true, reference: true, route: true, status: true },
      }),
      readDetails(prisma, app),
    ]);

  const parsedRevisions = revisions.map((revision) => ({
    revisionNo: revision.revisionNo,
    createdAt: revision.createdAt.toISOString(),
    changedFields: json<string[]>(revision.changedFields, []),
    snapshot: json<RevisionSnapshot>(revision.snapshot, { details: {}, documents: [] }),
  }));
  const currentRevision = parsedRevisions.find((revision) => revision.revisionNo === app.currentRevisionNo);

  // Officers see exactly what was submitted; applicants see their working copy.
  const details: Details = officer && currentRevision ? currentRevision.snapshot.details : workingDetails;
  const activeDocs = await activeDocuments(prisma, app.id);
  const shownDocIds = officer && currentRevision ? new Set(currentRevision.snapshot.documents.map((doc) => doc.id)) : null;
  const documents = (shownDocIds ? allDocs.filter((doc) => shownDocIds.has(doc.id)) : activeDocs).map((doc) => ({
    id: doc.id,
    docType: doc.docType,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    uploadedAt: doc.uploadedAt.toISOString(),
    revisionNo: doc.revisionNo,
  }));

  const latestValid = assessments.find((assessment) => !assessment.isStale) ?? null;
  const openItems = reviews
    .filter((review) => review.kind === "CHANGES_REQUESTED")
    .flatMap((review) => review.items.filter((item) => !item.resolvedAt).map((item) => ({ ...item, reviewId: review.id })));

  const status = app.status as ApplicationStatus;
  let actions: ActionName[] = [];
  let approveBlockedReason: string | null = null;
  if (officer && actor.route === route) {
    actions = availableActions(status, "OFFICER");
    if (actions.includes("APPROVE") && !latestValid) {
      approveBlockedReason = "Run an eligibility assessment on the current revision before approving.";
    }
  } else if (
    (actor.role === "FARMER" && app.farmerId === actor.id) ||
    (actor.role === "OPERATOR" && app.assistedByOperatorId === actor.id)
  ) {
    actions = availableActions(status, "APPLICANT");
    if (actor.role === "OPERATOR") actions = actions.filter((action) => action !== "WITHDRAW");
  }

  const latestOutcome = assessments[0]?.outcome ?? null;
  const canStartAlternative =
    actor.role === "FARMER" &&
    (status === "REJECTED" || status === "WITHDRAWN" || latestOutcome === "NOT_ELIGIBLE") &&
    !children.some((child) => child.status !== "WITHDRAWN");

  return {
    id: app.id,
    reference: app.reference,
    route,
    status,
    version: app.version,
    currentRevisionNo: app.currentRevisionNo,
    submissionMethod: app.submissionMethod,
    assistedBy: app.assistedByOperatorId
      ? {
          label: "Service-centre operator",
          ref: officer ? `OP-${app.assistedByOperatorId.slice(-4).toUpperCase()}` : null,
          consentRecorded: Boolean(app.operatorAuthorizationId),
        }
      : null,
    createdAt: app.createdAt.toISOString(),
    submittedAt: app.submittedAt?.toISOString() ?? null,
    decidedAt: app.decidedAt?.toISOString() ?? null,
    applicant: {
      name: farmer?.displayName ?? "—",
      email: officer || actor.id === app.farmerId ? farmer?.email ?? null : null,
      phone: officer ? farmer?.phone ?? null : null,
    },
    parent: parent ? { id: parent.id, reference: parent.reference, route: parent.route, status: parent.status } : null,
    children,
    prefillConsentAt: app.prefillConsentAt?.toISOString() ?? null,
    details,
    documents,
    documentRequirements: documentRequirements(route, details),
    revisions: parsedRevisions,
    assessments: assessments.map((assessment) => ({
      id: assessment.id,
      revisionNo: assessment.revisionNo,
      outcome: assessment.outcome,
      score: assessment.score,
      isStale: assessment.isStale,
      recommendation: assessment.recommendation,
      suggestions: json<string[]>(assessment.suggestions, []),
      ruleResults: json<RuleResult[]>(assessment.ruleResults, []),
      explanation: json<Explanation | null>(assessment.explanation, null),
      modelVersion: assessment.modelVersion.version,
      modelAlgorithm: assessment.modelVersion.algorithm,
      ruleVersion: assessment.ruleConfig.version,
      createdAt: assessment.createdAt.toISOString(),
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      kind: review.kind,
      revisionNo: review.revisionNo,
      summary: review.summary,
      nextSteps: review.nextSteps,
      deadline: review.deadline?.toISOString() ?? null,
      officerName: officer ? review.officer.displayName : "Reviewing officer",
      createdAt: review.createdAt.toISOString(),
      items: review.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        fieldKey: item.fieldKey,
        documentType: item.documentType,
        message: item.message,
        farmerResponse: item.farmerResponse,
        resolvedInRevisionNo: item.resolvedInRevisionNo,
        resolvedAt: item.resolvedAt?.toISOString() ?? null,
      })),
    })),
    openItems: openItems.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      fieldKey: item.fieldKey,
      documentType: item.documentType,
      message: item.message,
      farmerResponse: item.farmerResponse,
    })),
    decisions: decisions.map((decision) => ({
      id: decision.id,
      decision: decision.decision,
      reason: decision.reason,
      conditions: decision.conditions,
      overridesAssessment: decision.overridesAssessment,
      officerName: officer ? decision.officer.displayName : null,
      organizationName: decision.organization.name,
      revisionNo: decision.revisionNo,
      createdAt: decision.createdAt.toISOString(),
    })),
    history: history.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      actorRole: entry.actorRole,
      actorName: officer || entry.actorId === actor.id ? entry.actor.displayName : null,
      note: entry.note,
      revisionNo: entry.revisionNo,
      createdAt: entry.createdAt.toISOString(),
    })),
    actions,
    approveBlockedReason,
    hasValidAssessment: Boolean(latestValid),
    canStartAlternative,
  };
}

export type ApplicationView = Awaited<ReturnType<typeof getApplicationView>>;

export async function listNotifications(actor: Actor, limit = 50) {
  const items = await prisma.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const unread = await prisma.notification.count({ where: { userId: actor.id, readAt: null } });
  return {
    unread,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      link: item.link,
      applicationId: item.applicationId,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function officerStats(actor: Actor) {
  const grouped = await prisma.application.groupBy({
    by: ["status"],
    where: { route: actor.route!, status: { not: "DRAFT" } },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((row) => [row.status, row._count._all])) as Record<string, number>;
}
