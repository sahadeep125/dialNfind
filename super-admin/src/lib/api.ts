import { API_URL } from "./config";

const TOKEN_KEY = "dnf_admin_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("accept", "application/json");
  if (json !== undefined) headers.set("content-type", "application/json");
  const token = tokenStore.get();
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event("dnf:logout"));
    }
    throw new ApiError(res.status, body?.error?.message ?? "Something went wrong");
  }
  return body as T;
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

/**
 * Downloads a CSV export (GET /admin/export/:entity) with the current list filters. The file is
 * fetched with the bearer token, then handed to the browser as a download.
 */
export async function downloadCsv(entity: string, filters: Record<string, string> = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && k !== "page" && k !== "tab"));
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}/admin/export/${entity}${params.size ? `?${params}` : ""}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error?.message ?? "Could not download the file");
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? `dialnfind-${entity}.csv`;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
