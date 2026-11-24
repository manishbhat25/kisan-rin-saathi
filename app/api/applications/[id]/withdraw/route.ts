import { requireActor } from "@/server/auth/actor";
import { withdrawApplication } from "@/server/domain/applicant";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const app = await withdrawApplication(await requireActor("FARMER"), id, await body(req));
  return { id: app.id, version: app.version, status: app.status };
});
