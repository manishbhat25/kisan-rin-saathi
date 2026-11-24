// Recreates a throwaway SQLite database (test or e2e) by deleting the file and applying migrations.
// Refuses to touch anything that is not a SQLite file inside prisma/.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "";
const match = /^file:\.\/([\w.-]+\.db)$/.exec(url);
if (!match || (match[1] === "dev.db" && !process.argv.includes("--allow-dev"))) {
  console.error(`fresh-db only resets throwaway SQLite files in prisma/ (got "${url}")`);
  process.exit(1);
}

const file = path.join("prisma", match[1]);
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  if (existsSync(file + suffix)) rmSync(file + suffix);
}
const prisma = path.resolve("node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
execSync(`"${prisma}" migrate deploy`, { stdio: process.env.QUIET ? "ignore" : "inherit", env: process.env });
if (process.argv.includes("--seed")) {
  const tsx = path.resolve("node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
  execSync(`"${tsx}" prisma/seed.ts`, { stdio: "inherit", env: process.env });
}
