import type { Application } from "@prisma/client";
import type { FinancingRoute } from "@/lib/domain/constants";
import { fieldsFor } from "@/lib/domain/fields";
import type { Tx } from "@/server/db";
import { prisma } from "@/server/db";

export type Details = Record<string, string | number | boolean | null>;

export function routeFieldKeys(route: FinancingRoute): string[] {
  return fieldsFor(route).map((field) => field.key);
}

function pick(route: FinancingRoute, row: Record<string, unknown> | null): Details {
  const out: Details = {};
  for (const key of routeFieldKeys(route)) {
    const value = row?.[key];
    out[key] = value === undefined ? null : (value as Details[string]);
  }
  return out;
}

export async function readDetails(tx: Tx | typeof prisma, app: Pick<Application, "id" | "route">): Promise<Details> {
  const route = app.route as FinancingRoute;
  const row =
    route === "GOVERNMENT"
      ? await tx.governmentApplicationDetails.findUnique({ where: { applicationId: app.id } })
      : await tx.bankApplicationDetails.findUnique({ where: { applicationId: app.id } });
  return pick(route, row as Record<string, unknown> | null);
}

export async function writeDetails(
  tx: Tx,
  app: Pick<Application, "id" | "route">,
  values: Record<string, unknown>,
): Promise<void> {
  const route = app.route as FinancingRoute;
  const data: Record<string, unknown> = {};
  for (const key of routeFieldKeys(route)) {
    if (key in values) data[key] = values[key] ?? null;
  }
  if (route === "BANK" && data.collateralType === "NONE") data.collateralValue = 0;
  if (route === "GOVERNMENT") {
    await tx.governmentApplicationDetails.upsert({
      where: { applicationId: app.id },
      create: { applicationId: app.id, ...data },
      update: data,
    });
  } else {
    await tx.bankApplicationDetails.upsert({
      where: { applicationId: app.id },
      create: { applicationId: app.id, ...data },
      update: data,
    });
  }
}

export interface RevisionSnapshot {
  details: Details;
  documents: { id: string; docType: string; originalName: string; sha256: string }[];
}

export async function activeDocuments(tx: Tx | typeof prisma, applicationId: string) {
  return tx.document.findMany({
    where: { applicationId, supersededAt: null },
    orderBy: { uploadedAt: "asc" },
  });
}

export async function buildSnapshot(tx: Tx, app: Application): Promise<RevisionSnapshot> {
  const details = await readDetails(tx, app);
  const documents = await activeDocuments(tx, app.id);
  return {
    details,
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      originalName: doc.originalName,
      sha256: doc.sha256,
    })),
  };
}

export function diffSnapshots(previous: RevisionSnapshot, next: RevisionSnapshot): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(next.details)) {
    if ((previous.details[key] ?? null) !== (next.details[key] ?? null)) changed.push(key);
  }
  const docKey = (snapshot: RevisionSnapshot, type: string) =>
    snapshot.documents
      .filter((doc) => doc.docType === type)
      .map((doc) => doc.sha256)
      .sort()
      .join(",");
  const types = new Set([...previous.documents, ...next.documents].map((doc) => doc.docType));
  for (const type of types) {
    if (docKey(previous, type) !== docKey(next, type)) changed.push(`document:${type}`);
  }
  return changed;
}
