import { requireActor } from "@/server/auth/actor";
import { runAssessment } from "@/server/domain/officer";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const result = await runAssessment(await requireActor("GOV_OFFICER", "BANK_OFFICER"), id, await body(req));
  return {
    id: result.application.id,
    version: result.application.version,
    status: result.application.status,
    assessment: { id: result.assessment.id, outcome: result.assessment.outcome, score: result.assessment.score },
  };
});
