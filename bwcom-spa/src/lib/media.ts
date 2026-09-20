import type {
  MediaBatchUpdateItem,
  MediaFormat,
  MediaItem,
  MediaRating,
} from "../types/media";

export type MediaEditorDraft = {
  title?: string;
  author?: string;
  format?: MediaFormat;
  comments?: string;
  rating?: MediaRating | null;
};

const RATING_STARS = 5;

export function isValidMediaRating(value: unknown): value is MediaRating {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= RATING_STARS
  );
}

export function normalizeMediaRating(value: unknown): MediaRating | undefined {
  return isValidMediaRating(value) ? value : undefined;
}

export function toMediaItem(record: Record<string, unknown>): MediaItem {
  const item: MediaItem = {
    monthKey: String(record.monthKey ?? ""),
    sk: String(record.sk ?? ""),
    title: String(record.title ?? ""),
    author:
      typeof record.author === "string" && record.author.length > 0
        ? record.author
        : undefined,
    format: record.format as MediaFormat,
    comments:
      typeof record.comments === "string" && record.comments.length > 0
        ? record.comments
        : undefined,
    createdAt: String(record.createdAt ?? ""),
  };

  const rating = normalizeMediaRating(record.rating);
  if (rating !== undefined) {
    item.rating = rating;
  }

  return item;
}

export function formatMediaRating(rating?: MediaRating | null): string {
  if (!isValidMediaRating(rating)) {
    return "—";
  }

  return `${"★".repeat(rating)}${"☆".repeat(RATING_STARS - rating)}`;
}

export function hasMediaDraftChanges(
  item: MediaItem,
  draft: MediaEditorDraft | undefined,
): boolean {
  if (!draft) return false;
  if (draft.title !== undefined && draft.title !== item.title) return true;
  if (draft.author !== undefined && draft.author !== (item.author ?? ""))
    return true;
  if (draft.format !== undefined && draft.format !== item.format) return true;

  const originalComments = item.comments ?? "";
  if (draft.comments !== undefined && draft.comments !== originalComments)
    return true;

  const originalRating = item.rating ?? null;
  if (draft.rating !== undefined && draft.rating !== originalRating)
    return true;

  return false;
}

export function buildMediaBatchUpdateItem(
  item: MediaItem,
  draft: MediaEditorDraft | undefined,
): MediaBatchUpdateItem {
  const next: MediaBatchUpdateItem = {
    monthKey: item.monthKey,
    sk: item.sk,
  };

  if (!draft) {
    return next;
  }

  if (draft.title !== undefined && draft.title !== item.title) {
    next.title = draft.title;
  }

  if (draft.author !== undefined) {
    const normalized = draft.author.trim();
    const original = (item.author ?? "").trim();
    if (normalized !== original) {
      next.author = normalized.length === 0 ? null : draft.author;
    }
  }

  if (draft.format !== undefined && draft.format !== item.format) {
    next.format = draft.format;
  }

  if (draft.comments !== undefined) {
    const normalized = draft.comments.trim();
    const original = (item.comments ?? "").trim();
    if (normalized !== original) {
      next.comments = normalized.length === 0 ? null : draft.comments;
    }
  }

  if (draft.rating !== undefined) {
    const originalRating = item.rating ?? null;
    if (draft.rating !== originalRating) {
      next.rating = draft.rating;
    }
  }

  return next;
}

export function applyMediaBatchUpdateItem(
  item: MediaItem,
  update: MediaBatchUpdateItem,
): MediaItem {
  const next: MediaItem = {
    ...item,
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.author !== undefined && update.author !== null
      ? { author: update.author }
      : {}),
    ...(update.format !== undefined ? { format: update.format } : {}),
  };

  if (update.author === null) {
    delete next.author;
  }

  if (update.comments !== undefined) {
    if (update.comments === null) {
      delete next.comments;
    } else {
      next.comments = update.comments;
    }
  }

  if (update.rating !== undefined) {
    if (update.rating === null) {
      delete next.rating;
    } else {
      next.rating = update.rating;
    }
  }

  return next;
}
