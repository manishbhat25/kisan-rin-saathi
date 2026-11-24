// Starts an isolated production server for Playwright: its own SQLite file, upload folder,
// build directory and port, so it never touches the development database.
// Flags: --no-reset keeps the existing e2e database, --no-build reuses the last build.
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const port = process.env.E2E_PORT || "3100";
Object.assign(process.env, {
  DATABASE_URL: "file:./e2e.db",
  UPLOAD_DIR: "storage/e2e-uploads",
  NEXT_DIST_DIR: ".next-e2e",
  INSECURE_COOKIES: "1",
});
const bin = (name) => `"${path.resolve("node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name)}"`;
const run = (command) => execSync(command, { stdio: "inherit", env: process.env });

if (!process.argv.includes("--no-reset")) {
  rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
  run("node scripts/fresh-db.mjs --seed");
}
if (!process.argv.includes("--no-build")) run(`${bin("next")} build`);

const server = spawn(`${bin("next")} start -p ${port}`, { stdio: "inherit", shell: true, env: process.env });
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
