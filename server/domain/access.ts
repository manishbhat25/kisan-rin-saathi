import type { Application, Prisma } from "@prisma/client";
import type { Actor } from "@/server/auth/actor";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";
import { forbidden, notFound } from "@/server/errors";
import { audit } from "./events";

export async function activeAuthorization(tx: Tx | typeof prisma, operatorId: string, farmerId: string) {
  return tx.operatorAuthorization.findFirst({
    where: { operatorId, farmerId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { grantedAt: "desc" },
  });
}

/** Officers only see applications that were submitted at least once (a withdrawn draft stays private). */
export const OFFICER_VISIBLE = { submittedAt: { not: null } } satisfies Prisma.ApplicationWhereInput;

/** Operators only see applications they assisted, and only while the farmer's authorization is current. */
export function operatorScope(operatorId: string): Prisma.ApplicationWhereInput {
  return {
    assistedByOperatorId: operatorId,
    farmer: { farmerAuthorizations: { some: { operatorId, revokedAt: null, expiresAt: { gt: new Date() } } } },
  };
}

export async function canView(tx: Tx | typeof prisma, actor: Actor, app: Application): Promise<boolean> {
  switch (actor.role) {
    case "FARMER":
      return app.farmerId === actor.id;
    case "GOV_OFFICER":
    case "BANK_OFFICER":
      return actor.route === app.route && app.submittedAt !== null;
    case "OPERATOR":
      return app.assistedByOperatorId === actor.id && Boolean(await activeAuthorization(tx, actor.id, app.farmerId));
    default:
      return false;
  }
}

/** Loads an application the actor may see. Unknown and unauthorized IDs look the same to the caller. */
export async function loadForActor(tx: Tx | typeof prisma, actor: Actor, id: string): Promise<Application> {
  const app = await tx.application.findUnique({ where: { id } });
  if (!app) throw notFound("Application not found, or you do not have access to it.");
  if (!(await canView(tx, actor, app))) {
    // Recorded outside any open transaction (which is about to roll back) and without blocking the response.
    void audit(prisma, actor, "ACCESS_DENIED", { type: "Application", id, applicationId: null }, { route: app.route }).catch(
      () => undefined,
    );
    throw notFound("Application not found, or you do not have access to it.");
  }
  return app;
}

/** The farmer, or an operator holding a current authorization from that farmer, may change application content. */
export async function assertApplicant(tx: Tx | typeof prisma, actor: Actor, app: Application): Promise<void> {
  if (actor.role === "FARMER" && app.farmerId === actor.id) return;
  if (actor.role === "OPERATOR" && app.assistedByOperatorId === actor.id) {
    const auth = await activeAuthorization(tx, actor.id, app.farmerId);
    if (auth) return;
    throw forbidden("The farmer's authorization for your assistance has expired. Ask the farmer for a new code.");
  }
  throw forbidden("Only the applicant can change this application.");
}

export function assertOfficerFor(actor: Actor, app: Application): void {
  if (!(actor.role === "GOV_OFFICER" || actor.role === "BANK_OFFICER") || actor.route !== app.route) {
    throw forbidden("Only an officer of the reviewing organization can do this.");
  }
}
