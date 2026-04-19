import type { Session } from "next-auth";

import type {
  RaceBatchUpdateItem,
  RaceBatchUpdateRequest,
  RaceCreateRequest,
  RaceDraft,
  RaceItem,
  RaceSource,
  RaceValidationState,
} from "@/types/races";

type ValidationSuccess<T> = { ok: true; value: T };
type ValidationFailure = { ok: false; error: string };
type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRaceSource(value: unknown): value is RaceSource {
  return value === "manual" || value === "legacy-spreadsheet";
}

function isValidationState(value: unknown): value is RaceValidationState {
  return value === "staged" || value === "validated";
}

export function isAdminSession(session: Session | null): boolean {
  return Boolean(session?.user?.email && session.user.role === "admin");
}

export function buildRaceSk(isoDate: string, distance: string): string {
  return `${isoDate}#${distance}`;
}

export function extractCalendarDate(sk: string): string {
  return sk.split("#", 1)[0] ?? sk;
}

export function formatDisplayDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function parseRaceDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.includes("??")) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function toRaceItem(item: Record<string, unknown>): RaceItem {
  return {
    yearKey: String(item.yearKey),
    sk: String(item.sk),
    date: String(item.date),
    distance: String(item.distance),
    time: String(item.time),
    vdot: Number(item.vdot),
    name: toOptionalString(item.name),
    comments: toOptionalString(item.comments),
    source: isRaceSource(item.source) ? item.source : undefined,
    importBatchId: toOptionalString(item.importBatchId),
    legacySourceRowId: toOptionalString(item.legacySourceRowId),
    validationState: isValidationState(item.validationState)
      ? item.validationState
      : undefined,
    promotedAt: toOptionalString(item.promotedAt),
    createdAt: String(item.createdAt),
  };
}

export function buildRaceEntryFromCreateRequest(
  request: RaceCreateRequest,
  createdAt: string = new Date().toISOString(),
): RaceItem {
  const isoDate = parseRaceDateInput(request.date);
  if (!isoDate) {
    throw new Error("date must be an exact parseable calendar date");
  }

  const normalizedName = normalizeOptionalText(request.name);
  const normalizedComments = normalizeOptionalText(request.comments);

  return {
    yearKey: isoDate.slice(0, 4),
    sk: buildRaceSk(isoDate, request.distance.trim()),
    date: formatDisplayDate(isoDate),
    distance: request.distance.trim(),
    time: request.time.trim(),
    vdot: request.vdot,
    ...(normalizedName ? { name: normalizedName } : {}),
    ...(normalizedComments ? { comments: normalizedComments } : {}),
    ...(request.source ? { source: request.source } : {}),
    ...(request.importBatchId ? { importBatchId: request.importBatchId } : {}),
    ...(request.legacySourceRowId
      ? { legacySourceRowId: request.legacySourceRowId }
      : {}),
    ...(request.validationState
      ? { validationState: request.validationState }
      : {}),
    createdAt,
  };
}

