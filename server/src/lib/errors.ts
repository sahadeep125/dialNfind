export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, "bad_request", details);
export const unauthorized = (message = "Authentication required") => new HttpError(401, message, "unauthorized");
export const forbidden = (message = "You do not have access to this resource") => new HttpError(403, message, "forbidden");
/** Signed in but the email address is not confirmed yet. Apps open their "enter the code" screen on this code. */
export const emailUnverified = () => new HttpError(403, "Confirm your email address to continue", "email_unverified");
export const notFound =(message = "Not found") => new HttpError(404, message, "not_found");
export const conflict = (message: string) => new HttpError(409, message, "conflict");
export const notConfigured = (message: string) => new HttpError(501, message, "not_configured");
/** The provider's plan does not include this feature. Apps open their upgrade screen on this code. */
export const upgradeRequired = (message: string, entitlement: string, feature: string) =>
  new HttpError(402, message, "upgrade_required", { entitlement, feature });
