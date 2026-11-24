import { createSession } from "@/server/auth/session";
import { registerFarmer } from "@/server/domain/accounts";
import { api, body, clientIp } from "@/server/http";

export const POST = api(async (req) => {
  const user = await registerFarmer(await body(req), clientIp(req));
  await createSession(user.id);
  return { id: user.id, role: user.role, home: "/farmer" };
});
