import { requireActor } from "@/server/auth/actor";
import { updateDetails } from "@/server/domain/applicant";
import { getApplicationView } from "@/server/domain/queries";
import { api, body } from "@/server/http";

type Params = { id: string };

export const GET = api<Params>(async (_req, { id }) => getApplicationView(await requireActor(), id));

export const PATCH = api<Params>(async (req, { id }) => {
  const app = await updateDetails(await requireActor("FARMER", "OPERATOR"), id, await body(req));
  return { id: app.id, version: app.version, status: app.status };
});
