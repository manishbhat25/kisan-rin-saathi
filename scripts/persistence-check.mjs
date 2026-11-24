// Journey 7: data persists across a server restart.
// Starts the isolated e2e server, creates a draft with an uploaded document, stops the server,
// starts it again on the same database, and checks the draft, its version and the file are intact.
// Requires a previous e2e build (npx playwright test, or node scripts/e2e-server.mjs once).
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const port = process.env.E2E_PORT || "3101";
const base = `http://localhost:${port}`;

function startServer() {
  const child = spawn(process.execPath, ["scripts/e2e-server.mjs", "--no-build", "--no-reset"], {
    env: { ...process.env, E2E_PORT: port },
    stdio: "ignore",
  });
  return child;
}

async function waitForHealth(timeoutMs = 60_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Server did not become healthy");
}

async function stopServer(child) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    try {
      await fetch(`${base}/api/health`);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Server did not stop");
}

async function login() {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "farmer@demo.in", password: "Demo@1234" }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return res.headers.get("set-cookie").split(";")[0];
}

async function json(path, cookie, init = {}) {
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...(init.headers ?? {}), cookie } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body.data;
}

const results = [];
const check = (name, ok) => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

let server = startServer();
try {
  await waitForHealth();
  let cookie = await login();
  const district = `Persist-${randomUUID().slice(0, 6)}`;
  const created = await json("/api/applications", cookie, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ route: "GOVERNMENT", clientRequestId: randomUUID() }),
  });
  const saved = await json(`/api/applications/${created.id}`, cookie, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedVersion: created.version, details: { district, landholdingAcres: 3.25 } }),
  });
  const form = new FormData();
  form.set("docType", "IDENTITY_PROOF");
  form.set("file", new File([Buffer.from("%PDF-1.4\n% persistence check\n%%EOF\n")], "identity.pdf", { type: "application/pdf" }));
  const doc = await json(`/api/applications/${created.id}/documents`, cookie, { method: "POST", body: form });
  const before = await json(`/api/applications/${created.id}`, cookie);
  check("draft saved before restart", before.details.district === district && saved.version > created.version);

  await stopServer(server);
  check("server stopped", true);
  server = startServer();
  await waitForHealth();
  check("server restarted", true);

  cookie = await login();
  const view = await json(`/api/applications/${created.id}`, cookie);
  check("draft still exists with the same reference", view.reference === created.reference);
  check("saved details survived", view.details.district === district && view.details.landholdingAcres === 3.25);
  check("version number survived", view.version === before.version);
  check("document record survived", view.documents.some((item) => item.id === doc.id));
  const file = await fetch(`${base}/api/documents/${doc.id}`, { headers: { cookie } });
  const text = Buffer.from(await file.arrayBuffer()).toString();
  check("uploaded file is still downloadable", file.ok && text.startsWith("%PDF"));
} catch (error) {
  check(`unexpected error: ${error instanceof Error ? error.message : error}`, false);
} finally {
  await stopServer(server).catch(() => undefined);
}

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
