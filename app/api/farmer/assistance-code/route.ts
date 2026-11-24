import { requireActor } from "@/server/auth/actor";
import { createAssistanceCode } from "@/server/domain/accounts";
import { api } from "@/server/http";

export const POST = api(async () => createAssistanceCode(await requireActor("FARMER")));
