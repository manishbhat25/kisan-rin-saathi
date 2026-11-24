import type { Application, Prisma } from "@prisma/client";
import type { ApplicationStatus } from "@/lib/domain/constants";
import { STATUS_LABELS } from "@/lib/domain/constants";
import { findTransition, type ActionName, type Actor as MachineActor } from "@/lib/domain/stateMachine";
import type { Actor } from "@/server/auth/actor";
import type { Tx } from "@/server/db";
import { conflict, staleVersion } from "@/server/errors";
import { audit } from "./events";

/**
 * Applies one state-machine transition with an optimistic version check and records
 * status history and an audit entry in the same transaction.
 */
export async function applyTransition(
  tx: Tx,
  params: {
    app: Application;
    action: ActionName;
    machineActor: MachineActor;
    actor: Actor;
    expectedVersion: number;
    note?: string;
    data?: Prisma.ApplicationUpdateManyMutationInput;
  },
): Promise<Application> {
  const { app, action, machineActor, actor, expectedVersion, note, data } = params;
  if (app.version !== expectedVersion) throw staleVersion();
  const transition = findTransition(app.status as ApplicationStatus, action);
  if (!transition || transition.actor !== machineActor) {
    throw conflict(
      "INVALID_TRANSITION",
      `This action is not available while the application is "${STATUS_LABELS[app.status as ApplicationStatus] ?? app.status}".`,
      { status: app.status, action },
    );
  }
  const result = await tx.application.updateMany({
    where: { id: app.id, version: expectedVersion, status: app.status },
    data: { ...data, status: transition.to, version: { increment: 1 } },
  });
  if (result.count === 0) throw staleVersion();
  const updated = await tx.application.findUniqueOrThrow({ where: { id: app.id } });
  await tx.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatus: app.status,
      toStatus: transition.to,
      actorId: actor.id,
      actorRole: machineActor === "SYSTEM" ? "SYSTEM" : actor.role,
      note: note ?? null,
      revisionNo: updated.currentRevisionNo,
    },
  });
  await audit(tx, actor, `STATUS_${action}`, { type: "Application", id: app.id, applicationId: app.id }, {
    from: app.status,
    to: transition.to,
  });
  return updated;
}

/** Bumps the version for content edits so concurrent editors are detected. */
export async function bumpVersion(tx: Tx, app: Application, expectedVersion: number): Promise<Application> {
  const result = await tx.application.updateMany({
    where: { id: app.id, version: expectedVersion },
    data: { version: { increment: 1 } },
  });
  if (result.count === 0) throw staleVersion();
  return tx.application.findUniqueOrThrow({ where: { id: app.id } });
}
