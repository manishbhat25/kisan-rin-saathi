import { requireActor } from "@/server/auth/actor";
import { markAllNotificationsRead } from "@/server/domain/accounts";
import { api } from "@/server/http";

export const POST = api(async () => markAllNotificationsRead(await requireActor()));
