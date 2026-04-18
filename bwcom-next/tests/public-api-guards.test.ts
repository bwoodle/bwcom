import { describe, expect, it } from "vitest";

import {
  decodeCursor,
  encodeCursor,
  parseLimit,
  rateLimitPublicRequest,
} from "../lib/public-api-guards";

function createRequest(headers: HeadersInit = {}): Request {
  return new Request("https://example.com/api/test", { headers });
}

describe("parseLimit", () => {
  it("returns the default when the input is invalid", () => {
    expect(parseLimit("abc", 25, 100)).toBe(25);
    expect(parseLimit(null, 25, 100)).toBe(25);
  });

  it("clamps values to the configured bounds", () => {
    expect(parseLimit("0", 25, 100)).toBe(1);
    expect(parseLimit("500", 25, 100)).toBe(100);
    expect(parseLimit("42", 25, 100)).toBe(42);
  });
});

describe("cursor helpers", () => {
  it("round-trips cursor values", () => {
    const cursor = { pk: "media", sk: "2026-04-18" };

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("returns nullish fallbacks for empty and invalid values", () => {
    expect(encodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeUndefined();
    expect(decodeCursor("not-base64")).toBeUndefined();
  });
});

describe("rateLimitPublicRequest", () => {
  it("allows requests until the limit is exceeded for a client", () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    const request = createRequest({ "cf-connecting-ip": "203.0.113.10" });

    expect(
      rateLimitPublicRequest(request, "media", 2, { now: 1_000, store }),
    ).toBeNull();
    expect(
      rateLimitPublicRequest(request, "media", 2, { now: 1_500, store }),
    ).toBeNull();

    const limited = rateLimitPublicRequest(request, "media", 2, {
      now: 2_000,
      store,
    });

    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("Retry-After")).toBe("59");
  });

  it("uses the first forwarded IP and resets after the time window", async () => {
    const store = new Map<string, { count: number; resetAt: number }>();
    const request = createRequest({
      "x-forwarded-for": "198.51.100.1, 10.0.0.10",
    });

    expect(
      rateLimitPublicRequest(request, "races", 1, { now: 10_000, store }),
    ).toBeNull();

    const blocked = rateLimitPublicRequest(request, "races", 1, {
      now: 20_000,
      store,
    });
    expect(blocked?.status).toBe(429);
    await expect(blocked?.json()).resolves.toEqual({
      error: "Rate limit exceeded",
    });

    expect(
      rateLimitPublicRequest(request, "races", 1, { now: 70_001, store }),
    ).toBeNull();
  });
});
