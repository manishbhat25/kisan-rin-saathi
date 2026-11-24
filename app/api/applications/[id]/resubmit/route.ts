import { requireActor } from "@/server/auth/actor";
import { resubmitApplication } from "@/server/domain/applicant";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const app = await resubmitApplication(await requireActor("FARMER", "OPERATOR"), id, await body(req));
  return { id: app.id, version: app.version, status: app.status, revisionNo: app.currentRevisionNo };
});
