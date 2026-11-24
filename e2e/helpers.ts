import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Demo@1234";
export const USERS = {
  farmer: "farmer@demo.in",
  farmer2: "farmer2@demo.in",
  farmer3: "farmer3@demo.in",
  gov: "gov.officer@demo.in",
  bank: "bank.officer@demo.in",
  operator: "operator@demo.in",
} as const;

const PDF = Buffer.from("%PDF-1.4\n% synthetic demo document for automated tests\n%%EOF\n");

export function pdfFile(name = "sample.pdf") {
  return { name, mimeType: "application/pdf", buffer: PDF };
}

/** Signs in through the API; the session cookie is shared with the page's browser context. */
export async function loginAs(page: Page, email: string) {
  await page.context().clearCookies();
  const res = await page.request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  expect(res.ok(), `login as ${email}`).toBeTruthy();
}

export async function call<T = Record<string, unknown>>(page: Page, method: string, url: string, data?: unknown): Promise<T> {
  const res = await page.request.fetch(url, { method, data });
  const json = await res.json().catch(() => null);
  if (!res.ok()) throw new Error(`${method} ${url} -> ${res.status()} ${JSON.stringify(json)}`);
  return json?.data as T;
}

type Ref = { id: string; version: number; status: string; reference?: string };

export const GOV_DETAILS = {
  fullName: "Ramesh Patel",
  age: 42,
  stateCode: "GJ",
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

/** Creates and submits an application as the signed-in farmer (setup for journeys that test later steps). */
export async function submitViaApi(page: Page, route: "GOVERNMENT" | "BANK", details: Record<string, unknown>, docs: string[]) {
  const app = await call<Ref>(page, "POST", "/api/applications", { route, clientRequestId: randomUUID(), details });
  for (const docType of docs) {
    const res = await page.request.post(`/api/applications/${app.id}/documents`, { multipart: { docType, file: pdfFile(`${docType}.pdf`) } });
    expect(res.ok(), `upload ${docType}`).toBeTruthy();
  }
  return call<Ref>(page, "POST", `/api/applications/${app.id}/submit`, { expectedVersion: app.version });
}

export async function getView(page: Page, id: string) {
  return call<{ id: string; version: number; status: string; reference: string; actions: string[] }>(page, "GET", `/api/applications/${id}`);
}

/** Moves a submitted application to UNDER_REVIEW and runs the model, as the signed-in officer. */
export async function reviewAndAssess(page: Page, id: string) {
  const view = await getView(page, id);
  const started = await call<Ref>(page, "POST", `/api/applications/${id}/review/start`, { expectedVersion: view.version });
  return call<Ref & { assessment: { outcome: string } }>(page, "POST", `/api/applications/${id}/assessments`, { expectedVersion: started.version });
}

/** Fills one form field by its key, whatever kind of control it is. */
export async function fillField(page: Page, key: string, value: string | number | boolean) {
  if (typeof value === "boolean") {
    await page.locator(`input[type="radio"][name="${key}"][value="${value}"]`).check();
    return;
  }
  const control = page.locator(`#f-${key}`);
  const tag = await control.evaluate((el) => el.tagName);
  if (tag === "SELECT") await control.selectOption(String(value));
  else await control.fill(String(value));
}

/** Fills the current form step with whichever of the given values have a control on screen, then continues. */
export async function fillStepAndContinue(page: Page, values: Record<string, string | number | boolean>, expectedNextStep: number) {
  for (const [key, value] of Object.entries(values)) {
    const present = typeof value === "boolean" ? page.locator(`input[name="${key}"]`) : page.locator(`#f-${key}`);
    if ((await present.count()) > 0) await fillField(page, key, value);
  }
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`^Step ${expectedNextStep} of 5`) })).toBeVisible();
}

export async function uploadInForm(page: Page, docType: string) {
  await page.getByTestId(`upload-${docType}`).setInputFiles(pdfFile(`${docType.toLowerCase()}.pdf`));
  await expect(page.getByTestId(`doc-${docType}`)).toBeVisible();
}

export function idFromUrl(page: Page): string {
  const match = /applications\/([^/?#]+)/.exec(page.url());
  if (!match) throw new Error(`No application id in ${page.url()}`);
  return match[1];
}

export async function expectStatus(page: Page, status: string) {
  await expect(page.locator("main [data-status]").first()).toHaveAttribute("data-status", status);
}
