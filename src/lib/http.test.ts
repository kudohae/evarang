import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "@/lib/http";

afterEach(() => vi.unstubAllGlobals());

const stub = (status: number, body: string, type = "application/json") =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": type } })));

describe("request", () => {
  it("parses the error shape", async () => {
    stub(429, JSON.stringify({ error: "x", kind: "quota", remaining: 0, resetAt: "2026-10-14T15:00:00.000Z" }));
    const e = (await request("/api/a").catch((err: unknown) => err)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(429);
    expect(e.kind).toBe("quota");
    expect(e.remaining).toBe(0);
    expect(e.resetAt).toBe("2026-10-14T15:00:00.000Z");
    expect(e.message).toBe("x");
  });

  it("names the status when the body is not JSON", async () => {
    stub(500, "oops", "text/plain");
    const e = (await request("/api/a").catch((err: unknown) => err)) as ApiError;
    expect(e.message).toBe("요청에 실패했습니다 (500)");
  });

  it("returns parsed JSON and sends json bodies", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect(await request<{ ok: number }>("/api/a", { method: "PUT", json: { a: 1 } })).toEqual({ ok: 1 });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.body).toBe('{"a":1}');
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
  });
});
