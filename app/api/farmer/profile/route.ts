import { requireActor } from "@/server/auth/actor";
import { getProfile, updateProfile } from "@/server/domain/accounts";
import { api, body } from "@/server/http";

export const GET = api(async () => getProfile(await requireActor("FARMER")));

export const PUT = api(async (req) => updateProfile(await requireActor("FARMER"), await body(req)));
