// Runs a command with local defaults for variables that may be blank in .env.
// Values already present in the environment always win.
import { spawn } from "node:child_process";
import path from "node:path";

const binDir = path.resolve("node_modules", ".bin");
const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
process.env[pathKey] = `${binDir}${path.delimiter}${process.env[pathKey] ?? ""}`;

const args = process.argv.slice(2);
const testMode = args[0] === "--test";
if (testMode) args.shift();

if (testMode) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "file:./test.db";
  process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || "storage/test-uploads";
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

if (args.length === 0) {
  console.error("Usage: node scripts/env.mjs [--test] <command> [...args]");
  process.exit(1);
}

const child = spawn(args.join(" "), { stdio: "inherit", shell: true, env: process.env });
child.on("exit", (code) => process.exit(code ?? 1));
