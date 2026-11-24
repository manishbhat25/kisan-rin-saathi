import { randomUUID } from "node:crypto";
import type { Actor } from "@/server/auth/actor";
import { prisma } from "@/server/db";
import { createApplication, submitApplication, uploadDocument } from "@/server/domain/applicant";

const PDF = Buffer.from("%PDF-1.4\n%test\n%%EOF\n");

export function pdf(name = "doc.pdf") {
  return new File([PDF], name, { type: "application/pdf" });
}

let counter = 0;

async function user(role: string, name: string) {
  counter += 1;
  return prisma.user.create({
    data: { email: `${role.toLowerCase()}-${counter}-${randomUUID().slice(0, 6)}@test.local`, displayName: name, role, passwordHash: "x" },
  });
}

function toActor(u: { id: string; role: string; displayName: string; email: string }, org?: { id: string; name: string; route: string }): Actor {
  return {
    id: u.id,
    role: u.role as Actor["role"],
    displayName: u.displayName,
    email: u.email,
    route: (org?.route as Actor["route"]) ?? null,
    organizationId: org?.id ?? null,
    organizationName: org?.name ?? null,
  };
}

export async function world() {
  const gov =
    (await prisma.organization.findUnique({ where: { code: "GOV_AGRI_DEPT" } })) ??
    (await prisma.organization.create({ data: { code: "GOV_AGRI_DEPT", name: "Gov Test", route: "GOVERNMENT" } }));
  const bank =
    (await prisma.organization.findUnique({ where: { code: "DEMO_BANK" } })) ??
    (await prisma.organization.create({ data: { code: "DEMO_BANK", name: "Bank Test", route: "BANK" } }));
  const farmer = await user("FARMER", "Farmer One");
  const farmer2 = await user("FARMER", "Farmer Two");
  const govOfficer = await user("GOV_OFFICER", "Gov Officer");
  const bankOfficer = await user("BANK_OFFICER", "Bank Officer");
  const operator = await user("OPERATOR", "Operator");
  await prisma.officerAssignment.create({ data: { userId: govOfficer.id, organizationId: gov.id } });
  await prisma.officerAssignment.create({ data: { userId: bankOfficer.id, organizationId: bank.id } });
  return {
    farmer: toActor(farmer),
    farmer2: toActor(farmer2),
    gov: toActor(govOfficer, gov),
    bank: toActor(bankOfficer, bank),
    operator: toActor(operator),
  };
}

export const GOOD_GOV = {
  fullName: "Test Farmer",
  age: 40,
  stateCode: "Gujrat",
  district: "Anand",
  village: "Bakrol",
  farmerCategory: "OWNER",
  landholdingAcres: 2.5,
  cropCategory: "CEREAL",
  irrigationType: "RAINFED",
  annualAgriIncome: 120000,
  supportPurpose: "INPUT_SUPPORT",
  requestedAmount: 40000,
  hasBankAccount: true,
  priorSchemeDefault: false,
};

export const GOOD_BANK = {
  fullName: "Test Farmer",
  age: 38,
  stateCode: "PB",
  district: "Ludhiana",
  village: "Raikot",
  annualIncome: 600000,
  existingMonthlyEmi: 0,
  creditHistory: "GOOD",
  yearsFarming: 12,
  landholdingAcres: 6,
  loanPurpose: "EQUIPMENT",
  requestedAmount: 150000,
  tenureMonths: 36,
  collateralType: "NONE",
};

export async function submitted(actor: Actor, route: "GOVERNMENT" | "BANK", details: Record<string, unknown>, docs: string[]) {
  const app = await createApplication(actor, { route, clientRequestId: randomUUID(), details });
  for (const type of docs) await uploadDocument(actor, app.id, type, pdf(`${type}.pdf`));
  return submitApplication(actor, app.id, { expectedVersion: app.version });
}
