import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptKey, encryptKey, keyHint, verifyKey } from "@/lib/server/ai-keys";

afterEach(() => vi.unstubAllGlobals());

describe("API key encryption", () => {
  it("round-trips and never repeats a ciphertext", () => {
    const a = encryptKey("AIzaSyExampleKey1234", "secret-one");
    const b = encryptKey("AIzaSyExampleKey1234", "secret-one");
    expect(a).not.toBe(b);
    expect(a.startsWith("v1.")).toBe(true);
    expect(a).not.toContain("AIzaSyExampleKey1234");
    expect(decryptKey(a, "secret-one")).toBe("AIzaSyExampleKey1234");
    expect(decryptKey(b, "secret-one")).toBe("AIzaSyExampleKey1234");
  });

  it("rejects another secret and tampering", () => {
    const a = encryptKey("AIzaSyExampleKey1234", "secret-one");
    expect(() => decryptKey(a, "secret-two")).toThrow();
    const parts = a.split(".");
    const ct = Buffer.from(parts[3], "base64url");
    ct[0] ^= 1;
    parts[3] = ct.toString("base64url");
    expect(() => decryptKey(parts.join("."), "secret-one")).toThrow();
  });

  it("shows only the last four characters", () => {
    expect(keyHint("AIzaSyExampleKey1234")).toBe("1234");
    expect(keyHint("  ab  ")).toBe("ab");
  });
});

describe("verifyKey", () => {
  it("accepts a key Gemini accepts and rejects one it refuses", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen.push(new Headers(init.headers).get("x-goog-api-key") ?? "");
      expect(url).not.toContain("good-key");
      return new Response("{}", { status: url && seen.at(-1) === "good-key" ? 200 : 400 });
    });
    await expect(verifyKey("gemini", "good-key")).resolves.toBeUndefined();
    await expect(verifyKey("gemini", "bad-key")).rejects.toThrow("API 키가 올바르지 않습니다.");
    expect(seen).toEqual(["good-key", "bad-key"]);
  });

  it("says so when the provider cannot be reached", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await expect(verifyKey("gemini", "any")).rejects.toThrow("키를 확인하지 못했습니다");
  });

  it("refuses providers that are not open yet", async () => {
    await expect(verifyKey("openai", "sk-x")).rejects.toThrow("아직 쓸 수 없는");
  });
});
