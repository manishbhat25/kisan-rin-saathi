// Runs the ML virtual environment's Python interpreter on any OS.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const candidates = [
  path.join("ml", ".venv", "Scripts", "python.exe"),
  path.join("ml", ".venv", "bin", "python"),
];
const python = candidates.find((candidate) => existsSync(candidate)) ?? "python";

const child = spawn(python, process.argv.slice(2), { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
