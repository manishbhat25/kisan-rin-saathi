import { prisma } from "@/server/db";
import { api } from "@/server/http";
import { loadModel } from "@/server/ml/model";

export const dynamic = "force-dynamic";

export const GET = api(async () => {
  await prisma.$queryRaw`SELECT 1`;
  loadModel("GOVERNMENT");
  loadModel("BANK");
  return { status: "ok", database: "ok", models: "ok", time: new Date().toISOString() };
});
