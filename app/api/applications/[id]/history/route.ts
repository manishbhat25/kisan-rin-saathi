import { requireActor } from "@/server/auth/actor";
import { getApplicationView } from "@/server/domain/queries";
import { api } from "@/server/http";

export const GET = api<{ id: string }>(async (_req, { id }) => {
  const view = await getApplicationView(await requireActor(), id);
  return {
    history: view.history,
    revisions: view.revisions.map((revision) => ({
      revisionNo: revision.revisionNo,
      createdAt: revision.createdAt,
      changedFields: revision.changedFields,
    })),
    decisions: view.decisions,
  };
});
