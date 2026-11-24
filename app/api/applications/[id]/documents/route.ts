import { requireActor } from "@/server/auth/actor";
import { uploadDocument } from "@/server/domain/applicant";
import { badRequest } from "@/server/errors";
import { api } from "@/server/http";
import { MAX_UPLOAD_BYTES } from "@/server/storage";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const actor = await requireActor("FARMER", "OPERATOR");
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) throw badRequest("Files must be 5 MB or smaller.");
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const docType = form?.get("docType");
  if (!(file instanceof File) || typeof docType !== "string") throw badRequest("Choose a file and document type.");
  const doc = await uploadDocument(actor, id, docType, file);
  return { id: doc.id, docType: doc.docType, originalName: doc.originalName, uploadedAt: doc.uploadedAt };
});
