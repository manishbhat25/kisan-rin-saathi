import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/server/db";

export const SESSION_COOKIE = "krs_session";
const SESSION_HOURS = 8;

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000);
  await prisma.session.create({ data: { tokenHash: hash(token), userId, expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
  store.delete(SESSION_COOKIE);
}

export const getSessionUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hash(token) },
    include: {
      user: {
        include: { officerAssignments: { where: { isActive: true }, include: { organization: true } } },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session.user;
});
