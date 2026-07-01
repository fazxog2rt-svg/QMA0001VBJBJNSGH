import { API_V1 } from "./env";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type QueryValue = string | number | boolean | undefined | null;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = path.startsWith("http") ? path : `${API_V1}${path.startsWith("/") ? "" : "/"}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  options?: {
    body?: unknown;
    query?: Record<string, QueryValue>;
    signal?: AbortSignal;
    headers?: Record<string, string>;
  },
): Promise<T> {
  const url = buildUrl(path, options?.query);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      signal: options?.signal,
      headers: {
        ...(options?.body !== undefined ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
        // Required by the API's CSRF guard on every state-changing request
        // (see apps/api middleware/auth.ts csrfHeaderGuard) — cross-site
        // <form>/<img> requests can't set custom headers, so this proves
        // the request came from our own JS, not a forged cross-site one.
        "X-Requested-With": "XMLHttpRequest",
        ...options?.headers,
      },
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(0, "NETWORK_ERROR", (err as Error).message ?? "Network request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const body = payload as ApiErrorBody | undefined;
    throw new ApiError(
      res.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? res.statusText ?? "Request failed",
      body?.error?.details,
    );
  }

  return payload as T;
}

export function apiGet<T>(
  path: string,
  query?: Record<string, QueryValue>,
  signal?: AbortSignal,
): Promise<T> {
  return request<T>("GET", path, { query, signal });
}

export function apiPost<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>("POST", path, { body, signal });
}

export function apiPatch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>("PATCH", path, { body, signal });
}

export function apiPut<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>("PUT", path, { body, signal });
}

export function apiDelete<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>("DELETE", path, { signal });
}
