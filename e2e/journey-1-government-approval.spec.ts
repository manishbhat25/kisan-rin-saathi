import { expect, test } from "@playwright/test";
import { USERS, expectStatus, fillStepAndContinue, idFromUrl, loginAs, uploadInForm } from "./helpers";

test("Journey 1: new farmer applies through a government scheme and is approved", async ({ page }) => {
  const email = `e2e-farmer-${Date.now()}@example.test`;

  await test.step("farmer registers", async () => {
    await page.goto("/register");
    await page.locator("#displayName").fill("Kavita Joshi");
    await page.locator("#email").fill(email);
    await page.locator("#phone").fill("9876511111");
    await page.locator("#password").fill("Harvest2026");
    await page.getByRole("button", { name: /create account|register/i }).click();
    await page.waitForURL(/\/farmer/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Kavita");
  });

  await test.step("compares routes and chooses the government scheme", async () => {
    await page.goto("/compare");
    await expect(page.getByRole("link", { name: "View requirements" }).first()).toBeVisible();
    await page.getByRole("link", { name: "Apply through government scheme" }).first().click();
    await page.waitForURL(/applications\/new/);
    await expect(page.locator('input[name="route"][value="GOVERNMENT"]')).toBeChecked();
    await page.getByTestId("start-application").click();
    await page.waitForURL(/\/edit$/);
  });

  let reference = "";
  await test.step("completes the multi-step form with validation", async () => {
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.locator("#f-fullName-error, #f-age-error, #f-stateCode-error").first()).toBeVisible();

    await fillStepAndContinue(page, { fullName: "Kavita Joshi", age: 39, stateCode: "MH", district: "Nashik", village: "Sinnar" }, 2);
    await fillStepAndContinue(page, { farmerCategory: "OWNER", landholdingAcres: 2, cropCategory: "PULSE", irrigationType: "RAINFED" }, 3);
    await fillStepAndContinue(
      page,
      { annualAgriIncome: 110000, supportPurpose: "INPUT_SUPPORT", requestedAmount: 35000, hasBankAccount: true, priorSchemeDefault: false },
      4,
    );
    await uploadInForm(page, "IDENTITY_PROOF");
    await uploadInForm(page, "LAND_RECORD");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByRole("heading", { name: /^Step 5 of 5/ })).toBeVisible();
    await expect(page.getByText("Nashik")).toBeVisible();

    await page.getByTestId("submit-application").click();
    await page.waitForURL(/submitted=1/);
    await expectStatus(page, "SUBMITTED");
    reference = (await page.getByTestId("app-reference").textContent()) ?? "";
    expect(reference).toMatch(/^GOV-/);
  });
  const id = idFromUrl(page);

  await test.step("government officer reviews, assesses and approves", async () => {
    await loginAs(page, USERS.gov);
    await page.goto("/officer");
    await expect(page.getByTestId("application-row").filter({ hasText: reference })).toBeVisible();
    await page.goto(`/officer/applications/${id}`);
    await page.getByTestId("start-review").click();
    await expectStatus(page, "UNDER_REVIEW");
    await page.getByTestId("run-assessment").click();
    await expect(page.getByTestId("assessment-panel")).toContainText(/Likely eligible|Needs officer review|Not eligible/i);
    await expect(page.getByTestId("assessment-panel")).toContainText("synthetic");

    await page.getByTestId("decision-APPROVE").check();
    await page.locator("#decision-reason").fill("Documents verified against the application details.");
    await page.getByTestId("confirm-decision").click();
    await expectStatus(page, "APPROVED");
  });

  await test.step("farmer sees the approval and a notification", async () => {
    await page.context().clearCookies();
    const res = await page.request.post("/api/auth/login", { data: { email, password: "Harvest2026" } });
    expect(res.ok()).toBeTruthy();
    await page.goto(`/farmer/applications/${id}`);
    await expectStatus(page, "APPROVED");
    await expect(page.getByText(/does not sanction or disburse|demonstration/i).first()).toBeVisible();
    await page.goto("/notifications");
    await expect(page.getByTestId("notification-list")).toContainText(reference);
  });
});
