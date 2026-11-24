import { requireActor } from "@/server/auth/actor";
import { addInternalNote } from "@/server/domain/officer";
import { api, body } from "@/server/http";

export const POST = api<{ id: string }>(async (req, { id }) => {
  const note = await addInternalNote(await requireActor("GOV_OFFICER", "BANK_OFFICER"), id, await body(req));
  return { id: note.id };
});
