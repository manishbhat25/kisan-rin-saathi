export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const unauthorized = () => new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
export const forbidden = (message = "You do not have permission to do this.") =>
  new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found, or you do not have access to it.") =>
  new ApiError(404, "NOT_FOUND", message);
export const conflict = (code: string, message: string, details?: Record<string, unknown>) =>
  new ApiError(409, code, message, details);
export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new ApiError(400, "VALIDATION_ERROR", message, details);
export const staleVersion = () =>
  conflict(
    "STALE_VERSION",
    "This application was changed by someone else, or your action was already recorded. Reload to see the latest version.",
  );
