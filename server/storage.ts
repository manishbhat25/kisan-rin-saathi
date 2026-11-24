import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";
import { badRequest } from "./errors";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: ".pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/png", ext: ".png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: ".jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
];

/** Private storage outside public/, so files are only reachable through the authorized download route. */
export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? path.join("storage", "uploads"));
}

export function detectFile(buffer: Buffer): { mime: string; ext: string } {
  if (buffer.length === 0) throw badRequest("The file is empty.");
  if (buffer.length > MAX_UPLOAD_BYTES) throw badRequest("Files must be 5 MB or smaller.");
  const match = SIGNATURES.find((signature) => signature.test(buffer));
  if (!match) throw badRequest("Upload a PDF, JPG or PNG file.");
  return { mime: match.mime, ext: match.ext };
}

/** "database" keeps file bytes in the document_blobs table, for hosts without a persistent writable disk. */
function storesInDatabase(): boolean {
  return process.env.STORAGE_DRIVER === "database";
}

export async function saveFile(buffer: Buffer, ext: string): Promise<{ storedName: string; sha256: string }> {
  const storedName = `${randomUUID()}${ext}`;
  if (storesInDatabase()) {
    await prisma.documentBlob.create({ data: { storedName, content: new Uint8Array(buffer) } });
  } else {
    await mkdir(uploadDir(), { recursive: true });
    await writeFile(path.join(uploadDir(), storedName), buffer, { flag: "wx" });
  }
  return { storedName, sha256: createHash("sha256").update(buffer).digest("hex") };
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  if (!/^[\w-]+\.(pdf|png|jpg)$/.test(storedName)) throw badRequest("Invalid file reference.");
  if (storesInDatabase()) {
    const blob = await prisma.documentBlob.findUnique({ where: { storedName } });
    if (!blob) throw new Error("Stored file not found.");
    return Buffer.from(blob.content);
  }
  return readFile(path.join(uploadDir(), storedName));
}
