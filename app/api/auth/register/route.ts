import { createSession } from "@/server/auth/session";
import { registerFarmer } from "@/server/domain/accounts";
import { api, body } from "@/server/http";

export const POST = api(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const user = await registerFarmer(await body(req), ip);
  await createSession(user.id);
  return { id: user.id, role: user.role, home: "/farmer" };
});
