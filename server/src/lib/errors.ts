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
export const notFound = (message = "Not found") => new HttpError(404, message, "not_found");
export const conflict = (message: string) => new HttpError(409, message, "conflict");
export const notConfigured = (message: string) => new HttpError(501, message, "not_configured");
