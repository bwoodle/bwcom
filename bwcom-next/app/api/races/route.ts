import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { docClient, RACES_TABLE_NAME as TABLE_NAME } from "@/lib/dynamodb";
import { createRace, fetchRacePage, updateRaces } from "@/lib/race-repository";
import {
  isAdminSession,
  validateRaceBatchUpdateRequest,
  validateRaceCreateRequest,
} from "@/lib/races";
import {
  decodeCursor,
  encodeCursor,
  parseLimit,
  PUBLIC_CACHE_HEADERS,
  rateLimitPublicRequest,
} from "@/lib/public-api-guards";
import type {
  RaceBatchUpdateResponse,
  RaceCreateResponse,
} from "@/types/races";

/**
 * GET /api/races — Return all race results as a flat list, newest first.
 * Public endpoint (no auth required).
 */
export async function GET(request: Request) {
  const limited = rateLimitPublicRequest(request, "races-get", 60);
  if (limited) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"), 500, 1000);
  const cursor = decodeCursor(searchParams.get("cursor"));

  try {
    const result = await fetchRacePage({
      client: docClient,
      tableName: TABLE_NAME,
      limit,
      cursor,
    });

    return Response.json(
      {
        races: result.races,
        nextCursor: encodeCursor(result.lastEvaluatedKey),
      },
      { headers: PUBLIC_CACHE_HEADERS },
    );
  } catch (err) {
    console.error("Failed to fetch race data:", err);
    return Response.json(
      { error: "Failed to fetch race data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateRaceCreateRequest(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  try {
    const entry = await createRace({
      client: docClient,
      tableName: TABLE_NAME,
      request: validation.value,
    });

    return Response.json({
      success: true,
      entry,
    } satisfies RaceCreateResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create race";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateRaceBatchUpdateRequest(body);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const result = await updateRaces({
    client: docClient,
    tableName: TABLE_NAME,
    updates: validation.value.updates,
  });
  return Response.json(result satisfies RaceBatchUpdateResponse);
}
