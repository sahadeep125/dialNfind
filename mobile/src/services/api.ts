import { API_URL } from "@/constants/config";
import type { ApiErrorBody } from "@/types";
import { reportError } from "@/services/monitoring";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Record<string, string> = {},
    public code?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  token?: string | null;
}

let tokenGetter: () => string | null = () => null;
let onUnauthorized: () => void = () => undefined;
let onUnverified: () => void = () => undefined;

/** Lets the auth store supply the token and react to expired sessions without a circular import. */
export function configureApi(options: {
  getToken: () => string | null;
  onUnauthorized: () => void;
  /** The server says the email address is not confirmed yet; the app shows the code screen. */
  onUnverified: () => void;
}): void {
  tokenGetter = options.getToken;
  onUnauthorized = options.onUnauthorized;
  onUnverified = options.onUnverified;
}

export function toQuery(query: Query): string {
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `?${params.join("&")}` : "";
}

/** JSON request to the DialNFind API. Throws ApiError with the server's message on failure. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = options.token === undefined ? tokenGetter() : options.token;
  const headers: Record<string, string> = { accept: "application/json" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}${options.query ? toQuery(options.query) : ""}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error: unknown) {
    console.error("[api] Network error", path, error);
    throw new ApiError(0, "Could not reach DialNFind. Check your connection and try again.");
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = (json ?? {}) as ApiErrorBody;
    if (res.status === 401 && token) onUnauthorized();
    if (res.status === 403 && body.error?.code === "email_unverified") onUnverified();
    const details = body.error?.details;
    // Validation errors carry a list of fields; other errors may carry an object (e.g. retryAfter).
    const fieldErrors = Array.isArray(details) ? Object.fromEntries(details.map((d) => [d.path, d.message])) : {};
    const error = new ApiError(
      res.status,
      body.error?.message ?? "Something went wrong. Please try again.",
      fieldErrors,
      body.error?.code,
      Array.isArray(details) ? undefined : details,
    );
    // Server errors are bugs worth a look; 4xx answers are expected (wrong password, validation).
    if (res.status >= 500) reportError(error, { path, status: res.status });
    throw error;
  }
  return json as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
