import type { DocumentKind } from "@/lib/types";

export async function analyseDocument(document: {
  kind: DocumentKind;
  fileName: string;
  size: number;
}): Promise<void> {
  try {
    await fetch("/api/documents/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document),
    });
  } catch {
    // Upload still counts on this device. Reading the document comes later.
  }
}
