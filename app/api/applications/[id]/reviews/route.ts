import { requireActor } from "@/server/auth/actor";
import { sendReview } from "@/server/domain/officer";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const result = await sendReview(await requireActor("GOV_OFFICER", "BANK_OFFICER"), id, await body(req));
  return {
    id: result.application.id,
    version: result.application.version,
    status: result.application.status,
    reviewId: result.review.id,
  };
});
