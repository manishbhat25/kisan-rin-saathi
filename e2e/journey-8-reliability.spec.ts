import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { GOV_DETAILS, USERS, call, getView, loginAs, reviewAndAssess, submitViaApi } from "./helpers";

test.describe("Journey 8: reliability under retries, races and bad input", () => {
  test("health check reports the database and model are ready", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const { data } = await res.json();
    expect(data).toMatchObject({ status: "ok", database: "ok", models: "ok" });
  });

  test("retrying create with the same request id does not create a duplicate", async ({ page }) => {
    await loginAs(page, USERS.farmer3);
    const clientRequestId = randomUUID();
    const [a, b] = await Promise.all([
      call<{ id: string }>(page, "POST", "/api/applications", { route: "BANK", clientRequestId }),
      page.request.post("/api/applications", { data: { route: "BANK", clientRequestId } }).then(async (res) => (await res.json()).data),
    ]);
    const c = await call<{ id: string }>(page, "POST", "/api/applications", { route: "BANK", clientRequestId });
    expect(c.id).toBe(a.id);
    if (b) expect(b.id).toBe(a.id);
  });

  test("two officers deciding at once: exactly one decision is recorded", async ({ page, browser }) => {
    await loginAs(page, USERS.farmer3);
    const app = await submitViaApi(page, "GOVERNMENT", { ...GOV_DETAILS, fullName: "Harpreet Singh" }, ["IDENTITY_PROOF"]);
    await loginAs(page, USERS.gov);
    const assessed = await reviewAndAssess(page, app.id);

    const second = await browser.newPage();
    await loginAs(second, USERS.gov);
    const body = (decision: string) => ({ expectedVersion: assessed.version, decision, reason: "Concurrent decision test reason." });
    const results = await Promise.all([
      page.request.post(`/api/applications/${app.id}/decision`, { data: body("REJECTED") }),
      second.request.post(`/api/applications/${app.id}/decision`, { data: body("ESCALATED") }),
    ]);
    const statuses = results.map((res) => res.status()).sort();
    expect(statuses).toEqual([200, 409]);
    const view = await getView(page, app.id);
    expect(["REJECTED", "ESCALATED"]).toContain(view.status);
    await second.close();
  });

  test("uploads are checked by content and size, not just the file name", async ({ page }) => {
    await loginAs(page, USERS.farmer3);
    const app = await call<{ id: string }>(page, "POST", "/api/applications", { route: "GOVERNMENT", clientRequestId: randomUUID() });
    const disguised = await page.request.post(`/api/applications/${app.id}/documents`, {
      multipart: { docType: "IDENTITY_PROOF", file: { name: "id.pdf", mimeType: "application/pdf", buffer: Buffer.from("MZ not really a pdf") } },
    });
    expect(disguised.status()).toBe(400);
    const tooBig = await page.request.post(`/api/applications/${app.id}/documents`, {
      multipart: { docType: "IDENTITY_PROOF", file: { name: "big.pdf", mimeType: "application/pdf", buffer: Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(6 * 1024 * 1024)]) } },
    });
    expect(tooBig.status()).toBe(400);
  });

  test("submitting with missing information is blocked with clear reasons", async ({ page }) => {
    await loginAs(page, USERS.farmer3);
    const app = await call<{ id: string; version: number }>(page, "POST", "/api/applications", { route: "GOVERNMENT", clientRequestId: randomUUID() });
    const res = await page.request.post(`/api/applications/${app.id}/submit`, { data: { expectedVersion: app.version } });
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error.message).toBeTruthy();
    expect(JSON.stringify(json)).not.toMatch(/prisma|stack|at \w+ \(/i);
  });

  test("a saved draft survives a page reload", async ({ page }) => {
    await loginAs(page, USERS.farmer3);
    const app = await call<{ id: string }>(page, "POST", "/api/applications", { route: "GOVERNMENT", clientRequestId: randomUUID() });
    await page.goto(`/farmer/applications/${app.id}/edit`);
    await page.locator("#f-district").fill("Sangrur");
    await page.getByRole("button", { name: /save draft/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /saved/i })).toBeVisible();
    await page.reload();
    await expect(page.locator("#f-district")).toHaveValue("Sangrur");
  });

  test("malformed JSON gets a safe error", async ({ page }) => {
    await loginAs(page, USERS.farmer3);
    const res = await page.request.post("/api/applications", { headers: { "Content-Type": "application/json" }, data: Buffer.from("{not json") });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_JSON");
  });
});
