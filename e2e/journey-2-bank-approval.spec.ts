import { expect, test } from "@playwright/test";
import { USERS, expectStatus, fillStepAndContinue, idFromUrl, loginAs, uploadInForm } from "./helpers";

test("Journey 2: farmer applies through a bank and the bank officer approves", async ({ page }) => {
  await loginAs(page, USERS.farmer);

  await test.step("farmer starts a bank application with profile details prefilled", async () => {
    await page.goto("/farmer/applications/new?route=BANK");
    await expect(page.locator('input[name="route"][value="BANK"]')).toBeChecked();
    await page.getByTestId("start-application").click();
    await page.waitForURL(/\/edit$/);
    await expect(page.locator("#f-fullName")).toHaveValue("Ramesh Patel");
    await expect(page.locator("#f-stateCode")).toHaveValue("GJ");
  });

  let reference = "";
  await test.step("completes the bank form", async () => {
    await fillStepAndContinue(page, { age: 42, district: "Anand", village: "Bakrol" }, 2);
    await fillStepAndContinue(
      page,
      { annualIncome: 650000, existingMonthlyEmi: 0, creditHistory: "GOOD", yearsFarming: 15, landholdingAcres: 6 },
      3,
    );
    await fillStepAndContinue(page, { loanPurpose: "EQUIPMENT", requestedAmount: 150000, tenureMonths: 36, collateralType: "NONE" }, 4);
    for (const doc of ["IDENTITY_PROOF", "INCOME_PROOF", "BANK_STATEMENT", "LAND_RECORD"]) await uploadInForm(page, doc);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByTestId("submit-application").click();
    await page.waitForURL(/submitted=1/);
    await expectStatus(page, "SUBMITTED");
    reference = (await page.getByTestId("app-reference").textContent()) ?? "";
    expect(reference).toMatch(/^BNK-/);
  });
  const id = idFromUrl(page);

  await test.step("bank officer assesses and approves", async () => {
    await loginAs(page, USERS.bank);
    await page.goto("/officer");
    await expect(page.getByTestId("application-row").filter({ hasText: reference })).toBeVisible();
    await page.goto(`/officer/applications/${id}`);
    await page.getByTestId("start-review").click();
    await expectStatus(page, "UNDER_REVIEW");
    await page.getByTestId("run-assessment").click();
    await expect(page.getByTestId("assessment-panel")).toContainText(/Likely eligible|Needs officer review|Not eligible/i);

    await page.getByTestId("decision-APPROVE").check();
    await page.locator("#decision-reason").fill("Income and repayment history verified with the statement provided.");
    await page.locator("#decision-conditions").fill("Equipment invoice to be submitted before any release.");
    await page.getByTestId("confirm-decision").click();
    await expectStatus(page, "APPROVED");
  });

  await test.step("farmer sees the approval with conditions", async () => {
    await loginAs(page, USERS.farmer);
    await page.goto(`/farmer/applications/${id}`);
    await expectStatus(page, "APPROVED");
    await expect(page.getByText("Equipment invoice to be submitted")).toBeVisible();
  });
});
