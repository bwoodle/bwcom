const WINDOW_MS = 60_000;

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  now?: number;
  store?: Map<string, Bucket>;
};

const buckets = new Map<string, Bucket>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const firstIp = xff.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

export function parseLimit(
  input: string | null,
  defaultLimit: number,
  maxLimit: number,
): number {
  const parsed = Number.parseInt(input ?? "", 10);
  if (!Number.isFinite(parsed)) return defaultLimit;
  return clamp(parsed, 1, maxLimit);
}

export function decodeCursor(
  value: string | null,
): Record<string, unknown> | undefined {
  if (!value) return undefined;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    return parsed;
  } catch {
    return undefined;
  }
}

export function encodeCursor(
  value: Record<string, unknown> | undefined,
): string | null {
  if (!value) return null;
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function rateLimitPublicRequest(
  request: Request,
  routeKey: string,
  maxRequestsPerMinute: number,
  options: RateLimitOptions = {},
): Response | null {
  const ip = getClientIp(request);
  const now = options.now ?? Date.now();
  const store = options.store ?? buckets;
  const key = `${routeKey}:${ip}`;
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  if (existing.count >= maxRequestsPerMinute) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );

    return Response.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  existing.count += 1;
  return null;
}

export const PUBLIC_CACHE_HEADERS = {
  "Cache-Control":
    "public, max-age=30, s-maxage=120, stale-while-revalidate=300",
};
