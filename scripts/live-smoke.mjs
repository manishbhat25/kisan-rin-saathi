// Smoke test against a running deployment: node scripts/live-smoke.mjs https://example.vercel.app
// Creates one demo government application (left UNDER_REVIEW) using the seeded demo accounts.
import { randomUUID } from "node:crypto";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "Demo@1234";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function session(email) {
  let cookie = "";
  async function request(method, path, body) {
    const headers = { Origin: base, cookie };
    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + path, { method, headers, body: payload, redirect: "manual" });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    return res;
  }
  const login = await request("POST", "/api/auth/login", { email, password: PASSWORD });
  check(`login ${email}`, login.ok, String(login.status));
  return request;
}

async function data(res) {
  const json = await res.json().catch(() => null);
  return json?.data;
}

const health = await fetch(`${base}/api/health`).then((r) => r.json());
check("health database and models", health?.data?.database === "ok" && health?.data?.models === "ok");

const farmer = await session("farmer@demo.in");
const created = await data(
  await farmer("POST", "/api/applications", {
    route: "GOVERNMENT",
    clientRequestId: randomUUID(),
    details: {
      fullName: "Ramesh Patel", age: 42, stateCode: "GJ", district: "Anand", village: "Bakrol",
      farmerCategory: "OWNER", landholdingAcres: 2.5, cropCategory: "CEREAL", irrigationType: "RAINFED",
      annualAgriIncome: 120000, supportPurpose: "INPUT_SUPPORT", requestedAmount: 40000,
      hasBankAccount: true, priorSchemeDefault: false,
    },
  }),
);
check("farmer creates application", Boolean(created?.id), created?.reference);

const pdf = Buffer.from("%PDF-1.4\n% synthetic demo document for the live smoke test\n%%EOF\n");
let docId;
for (const docType of ["IDENTITY_PROOF", "LAND_RECORD"]) {
  const form = new FormData();
  form.set("docType", docType);
  form.set("file", new Blob([pdf], { type: "application/pdf" }), `${docType.toLowerCase()}.pdf`);
  const res = await farmer("POST", `/api/applications/${created.id}/documents`, form);
  const doc = await data(res);
  docId ??= doc?.id ?? doc?.document?.id;
  check(`upload ${docType}`, res.ok, String(res.status));
}

const view = await data(await farmer("GET", `/api/applications/${created.id}`));
const submitted = await data(await farmer("POST", `/api/applications/${created.id}/submit`, { expectedVersion: view.version }));
check("farmer submits", submitted?.status === "SUBMITTED", submitted?.status);

const afterSubmit = await data(await farmer("GET", `/api/applications/${created.id}`));
docId = afterSubmit?.documents?.[0]?.id ?? docId;
if (docId) {
  const download = await farmer("GET", `/api/documents/${docId}`);
  const bytes = Buffer.from(await download.arrayBuffer());
  check("document download returns the uploaded bytes", download.ok && bytes.equals(pdf), String(download.status));
} else {
  check("document download returns the uploaded bytes", false, "no document id in view");
}

const gov = await session("gov.officer@demo.in");
const govView = await data(await gov("GET", `/api/applications/${created.id}`));
const started = await data(await gov("POST", `/api/applications/${created.id}/review/start`, { expectedVersion: govView.version }));
check("government officer starts review", started?.status === "UNDER_REVIEW", started?.status);
const assessed = await data(await gov("POST", `/api/applications/${created.id}/assessments`, { expectedVersion: started.version }));
check("model assessment runs", Boolean(assessed?.assessment?.outcome), assessed?.assessment?.outcome);

const bank = await session("bank.officer@demo.in");
const hidden = await bank("GET", `/api/applications/${created.id}`);
check("bank officer cannot see a government application", hidden.status === 404, String(hidden.status));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${base}`);
process.exit(failed ? 1 : 0);
