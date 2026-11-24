import { createHash, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/domain/constants";
import { loginSchema, operatorLinkSchema, profileSchema, registerSchema } from "@/lib/domain/schemas";
import type { Actor } from "@/server/auth/actor";
import { prisma } from "@/server/db";
import { ApiError, badRequest, conflict, forbidden } from "@/server/errors";
import { clearRateLimit, rateLimit } from "@/server/rateLimit";
import { audit } from "./events";

// Compared against when the email is unknown so response time does not reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync("unused-placeholder-password", 10);

export async function registerFarmer(input: unknown, ip: string) {
  const data = registerSchema.parse(input);
  await rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw conflict("EMAIL_TAKEN", "An account with this email already exists. Try signing in.");
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        role: "FARMER",
        phone: data.phone || null,
        farmerProfile: { create: { fullName: data.displayName } },
      },
    });
    await audit(tx, { id: user.id, role: "FARMER" }, "USER_REGISTERED", { type: "User", id: user.id });
    return user;
  });
}

export async function verifyLogin(input: unknown, ip: string) {
  const data = loginSchema.parse(input);
  const key = `login:${data.email}:${ip}`;
  await rateLimit(key, 8, 15 * 60 * 1000);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  const ok = await bcrypt.compare(data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || !user.isActive) {
    if (user) await audit(prisma, { id: user.id, role: user.role as Role }, "LOGIN_FAILED", { type: "User", id: user.id });
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  await clearRateLimit(key);
  await audit(prisma, { id: user.id, role: user.role as Role }, "LOGIN", { type: "User", id: user.id });
  return user;
}

export async function getProfile(actor: Actor) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: { email: true, phone: true, displayName: true, preferredLanguage: true, farmerProfile: true },
  });
  return user;
}

export async function updateProfile(actor: Actor, input: unknown) {
  if (actor.role !== "FARMER") throw forbidden();
  const data = profileSchema.parse(input);
  const { phone, preferredLanguage, ...profile } = data;
  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: actor.id },
      data: {
        displayName: profile.fullName,
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(preferredLanguage ? { preferredLanguage } : {}),
      },
    });
    const saved = await tx.farmerProfile.upsert({
      where: { userId: actor.id },
      create: { userId: actor.id, ...profile },
      update: profile,
    });
    await audit(tx, actor, "PROFILE_UPDATED", { type: "FarmerProfile", id: saved.id });
    return saved;
  });
}

function hashCode(farmerId: string, code: string) {
  return createHash("sha256").update(`${farmerId}:${code}`).digest("hex");
}

/** A short-lived, single-use code the farmer shares in person to authorize a service-centre operator. */
export async function createAssistanceCode(actor: Actor) {
  if (actor.role !== "FARMER") throw forbidden();
  await rateLimit(`assist-code:${actor.id}`, 10, 60 * 60 * 1000);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.assistanceCode.updateMany({ where: { farmerId: actor.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.assistanceCode.create({ data: { farmerId: actor.id, codeHash: hashCode(actor.id, code), expiresAt } });
    await audit(tx, actor, "ASSISTANCE_CODE_CREATED", { type: "User", id: actor.id });
  });
  return { code, expiresAt: expiresAt.toISOString() };
}

export async function farmerAuthorizations(actor: Actor) {
  if (actor.role !== "FARMER") throw forbidden();
  const auths = await prisma.operatorAuthorization.findMany({
    where: { farmerId: actor.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { grantedAt: "desc" },
    include: { operator: { select: { displayName: true } } },
  });
  return auths.map((auth) => ({
    id: auth.id,
    operatorName: auth.operator.displayName,
    grantedAt: auth.grantedAt.toISOString(),
    expiresAt: auth.expiresAt.toISOString(),
  }));
}

export async function revokeAuthorizations(actor: Actor) {
  if (actor.role !== "FARMER") throw forbidden();
  const result = await prisma.operatorAuthorization.updateMany({
    where: { farmerId: actor.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await audit(prisma, actor, "OPERATOR_ACCESS_REVOKED", { type: "User", id: actor.id }, { count: result.count });
  return { revoked: result.count };
}

export async function linkFarmer(actor: Actor, input: unknown) {
  if (actor.role !== "OPERATOR") throw forbidden();
  const data = operatorLinkSchema.parse(input);
  await rateLimit(`assist-link:${actor.id}`, 10, 15 * 60 * 1000);
  const farmer = await prisma.user.findUnique({ where: { email: data.farmerEmail } });
  const invalid = badRequest("The email or code is not valid, or the code has expired.");
  if (!farmer || farmer.role !== "FARMER") throw invalid;
  const code = await prisma.assistanceCode.findFirst({
    where: { farmerId: farmer.id, usedAt: null, expiresAt: { gt: new Date() }, codeHash: hashCode(farmer.id, data.code) },
  });
  if (!code) throw invalid;
  return prisma.$transaction(async (tx) => {
    await tx.assistanceCode.update({ where: { id: code.id }, data: { usedAt: new Date() } });
    const authorization = await tx.operatorAuthorization.create({
      data: {
        operatorId: actor.id,
        farmerId: farmer.id,
        consentMethod: "FARMER_CODE",
        consentText:
          "Farmer shared a one-time code and agreed that the service-centre operator may prepare and submit applications on their behalf for 24 hours.",
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
    await audit(tx, actor, "OPERATOR_AUTHORIZED", { type: "OperatorAuthorization", id: authorization.id }, {
      farmerId: farmer.id,
    });
    return { authorizationId: authorization.id, farmerId: farmer.id, farmerName: farmer.displayName, expiresAt: authorization.expiresAt };
  });
}

export async function operatorFarmers(actor: Actor) {
  if (actor.role !== "OPERATOR") throw forbidden();
  const auths = await prisma.operatorAuthorization.findMany({
    where: { operatorId: actor.id },
    orderBy: { grantedAt: "desc" },
    include: { farmer: { select: { id: true, displayName: true, email: true } } },
  });
  const now = new Date();
  return auths.map((auth) => ({
    id: auth.id,
    farmerId: auth.farmer.id,
    farmerName: auth.farmer.displayName,
    farmerEmail: auth.farmer.email,
    grantedAt: auth.grantedAt.toISOString(),
    expiresAt: auth.expiresAt.toISOString(),
    active: !auth.revokedAt && auth.expiresAt > now,
  }));
}

export async function markNotificationRead(actor: Actor, id: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

export async function markAllNotificationsRead(actor: Actor) {
  const result = await prisma.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