export function validateRaceCreateRequest(
  body: unknown,
): ValidationResult<RaceCreateRequest> {
  if (!isRecord(body)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const date = typeof body.date === "string" ? body.date.trim() : "";
  const distance =
    typeof body.distance === "string" ? body.distance.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";
  const vdot = body.vdot;

  if (!parseRaceDateInput(date)) {
    return { ok: false, error: "date must be a valid exact calendar date" };
  }
  if (!distance) {
    return { ok: false, error: "distance is required" };
  }
  if (!time) {
    return { ok: false, error: "time is required" };
  }
  if (typeof vdot !== "number" || !Number.isFinite(vdot)) {
    return { ok: false, error: "vdot must be a finite number" };
  }

  const source = isRaceSource(body.source) ? body.source : "manual";
  const validationState = isValidationState(body.validationState)
    ? body.validationState
    : source === "legacy-spreadsheet"
      ? "staged"
      : undefined;
  const normalizedName = normalizeOptionalText(body.name);
  const normalizedComments = normalizeOptionalText(body.comments);

  return {
    ok: true,
    value: {
      date,
      distance,
      time,
      vdot,
      ...(normalizedName ? { name: normalizedName } : {}),
      ...(normalizedComments ? { comments: normalizedComments } : {}),
      source,
      ...(typeof body.importBatchId === "string"
        ? { importBatchId: body.importBatchId }
        : {}),
      ...(typeof body.legacySourceRowId === "string"
        ? { legacySourceRowId: body.legacySourceRowId }
        : {}),
      ...(validationState ? { validationState } : {}),
    },
  };
}

export function validateRaceBatchUpdateRequest(
  body: unknown,
): ValidationResult<RaceBatchUpdateRequest> {
  if (
    !isRecord(body) ||
    !Array.isArray(body.updates) ||
    body.updates.length === 0
  ) {
    return { ok: false, error: "updates must be a non-empty array" };
  }
  if (body.updates.length > 200) {
    return { ok: false, error: "updates cannot exceed 200 items" };
  }

  const updates: RaceBatchUpdateItem[] = [];
  for (const rawUpdate of body.updates) {
    if (!isRecord(rawUpdate)) {
      return { ok: false, error: "Each update must be an object" };
    }
    if (
      typeof rawUpdate.yearKey !== "string" ||
      rawUpdate.yearKey.trim().length === 0
    ) {
      return { ok: false, error: "Each update requires yearKey" };
    }
    if (typeof rawUpdate.sk !== "string" || rawUpdate.sk.trim().length === 0) {
      return { ok: false, error: "Each update requires sk" };
    }

    const update: RaceBatchUpdateItem = {
      yearKey: rawUpdate.yearKey,
      sk: rawUpdate.sk,
    };

    if (typeof rawUpdate.time === "string") {
      const time = rawUpdate.time.trim();
      if (!time) {
        return { ok: false, error: "time cannot be empty" };
      }
      update.time = time;
    }
    if (rawUpdate.vdot !== undefined) {
      if (
        typeof rawUpdate.vdot !== "number" ||
        !Number.isFinite(rawUpdate.vdot)
      ) {
        return { ok: false, error: "vdot must be a finite number" };
      }
      update.vdot = rawUpdate.vdot;
    }
    if (rawUpdate.name !== undefined) {
      if (rawUpdate.name === null) {
        update.name = null;
      } else if (typeof rawUpdate.name === "string") {
        update.name = rawUpdate.name.trim() || null;
      } else {
        return { ok: false, error: "name must be a string or null" };
      }
    }
    if (rawUpdate.comments !== undefined) {
      if (rawUpdate.comments === null) {
        update.comments = null;
      } else if (typeof rawUpdate.comments === "string") {
        update.comments = rawUpdate.comments.trim() || null;
      } else {
        return { ok: false, error: "comments must be a string or null" };
      }
    }
    if (rawUpdate.validationState !== undefined) {
      if (!isValidationState(rawUpdate.validationState)) {
        return {
          ok: false,
          error: "validationState must be staged or validated",
        };
      }
      update.validationState = rawUpdate.validationState;
    }

    if (
      update.time === undefined &&
      update.vdot === undefined &&
      update.name === undefined &&
      update.comments === undefined &&
      update.validationState === undefined
    ) {
      return {
        ok: false,
        error: "Each update must include at least one field",
      };
    }

    updates.push(update);
  }

  return { ok: true, value: { updates } };
}

export function buildRaceUpdateMutation(update: RaceBatchUpdateItem): {
  updateExpression: string;
  expressionAttributeValues?: Record<string, unknown>;
  expressionAttributeNames?: Record<string, string>;
} {
  const sets: string[] = [];
  const removes: string[] = [];
  const values: Record<string, unknown> = {};
  const names: Record<string, string> = {};

  if (update.time !== undefined) {
    sets.push("#time = :time");
    values[":time"] = update.time;
    names["#time"] = "time";
  }
  if (update.vdot !== undefined) {
    sets.push("vdot = :vdot");
    values[":vdot"] = update.vdot;
  }
  if (update.name !== undefined) {
    if (update.name === null) {
      removes.push("name");
    } else {
      sets.push("#name = :name");
      values[":name"] = update.name;
      names["#name"] = "name";
    }
  }
  if (update.comments !== undefined) {
    if (update.comments === null) {
      removes.push("comments");
    } else {
      sets.push("comments = :comments");
      values[":comments"] = update.comments;
    }
  }
  if (update.validationState !== undefined) {
    sets.push("validationState = :validationState");
    values[":validationState"] = update.validationState;
  }

  const clauses: string[] = [];
  if (sets.length > 0) {
    clauses.push(`SET ${sets.join(", ")}`);
  }
  if (removes.length > 0) {
    clauses.push(`REMOVE ${removes.join(", ")}`);
  }

  return {
    updateExpression: clauses.join(" "),
    ...(Object.keys(values).length > 0
      ? { expressionAttributeValues: values }
      : {}),
    ...(Object.keys(names).length > 0
      ? { expressionAttributeNames: names }
      : {}),
  };
}

export function hasRaceDraftChanges(
  item: RaceItem,
  draft: RaceDraft | undefined,
): boolean {
  if (!draft) return false;

  if (draft.time !== undefined && draft.time !== item.time) return true;
  if (draft.vdot !== undefined && draft.vdot !== item.vdot) return true;
  if (draft.name !== undefined && draft.name !== (item.name ?? "")) return true;
  if (
    draft.comments !== undefined &&
    draft.comments !== (item.comments ?? "")
  ) {
    return true;
  }
  if (
    draft.validationState !== undefined &&
    draft.validationState !== item.validationState
  ) {
    return true;
  }

  return false;
}

export function nextRaceItem(
  item: RaceItem,
  update: RaceBatchUpdateItem,
): RaceItem {
  const next: RaceItem = {
    ...item,
    ...(update.time !== undefined ? { time: update.time } : {}),
    ...(update.vdot !== undefined ? { vdot: update.vdot } : {}),
    ...(update.name !== undefined && update.name !== null
      ? { name: update.name }
      : {}),
    ...(update.validationState !== undefined
      ? { validationState: update.validationState }
      : {}),
  };

  if (update.name === null) {
    delete next.name;
  }
  if (update.comments !== undefined) {
    if (update.comments === null) {
      delete next.comments;
    } else {
      next.comments = update.comments;
    }
  }

  return next;
}
