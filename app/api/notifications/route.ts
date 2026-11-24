import { requireActor } from "@/server/auth/actor";
import { listNotifications } from "@/server/domain/queries";
import { api } from "@/server/http";

export const GET = api(async () => listNotifications(await requireActor()));
