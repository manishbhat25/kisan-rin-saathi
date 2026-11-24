import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { readStoredFile, saveFile } from "@/server/storage";
import { pdf } from "../helpers";

describe("database storage driver", () => {
  afterEach(() => {
    delete process.env.STORAGE_DRIVER;
  });

  it("stores file bytes in document_blobs and reads them back unchanged", async () => {
    process.env.STORAGE_DRIVER = "database";
    const buffer = Buffer.from(await pdf().arrayBuffer());
    const { storedName, sha256 } = await saveFile(buffer, ".pdf");
    expect(sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await prisma.documentBlob.count({ where: { storedName } })).toBe(1);
    expect((await readStoredFile(storedName)).equals(buffer)).toBe(true);
  });

  it("fails for an unknown file instead of falling back to disk", async () => {
    process.env.STORAGE_DRIVER = "database";
    await expect(readStoredFile("00000000-0000-0000-0000-000000000000.pdf")).rejects.toThrow();
  });
});
