/*
  One error shape for every API: { error, kind?, retryAfter?, remaining?, resetAt? }.
  The browser calls APIs through `request`, which turns any non-2xx answer into an ApiError.
*/

export type ApiErrorKind = "rate" | "daily" | "quota" | "auth" | "invalid" | "conflict";

export class ApiError extends Error {
  readonly status: number;
  readonly kind?: ApiErrorKind;
  readonly retryAfter?: number;
  readonly remaining?: number;
  readonly resetAt?: string;
  /** The whole response body, for callers that need more than the shared fields (e.g. a conflict's server copy). */
  readonly body: unknown;

  constructor(status: number, body: Record<string, unknown> | null) {
    super(typeof body?.error === "string" ? body.error : `요청에 실패했습니다 (${status})`);
    this.status = status;
    this.body = body;
    if (body) {
      this.kind = body.kind as ApiErrorKind | undefined;
      this.retryAfter = typeof body.retryAfter === "number" ? body.retryAfter : undefined;
      this.remaining = typeof body.remaining === "number" ? body.remaining : undefined;
      this.resetAt = typeof body.resetAt === "string" ? body.resetAt : undefined;
    }
  }
}

export async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const h = new Headers(headers);
  if (json !== undefined) h.set("content-type", "application/json");
  const res = await fetch(path, { ...rest, headers: h, body: json !== undefined ? JSON.stringify(json) : rest.body });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
