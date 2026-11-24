import { currentActor } from "@/server/auth/actor";
import { api } from "@/server/http";

export const GET = api(async () => {
  const actor = await currentActor();
  return actor ? { id: actor.id, role: actor.role, displayName: actor.displayName, route: actor.route } : null;
});
