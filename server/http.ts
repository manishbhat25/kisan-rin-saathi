import { Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";
import { ModelArtifactError } from "./ml/model";

type Handler<P> = (req: NextRequest, params: P) => Promise<unknown>;

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Wraps a route handler with consistent JSON responses, a same-origin check for
 * mutations, and safe error messages (internal errors are logged, never returned).
 */
export function api<P = Record<string, string>>(fn: Handler<P>) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      if (req.method !== "GET" && !sameOrigin(req)) {
        return errorResponse(403, "BAD_ORIGIN", "Request blocked: invalid origin.");
      }
      const params = ctx?.params ? await ctx.params : ({} as P);
      const result = await fn(req, params);
      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null });
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error.status, error.code, error.message, error.details);
      if (error instanceof ZodError) {
        return errorResponse(400, "VALIDATION_ERROR", "Some details need fixing.", error.flatten());
      }
      if (error instanceof ModelArtifactError) {
        return errorResponse(503, "MODEL_UNAVAILABLE", "The eligibility model is unavailable right now. Please try again later.");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") return errorResponse(409, "DUPLICATE", "This action was already recorded.");
        if (error.code === "P2025") return errorResponse(404, "NOT_FOUND", "Not found.");
      }
      if (error instanceof SyntaxError) return errorResponse(400, "BAD_JSON", "The request body is not valid JSON.");
      console.error(`[api] ${req.method} ${req.nextUrl.pathname} failed`, error instanceof Error ? error.message : error);
      return errorResponse(500, "INTERNAL", "Something went wrong on our side. Your data has not been changed.");
    }
  };
}

/**
 * Client address for rate limiting. `x-forwarded-for` is client-controlled unless a trusted proxy
 * overwrites it, so it is only used when TRUST_PROXY=1.
 */
export function clientIp(req: NextRequest): string {
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  }
  return "direct";
}

export async function body(req: NextRequest): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(415, "UNSUPPORTED_MEDIA", "Send JSON.");
  return req.json();
}
