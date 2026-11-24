import { requireActor } from "@/server/auth/actor";
import { prisma } from "@/server/db";
import { loadForActor } from "@/server/domain/access";
import { audit } from "@/server/domain/events";
import { notFound } from "@/server/errors";
import { api } from "@/server/http";
import { readStoredFile } from "@/server/storage";

export const GET = api<{ id: string }>(async (_req, { id }) => {
  const actor = await requireActor();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw notFound();
  await loadForActor(prisma, actor, doc.applicationId);
  const file = await readStoredFile(doc.storedName).catch(() => {
    throw notFound("The file could not be found in storage.");
  });
  await audit(prisma, actor, "DOCUMENT_VIEWED", { type: "Document", id: doc.id, applicationId: doc.applicationId });
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.originalName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store",
    },
  });
});
