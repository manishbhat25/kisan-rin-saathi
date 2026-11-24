import { requireActor } from "@/server/auth/actor";
import { startReview } from "@/server/domain/officer";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const app = await startReview(await requireActor("GOV_OFFICER", "BANK_OFFICER"), id, await body(req));
  return { id: app.id, version: app.version, status: app.status };
});
