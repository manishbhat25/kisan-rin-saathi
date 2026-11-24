import { expect, test } from "@playwright/test";
import { GOV_DETAILS, USERS, expectStatus, loginAs, reviewAndAssess, submitViaApi } from "./helpers";

test("Journey 4: rejected government application leads to a prefilled bank application", async ({ page }) => {
  await loginAs(page, USERS.farmer);
  const app = await submitViaApi(
    page,
    "GOVERNMENT",
    { ...GOV_DETAILS, landholdingAcres: 22, annualAgriIncome: 900000, irrigationType: "IRRIGATED" },
    ["IDENTITY_PROOF", "LAND_RECORD"],
  );
  const reason = "Cultivated land is above the limit for this small-farmer support scheme.";

  await test.step("officer rejects with a reason", async () => {
    await loginAs(page, USERS.gov);
    await reviewAndAssess(page, app.id);
    await page.goto(`/officer/applications/${app.id}`);
    await page.getByTestId("decision-REJECT").check();
    await page.getByTestId("confirm-decision").click();
    await expect(page.getByText(/at least 10 characters/)).toBeVisible();
    await page.locator("#decision-reason").fill(reason);
    await page.getByTestId("confirm-decision").click();
    await expectStatus(page, "REJECTED");
  });

  await test.step("farmer reads the reason and explores the bank route", async () => {
    await loginAs(page, USERS.farmer);
    await page.goto(`/farmer/applications/${app.id}`);
    await expectStatus(page, "REJECTED");
    await expect(page.getByText(reason).first()).toBeVisible();
    await page.getByTestId("explore-other-route").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("checkbox").first()).toBeChecked();
    await dialog.getByTestId("confirm-alternative").click();
    await page.waitForURL(/\/edit$/);
    expect(page.url()).not.toContain(app.id);
  });

  await test.step("the new bank application is prefilled and linked to the original", async () => {
    await expect(page.locator("#f-fullName")).toHaveValue(GOV_DETAILS.fullName);
    await expect(page.locator("#f-stateCode")).toHaveValue("GJ");
    await expect(page.locator("#f-district")).toHaveValue("Anand");
    const newId = /applications\/([^/]+)\/edit/.exec(page.url())![1];
    await page.goto(`/farmer/applications/${newId}`);
    await expectStatus(page, "DRAFT");
    await expect(page.getByText(app.reference!).first()).toBeVisible();
    await expect(page.getByTestId("app-reference")).toHaveText(/^BNK-/);
  });
});
