import { execSync } from "node:child_process";

/** Recreates the isolated test database before the suite runs. */
export default function setup() {
  execSync("node scripts/fresh-db.mjs", { stdio: "inherit", env: { ...process.env, QUIET: "1" } });
}
