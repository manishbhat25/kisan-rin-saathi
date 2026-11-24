import { requireActor } from "@/server/auth/actor";
import { operatorFarmers } from "@/server/domain/accounts";
import { api } from "@/server/http";

export const GET = api(async () => operatorFarmers(await requireActor("OPERATOR")));
