import { expect, test } from "@playwright/test";
import { GOV_DETAILS, USERS, expectStatus, fillStepAndContinue, idFromUrl, loginAs, submitViaApi, uploadInForm } from "./helpers";

test("Journey 5: service-centre operator submits for a farmer only after consent", async ({ page }) => {
  await loginAs(page, USERS.farmer);
  const otherFarmersApp = await submitViaApi(page, "GOVERNMENT", GOV_DETAILS, ["IDENTITY_PROOF"]);

  await test.step("operator cannot start an application without authorisation", async () => {
    await loginAs(page, USERS.operator);
    const res = await page.request.post("/api/operator/authorizations", {
      data: { farmerEmail: USERS.farmer2, code: "000000", consentConfirmed: true },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  let code = "";
  await test.step("farmer creates a one-time assistance code", async () => {
    await loginAs(page, USERS.farmer2);
    await page.goto("/farmer/profile");
    await page.getByTestId("create-assistance-code").click();
    code = ((await page.getByTestId("assistance-code").textContent()) ?? "").replace(/\D/g, "");
    expect(code).toMatch(/^\d{6}$/);
  });

  await test.step("operator must confirm consent, then links the farmer", async () => {
    await loginAs(page, USERS.operator);
    await page.goto("/operator");
    await page.locator("#farmerEmail").fill(USERS.farmer2);
    await page.locator("#code").fill(code);
    await page.getByRole("button", { name: "Link farmer" }).click();
    await expect(page.getByText("Confirm that the farmer has agreed to your help")).toBeVisible();
    await page.getByTestId("operator-consent").check();
    await page.getByRole("button", { name: "Link farmer" }).click();
    await expect(page.getByTestId("operator-start").first()).toBeVisible();
  });

  let reference = "";
  let assistedId = "";
  await test.step("operator prepares and submits the application", async () => {
    await page.getByTestId("operator-start").first().click();
    await expect(page.getByText("Applying on behalf of Sunita Devi")).toBeVisible();
    await page.locator('input[name="route"][value="GOVERNMENT"]').check();
    await page.getByTestId("start-application").click();
    await page.waitForURL(/\/operator\/applications\/[^/]+\/edit$/);
    await expect(page.locator("#f-fullName")).toHaveValue("Sunita Devi");
    await fillStepAndContinue(page, { age: 36, district: "Ajmer", village: "Kishangarh" }, 2);
    await fillStepAndContinue(page, { farmerCategory: "TENANT", landholdingAcres: 2, cropCategory: "OILSEED", irrigationType: "RAINFED" }, 3);
    await fillStepAndContinue(
      page,
      { annualAgriIncome: 90000, supportPurpose: "INPUT_SUPPORT", requestedAmount: 25000, hasBankAccount: true, priorSchemeDefault: false },
      4,
    );
    await uploadInForm(page, "IDENTITY_PROOF");
    await uploadInForm(page, "TENANCY_AGREEMENT");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByTestId("submit-application").click();
    await page.waitForURL(/submitted=1/);
    await expectStatus(page, "SUBMITTED");
    reference = (await page.getByTestId("app-reference").textContent()) ?? "";
    assistedId = idFromUrl(page);
  });

  await test.step("operator still cannot open another farmer's application", async () => {
    const res = await page.request.get(`/api/applications/${otherFarmersApp.id}`);
    expect(res.status()).toBe(404);
    const pageRes = await page.goto(`/operator/applications/${otherFarmersApp.id}`);
    expect(pageRes?.status()).toBe(404);
  });

  await test.step("the farmer sees the assisted application in their own account", async () => {
    await loginAs(page, USERS.farmer2);
    await page.goto(`/farmer/applications/${assistedId}`);
    await expect(page.getByTestId("app-reference")).toHaveText(reference);
    await expect(page.getByText(/Assisted submission/).first()).toBeVisible();
  });

  await test.step("farmer revokes access and the operator loses it", async () => {
    await page.goto("/farmer/profile");
    await page.getByRole("button", { name: "Remove operator access" }).click();
    await expect(page.getByRole("button", { name: "Remove operator access" })).toHaveCount(0);
    await loginAs(page, USERS.operator);
    await page.goto("/operator");
    await expect(page.getByTestId("operator-start")).toHaveCount(0);
  });
});
