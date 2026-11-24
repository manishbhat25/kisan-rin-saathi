import { requireActor } from "@/server/auth/actor";
import { submitApplication } from "@/server/domain/applicant";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const app = await submitApplication(await requireActor("FARMER", "OPERATOR"), id, await body(req));
  return { id: app.id, version: app.version, status: app.status, reference: app.reference };
});
