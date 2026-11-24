import { homeFor } from "@/server/auth/actor";
import { createSession } from "@/server/auth/session";
import { verifyLogin } from "@/server/domain/accounts";
import { api, body, clientIp } from "@/server/http";
import type { Role } from "@/lib/domain/constants";

export const POST = api(async (req) => {
  const user = await verifyLogin(await body(req), clientIp(req));
  await createSession(user.id);
  return { id: user.id, role: user.role, displayName: user.displayName, home: homeFor(user.role as Role) };
});
