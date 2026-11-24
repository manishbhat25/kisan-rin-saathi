import { expect, test } from "@playwright/test";
import { GOV_DETAILS, PASSWORD, USERS, call, getView, loginAs, reviewAndAssess, submitViaApi } from "./helpers";

test.describe("Journey 6: unauthorised access is blocked", () => {
  let govAppId = "";
  let documentId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAs(page, USERS.farmer);
    const app = await submitViaApi(page, "GOVERNMENT", GOV_DETAILS, ["IDENTITY_PROOF", "LAND_RECORD"]);
    govAppId = app.id;
    const view = await call<{ documents: { id: string }[] }>(page, "GET", `/api/applications/${app.id}`);
    documentId = view.documents[0].id;
    await page.close();
  });

  test("signed-out visitors are sent to sign in and APIs return 401", async ({ page }) => {
    await page.goto("/farmer");
    await expect(page).toHaveURL(/\/login\?next=%2Ffarmer/);
    expect((await page.request.get("/api/applications")).status()).toBe(401);
    expect((await page.request.get(`/api/applications/${govAppId}`)).status()).toBe(401);
  });

  test("wrong password is rejected without revealing which part was wrong", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(USERS.farmer);
    await page.locator("#password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
    await page.locator("#password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/farmer/);
  });

  test("another farmer cannot see the application or its documents", async ({ page }) => {
    await loginAs(page, USERS.farmer2);
    expect((await page.goto(`/farmer/applications/${govAppId}`))?.status()).toBe(404);
    expect((await page.request.get(`/api/applications/${govAppId}`)).status()).toBe(404);
    expect((await page.request.get(`/api/documents/${documentId}`)).status()).toBe(404);
    const patch = await page.request.patch(`/api/applications/${govAppId}`, { data: { expectedVersion: 1, details: { district: "X" } } });
    expect(patch.status()).toBe(404);
  });

  test("a bank officer cannot open a government application", async ({ page }) => {
    await loginAs(page, USERS.bank);
    expect((await page.goto(`/officer/applications/${govAppId}`))?.status()).toBe(404);
    expect((await page.request.get(`/api/applications/${govAppId}`)).status()).toBe(404);
    await page.goto("/officer");
    await expect(page.getByTestId("application-row").filter({ hasText: "GOV-" })).toHaveCount(0);
  });

  test("a farmer cannot use officer pages or actions", async ({ page }) => {
    await loginAs(page, USERS.farmer);
    await page.goto("/officer");
    await expect(page).toHaveURL(/\/farmer/);
    const res = await page.request.post(`/api/applications/${govAppId}/decision`, {
      data: { expectedVersion: 1, decision: "APPROVED", reason: "self approval attempt" },
    });
    expect(res.status()).toBe(403);
  });

  test("cross-site requests and stale versions are refused", async ({ page }) => {
    await loginAs(page, USERS.gov);
    const view = await getView(page, govAppId);
    const crossSite = await page.request.post(`/api/applications/${govAppId}/review/start`, {
      headers: { Origin: "https://attacker.example" },
      data: { expectedVersion: view.version },
    });
    expect(crossSite.status()).toBe(403);

    const assessed = await reviewAndAssess(page, govAppId);
    const stale = await page.request.post(`/api/applications/${govAppId}/decision`, {
      data: { expectedVersion: assessed.version - 1, decision: "REJECTED", reason: "Testing an outdated version." },
    });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).error.code).toBe("STALE_VERSION");
  });

  test("private uploads are not reachable as public files", async ({ page }) => {
    for (const path of ["/storage/", "/uploads/", "/e2e.db", "/prisma/e2e.db", "/.env"]) {
      const res = await page.request.get(path);
      expect(res.status(), path).toBe(404);
    }
  });
});
