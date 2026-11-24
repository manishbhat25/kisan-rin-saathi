import { requireActor } from "@/server/auth/actor";
import { linkFarmer } from "@/server/domain/accounts";
import { api, body } from "@/server/http";

export const POST = api(async (req) => linkFarmer(await requireActor("OPERATOR"), await body(req)));
