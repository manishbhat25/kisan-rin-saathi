/* Demo data only: synthetic people, no real identity numbers or financial records. */
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Actor } from "@/server/auth/actor";
import { prisma } from "@/server/db";
import {
  createApplication,
  submitApplication,
  uploadDocument,
} from "@/server/domain/applicant";
import { recordDecision, runAssessment, startReview } from "@/server/domain/officer";

export const DEMO_PASSWORD = "Demo@1234";

const SAMPLE_PDF = Buffer.from("%PDF-1.4\n% Synthetic demo document - not a real record\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

function actorOf(user: { id: string; role: string; displayName: string; email: string }, org?: { id: string; name: string; route: string }): Actor {
  return {
    id: user.id,
    role: user.role as Actor["role"],
    displayName: user.displayName,
    email: user.email,
    route: (org?.route as Actor["route"]) ?? null,
    organizationId: org?.id ?? null,
    organizationName: org?.name ?? null,
  };
}

async function upload(actor: Actor, appId: string, docType: string, name: string) {
  await uploadDocument(actor, appId, docType, new File([SAMPLE_PDF], name, { type: "application/pdf" }));
}

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.log("Database already has users; skipping seed. Run `npm run db:reset` for a fresh demo database.");
    return;
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const gov = await prisma.organization.create({
    data: { code: "GOV_AGRI_DEPT", name: "Department of Agriculture (Demo)", route: "GOVERNMENT" },
  });
  const bank = await prisma.organization.create({
    data: { code: "DEMO_BANK", name: "Kisan Demo Bank", route: "BANK" },
  });

  const mk = (email: string, displayName: string, role: string, phone: string | null = null) =>
    prisma.user.create({ data: { email, displayName, role, phone, passwordHash } });

  const ramesh = await mk("farmer@demo.in", "Ramesh Patel", "FARMER", "9876500001");
  const sunita = await mk("farmer2@demo.in", "Sunita Devi", "FARMER", "9876500002");
  const harpreet = await mk("farmer3@demo.in", "Harpreet Singh", "FARMER", "9876500003");
  const govOfficer = await mk("gov.officer@demo.in", "Anil Sharma", "GOV_OFFICER");
  const bankOfficer = await mk("bank.officer@demo.in", "Priya Nair", "BANK_OFFICER");
  const operator = await mk("operator@demo.in", "Common Service Centre - Anand", "OPERATOR");

  await prisma.officerAssignment.create({ data: { userId: govOfficer.id, organizationId: gov.id, title: "Agriculture Extension Officer" } });
  await prisma.officerAssignment.create({ data: { userId: bankOfficer.id, organizationId: bank.id, title: "Agri Credit Officer" } });

  await prisma.farmerProfile.create({
    data: { userId: ramesh.id, fullName: "Ramesh Patel", age: 42, stateCode: "GJ", district: "Anand", village: "Bakrol", farmerCategory: "OWNER", landholdingAcres: 3.5, primaryCrop: "Wheat" },
  });
  await prisma.farmerProfile.create({
    data: { userId: sunita.id, fullName: "Sunita Devi", age: 36, stateCode: "RJ", district: "Ajmer", village: "Kishangarh", farmerCategory: "TENANT", landholdingAcres: 2, primaryCrop: "Mustard" },
  });
  await prisma.farmerProfile.create({
    data: { userId: harpreet.id, fullName: "Harpreet Singh", age: 51, stateCode: "PB", district: "Ludhiana", village: "Raikot", farmerCategory: "OWNER", landholdingAcres: 18, primaryCrop: "Wheat" },
  });

  const sunitaA = actorOf(sunita);
  const harpreetA = actorOf(harpreet);
  const govA = actorOf(govOfficer, gov);
  const bankA = actorOf(bankOfficer, bank);

  // 1. Sunita: government application waiting in the queue.
  const s1 = await createApplication(sunitaA, {
    route: "GOVERNMENT",
    clientRequestId: randomUUID(),
    details: { cropCategory: "OILSEED", irrigationType: "RAINFED", annualAgriIncome: 95000, supportPurpose: "INPUT_SUPPORT", requestedAmount: 30000, hasBankAccount: true, priorSchemeDefault: false },
  });
  await upload(sunitaA, s1.id, "IDENTITY_PROOF", "identity-proof.pdf");
  await upload(sunitaA, s1.id, "TENANCY_AGREEMENT", "lease-agreement.pdf");
  await submitApplication(sunitaA, s1.id, { expectedVersion: s1.version });

  // 2. Sunita: bank draft not yet submitted.
  await createApplication(sunitaA, {
    route: "BANK",
    clientRequestId: randomUUID(),
    details: { annualIncome: 180000, loanPurpose: "DAIRY_LIVESTOCK" },
  });

  // 3. Harpreet: bank application assessed and awaiting a decision.
  const h1 = await createApplication(harpreetA, {
    route: "BANK",
    clientRequestId: randomUUID(),
    details: { annualIncome: 900000, existingMonthlyEmi: 5000, creditHistory: "GOOD", yearsFarming: 25, loanPurpose: "EQUIPMENT", requestedAmount: 600000, tenureMonths: 60, collateralType: "LAND", collateralValue: 1500000 },
  });
  for (const [type, name] of [["IDENTITY_PROOF", "id.pdf"], ["INCOME_PROOF", "income.pdf"], ["BANK_STATEMENT", "statement.pdf"], ["LAND_RECORD", "land.pdf"], ["COLLATERAL_DOCUMENT", "collateral.pdf"]]) {
    await upload(harpreetA, h1.id, type, name);
  }
  let h1v = await submitApplication(harpreetA, h1.id, { expectedVersion: h1.version });
  h1v = await startReview(bankA, h1.id, { expectedVersion: h1v.version });
  await runAssessment(bankA, h1.id, { expectedVersion: h1v.version });

  // 4. Harpreet: government application rejected (large farm), showing the alternative-route path.
  const h2 = await createApplication(harpreetA, {
    route: "GOVERNMENT",
    clientRequestId: randomUUID(),
    details: { farmerCategory: "OWNER", cropCategory: "CEREAL", irrigationType: "IRRIGATED", annualAgriIncome: 850000, supportPurpose: "EQUIPMENT_SUPPORT", requestedAmount: 150000, hasBankAccount: true, priorSchemeDefault: false },
  });
  await upload(harpreetA, h2.id, "IDENTITY_PROOF", "id.pdf");
  await upload(harpreetA, h2.id, "LAND_RECORD", "land.pdf");
  let h2v = await submitApplication(harpreetA, h2.id, { expectedVersion: h2.version });
  h2v = await startReview(govA, h2.id, { expectedVersion: h2v.version });
  const assessed = await runAssessment(govA, h2.id, { expectedVersion: h2v.version });
  await recordDecision(govA, h2.id, {
    expectedVersion: assessed.application.version,
    decision: "REJECTED",
    reason: "Cultivated land (18 acres) and farm income are above the limits of this small-farmer support scheme.",
  });

  console.log("Seeded demo data. Password for all demo accounts:", DEMO_PASSWORD);
  console.log("Farmer: farmer@demo.in | Gov officer: gov.officer@demo.in | Bank officer: bank.officer@demo.in | Operator: operator@demo.in");
  void operator;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
