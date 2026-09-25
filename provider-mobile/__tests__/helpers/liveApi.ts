/// <reference types="node" />
import { execFileSync } from "node:child_process";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface CurlResult {
  status: number;
  body: string;
}

/**
 * Calls the running API synchronously with curl. expo-router's renderRouter switches Jest to fake
 * timers, so real network IO would never get a chance to finish inside waitFor; a synchronous call
 * keeps the app's requests real without fighting the fake clock.
 */
export function curl(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): CurlResult {
  const args = ["-s", "-X", init.method ?? "GET", "-w", "\n%{http_code}"];
  for (const [k, v] of Object.entries(init.headers ?? {})) args.push("-H", `${k}: ${v}`);
  if (init.body) args.push("--data-binary", init.body);
  args.push(url);
  const out = execFileSync("curl", args, { encoding: "utf8" });
  const split = out.lastIndexOf("\n");
  return { status: Number(out.slice(split + 1)), body: out.slice(0, split) };
}

export function apiGet<T>(path: string): T {
  return JSON.parse(curl(`${API_URL}${path}`).body) as T;
}

/** A fetch replacement that answers from the live API. */
export function liveFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { status, body } = curl(String(input), {
    method: init.method,
    headers: init.headers as Record<string, string> | undefined,
    body: typeof init.body === "string" ? init.body : undefined,
  });
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async (): Promise<unknown> => JSON.parse(body),
    text: async (): Promise<string> => body,
  };
  return Promise.resolve(response as unknown as Response);
}

export function isApiUp(): boolean {
  try {
    return curl(`${API_URL}/health`).status === 200;
  } catch {
    return false;
  }
}
