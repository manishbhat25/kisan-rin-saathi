import { requireActor } from "@/server/auth/actor";
import { startAlternative } from "@/server/domain/applicant";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const app = await startAlternative(await requireActor("FARMER"), id, await body(req));
  return { id: app.id, reference: app.reference, route: app.route, version: app.version };
});
