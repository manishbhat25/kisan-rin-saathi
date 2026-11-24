import { prisma } from "@/server/db";
import { api } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = api(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { status: "ok", time: new Date().toISOString() };
});
