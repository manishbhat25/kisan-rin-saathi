import { requireActor } from "@/server/auth/actor";
import { createApplication } from "@/server/domain/applicant";
import { listApplications } from "@/server/domain/queries";
import { api, body } from "@/server/http";

export const GET = api(async (req) => {
  const actor = await requireActor();
  const params = req.nextUrl.searchParams;
  return listApplications(actor, {
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
    route: params.get("route") ?? undefined,
  });
});

export const POST = api(async (req) => {
  const actor = await requireActor("FARMER", "OPERATOR");
  const app = await createApplication(actor, await body(req));
  return { id: app.id, reference: app.reference, version: app.version, status: app.status };
});
