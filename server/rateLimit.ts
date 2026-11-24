import { ApiError } from "./errors";
import { prisma } from "./db";

/** Database-backed fixed-window limiter so limits survive restarts. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const since = new Date(Date.now() - windowMs);
  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (count >= limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
  }
  await prisma.rateLimitHit.create({ data: { key } });
  if (Math.random() < 0.02) {
    await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimitHit.deleteMany({ where: { key } });
}
