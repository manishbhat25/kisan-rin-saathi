import { requireActor } from "@/server/auth/actor";
import { markNotificationRead } from "@/server/domain/accounts";
import { api } from "@/server/http";

export const POST = api<{ id: string }>(async (_req, { id }) => markNotificationRead(await requireActor(), id));
