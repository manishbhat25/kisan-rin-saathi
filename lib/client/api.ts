export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: {
      fieldErrors?: Record<string, string[]>;
      formErrors?: string[];
      missingDocuments?: string[];
      unresolvedItems?: { id: string; message: string }[];
      [key: string]: unknown;
    },
  ) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? (options.body || options.form ? "POST" : "GET"),
      headers: options.form ? undefined : options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(0, "NETWORK", "Could not reach the server. Check your connection and try again. Nothing was saved.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? "Something went wrong. Please try again.",
      error?.details,
    );
  }
  return payload?.data as T;
}

export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
  );
}
