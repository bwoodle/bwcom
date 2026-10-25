import { describe, expect, it } from "vitest";

import { buildPhotoMonthGroups, PHOTO_ALBUMS } from "../lib/photo-albums";

describe("PHOTO_ALBUMS", () => {
  it("contains month groups sorted newest first", () => {
    expect(PHOTO_ALBUMS.map((group) => group.monthKey)).toEqual(
      [...PHOTO_ALBUMS]
        .sort((left, right) => right.monthKey.localeCompare(left.monthKey))
        .map((group) => group.monthKey),
    );
  });

  it("renders monthly groups backed by actual album directories", () => {
    expect(PHOTO_ALBUMS.length).toBeGreaterThan(0);
    expect(PHOTO_ALBUMS.every((group) => group.photos.length > 0)).toBe(true);
    expect(PHOTO_ALBUMS[0].label).toMatch(/\d{4}/);
  });
});

describe("buildPhotoMonthGroups", () => {
  it("groups photos by month and preserves newest-first sorting", () => {
    const groups = buildPhotoMonthGroups([
      {
        id: "a",
        monthKey: "2026-11",
        alt: "A",
        thumbSrc: "/thumb/a.jpg",
        fullSrc: "/full/a.jpg",
      },
      {
        id: "b",
        monthKey: "2026-11",
        alt: "B",
        thumbSrc: "/thumb/b.jpg",
        fullSrc: "/full/b.jpg",
      },
      {
        id: "c",
        monthKey: "2025-12",
        alt: "C",
        thumbSrc: "/thumb/c.jpg",
        fullSrc: "/full/c.jpg",
      },
    ]);

    expect(groups).toEqual([
      {
        monthKey: "2026-11",
        label: "November 2026",
        photos: [
          {
            id: "a",
            monthKey: "2026-11",
            alt: "A",
            thumbSrc: "/thumb/a.jpg",
            fullSrc: "/full/a.jpg",
          },
          {
            id: "b",
            monthKey: "2026-11",
            alt: "B",
            thumbSrc: "/thumb/b.jpg",
            fullSrc: "/full/b.jpg",
          },
        ],
      },
      {
        monthKey: "2025-12",
        label: "December 2025",
        photos: [
          {
            id: "c",
            monthKey: "2025-12",
            alt: "C",
            thumbSrc: "/thumb/c.jpg",
            fullSrc: "/full/c.jpg",
          },
        ],
      },
    ]);
  });
});
