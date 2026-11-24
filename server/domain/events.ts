import type { Actor } from "@/server/auth/actor";
import { OFFICER_ROLE_FOR_ROUTE, type FinancingRoute } from "@/lib/domain/constants";
import type { Tx } from "@/server/db";

export async function audit(
  tx: Tx,
  actor: Pick<Actor, "id" | "role"> | null,
  action: string,
  entity: { type: string; id: string; applicationId?: string | null },
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? "SYSTEM",
      action,
      entityType: entity.type,
      entityId: entity.id,
      applicationId: entity.applicationId ?? null,
      metadata: JSON.stringify(metadata),
    },
  });
}

export interface NotificationInput {
  type: string;
  title: string;
  body: string;
  link: string;
  applicationId?: string;
  /** Unique per logical event; the same event never notifies a user twice. */
  eventKey: string;
}

export async function notifyUsers(tx: Tx, userIds: string[], input: NotificationInput): Promise<void> {
  for (const userId of [...new Set(userIds)]) {
    const dedupeKey = `${input.eventKey}:${userId}`;
    const existing = await tx.notification.findUnique({ where: { dedupeKey } });
    if (existing) continue;
    await tx.notification.create({
      data: {
        userId,
        applicationId: input.applicationId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link,
        dedupeKey,
      },
    });
  }
}

export async function officerIdsForRoute(tx: Tx, route: FinancingRoute): Promise<string[]> {
  const assignments = await tx.officerAssignment.findMany({
    where: {
      isActive: true,
      organization: { route },
      user: { isActive: true, role: OFFICER_ROLE_FOR_ROUTE[route] },
    },
    select: { userId: true },
  });
  return assignments.map((item) => item.userId);
}
