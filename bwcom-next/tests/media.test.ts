import { describe, expect, it } from "vitest";

import {
  applyMediaBatchUpdateItem,
  buildMediaBatchUpdateItem,
  formatMediaRating,
  hasMediaDraftChanges,
  isValidMediaRating,
  toMediaItem,
} from "../lib/media";
import type {
  MediaBatchUpdateItem,
  MediaItem,
  MediaRating,
} from "../types/media";

const baseItem: MediaItem = {
  monthKey: "2026-03",
  sk: "2026-03-01T00:00:00.000Z#Test",
  title: "Test",
  format: "book",
  createdAt: "2026-03-01T00:00:00.000Z",
};

describe("media ratings", () => {
  it("accepts only whole-number ratings from 1 to 5", () => {
    expect(isValidMediaRating(1)).toBe(true);
    expect(isValidMediaRating(5)).toBe(true);
    expect(isValidMediaRating(0)).toBe(false);
    expect(isValidMediaRating(6)).toBe(false);
    expect(isValidMediaRating(3.5)).toBe(false);
    expect(isValidMediaRating("4")).toBe(false);
  });

  it("normalizes valid ratings from raw records and ignores malformed values", () => {
    expect(
      toMediaItem({
        ...baseItem,
        rating: 4,
      }),
    ).toMatchObject({ rating: 4 });

    expect(
      toMediaItem({
        ...baseItem,
        rating: 9,
      }),
    ).not.toHaveProperty("rating");
  });

  it("renders stars for rated items and an em dash for unrated items", () => {
    expect(formatMediaRating(4)).toBe("★★★★☆");
    expect(formatMediaRating(undefined)).toBe("—");
  });

  it("builds rating updates for set and clear flows", () => {
    const ratedItem: MediaItem = { ...baseItem, rating: 3 };

    expect(
      buildMediaBatchUpdateItem(ratedItem, {
        rating: 5,
      }) as MediaBatchUpdateItem,
    ).toMatchObject({
      monthKey: baseItem.monthKey,
      sk: baseItem.sk,
      rating: 5,
    });

    expect(
      buildMediaBatchUpdateItem(ratedItem, {
        rating: null,
      }) as MediaBatchUpdateItem,
    ).toMatchObject({
      monthKey: baseItem.monthKey,
      sk: baseItem.sk,
      rating: null,
    });

    expect(
      buildMediaBatchUpdateItem(baseItem, {
        rating: null,
      }) as MediaBatchUpdateItem,
    ).toMatchObject({ monthKey: baseItem.monthKey, sk: baseItem.sk });
  });

  it("detects rating changes in the bulk editor draft state", () => {
    const ratedItem: MediaItem = { ...baseItem, rating: 2 };

    expect(hasMediaDraftChanges(ratedItem, { rating: 2 })).toBe(false);
    expect(hasMediaDraftChanges(ratedItem, { rating: 4 })).toBe(true);
    expect(hasMediaDraftChanges(ratedItem, { rating: null })).toBe(true);
    expect(hasMediaDraftChanges(baseItem, { rating: null })).toBe(false);
  });

  it("applies rating updates to optimistic row state", () => {
    const updated = applyMediaBatchUpdateItem(baseItem, {
      monthKey: baseItem.monthKey,
      sk: baseItem.sk,
      rating: 5,
    });

    expect(updated.rating).toBe(5);

    const cleared = applyMediaBatchUpdateItem(
      { ...baseItem, rating: 4 as MediaRating },
      {
        monthKey: baseItem.monthKey,
        sk: baseItem.sk,
        rating: null,
      },
    );

    expect(cleared).not.toHaveProperty("rating");
  });
});
