import { requireActor } from "@/server/auth/actor";
import { revokeAuthorizations } from "@/server/domain/accounts";
import { api } from "@/server/http";

export const DELETE = api(async () => revokeAuthorizations(await requireActor("FARMER")));
