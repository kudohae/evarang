import type { ApiErrorKind } from "@/lib/http";

type Extra = { kind?: ApiErrorKind; retryAfter?: number; remaining?: number; resetAt?: string; body?: Record<string, unknown> };

/** The shared error response: `{ error, kind?, retryAfter?, remaining?, resetAt? }`, plus any extra body fields. */
export function apiError(status: number, error: string, extra: Extra = {}): Response {
  const { body, ...fields } = extra;
  return Response.json({ ...body, error, ...fields }, { status });
}
