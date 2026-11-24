import { expect, test } from "@playwright/test";
import { GOV_DETAILS, USERS, call, expectStatus, loginAs, submitViaApi, uploadInForm } from "./helpers";

test("Journey 3: officer sends a review, farmer corrects and resubmits, officer sees the changes", async ({ page }) => {
  await loginAs(page, USERS.farmer);
  const app = await submitViaApi(page, "GOVERNMENT", { ...GOV_DETAILS, annualAgriIncome: 12000 }, ["IDENTITY_PROOF", "LAND_RECORD"]);

  await test.step("officer sends a structured review to the farmer", async () => {
    await loginAs(page, USERS.gov);
    await page.goto(`/officer/applications/${app.id}`);
    await page.getByTestId("start-review").click();
    await expectStatus(page, "UNDER_REVIEW");
    await page.getByTestId("open-review-composer").click();
    await page.locator("#review-summary").fill("Your income looks too low for the land you farm, and we need your bank passbook.");

    const first = page.getByTestId("review-item").nth(0);
    await first.locator("select").nth(0).selectOption("FIELD");
    await first.locator("select").nth(1).selectOption("annualAgriIncome");
    await first.locator("input").fill("Please check the yearly farm income figure.");

    await page.getByRole("button", { name: "+ Add another change" }).click();
    const second = page.getByTestId("review-item").nth(1);
    await second.locator("select").nth(0).selectOption("DOCUMENT");
    await second.locator("select").nth(1).selectOption("BANK_PASSBOOK");
    await second.locator("input").fill("Upload the first page of your bank passbook.");

    await page.getByTestId("send-review").click();
    await expectStatus(page, "CHANGES_REQUESTED");
  });

  await test.step("farmer sees what to fix, highlighted", async () => {
    await loginAs(page, USERS.farmer);
    await page.goto("/farmer");
    await expect(page.getByText(app.reference ?? "").first()).toBeVisible();
    await page.goto(`/farmer/applications/${app.id}`);
    await expectStatus(page, "CHANGES_REQUESTED");
    await expect(page.getByText("Please check the yearly farm income figure.").first()).toBeVisible();
    await page.getByTestId("edit-application").click();
    await page.waitForURL(/\/edit$/);
    await expect(page.getByText("Upload the first page of your bank passbook.").first()).toBeVisible();
  });

  await test.step("farmer corrects the field and uploads the document", async () => {
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByRole("heading", { name: /^Step 3 of 5/ })).toBeVisible();
    await expect(page.locator("#f-annualAgriIncome")).toHaveValue("12000");
    await page.locator("#f-annualAgriIncome").fill("120000");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByRole("heading", { name: /^Step 4 of 5/ })).toBeVisible();
    await uploadInForm(page, "BANK_PASSBOOK");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByRole("heading", { name: /^Step 5 of 5/ })).toBeVisible();
    await page.getByTestId("submit-application").click();
    await page.waitForURL(/submitted=1/);
    await expectStatus(page, "RESUBMITTED");
  });

  await test.step("officer sees the resubmission and the revision diff", async () => {
    await loginAs(page, USERS.gov);
    await page.goto(`/officer/applications/${app.id}`);
    await expectStatus(page, "RESUBMITTED");
    const diff = page.getByTestId("revision-diff");
    await expect(diff).toBeVisible();
    await expect(diff).toContainText("12,000");
    await expect(diff).toContainText("1,20,000");

    const view = await call<{ openItems: unknown[]; reviews: { items: { resolvedAt: string | null }[] }[] }>(page, "GET", `/api/applications/${app.id}`);
    expect(view.openItems).toHaveLength(0);
    expect(view.reviews.flatMap((review) => review.items).every((item) => item.resolvedAt)).toBeTruthy();
  });
});
