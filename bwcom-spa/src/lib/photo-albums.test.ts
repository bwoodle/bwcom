import { describe, expect, it } from "vitest";
import { buildPhotoMonthGroups, type PhotoAsset } from "./photo-albums";

describe("buildPhotoMonthGroups", () => {
  it("groups photos by month and keeps newest-first ordering", () => {
    const photos: PhotoAsset[] = [
      {
        id: "oct-2",
        monthKey: "2026-10",
        alt: "October second",
        name: "IMG_4409.jpg",
        thumbSrc: "https://cdn.example/albums/2026-10/thumbs/IMG_4409.jpg",
        fullSrc: "https://cdn.example/albums/2026-10/IMG_4409.jpg",
      },
      {
        id: "sep-1",
        monthKey: "2026-09",
        alt: "September one",
        name: "IMG_4234.jpg",
        thumbSrc: "https://cdn.example/albums/2026-09/thumbs/IMG_4234.jpg",
        fullSrc: "https://cdn.example/albums/2026-09/IMG_4234.jpg",
      },
      {
        id: "oct-1",
        monthKey: "2026-10",
        alt: "October first",
        name: "IMG_4407.jpg",
        thumbSrc: "https://cdn.example/albums/2026-10/thumbs/IMG_4407.jpg",
        fullSrc: "https://cdn.example/albums/2026-10/IMG_4407.jpg",
      },
    ];

    expect(buildPhotoMonthGroups(photos)).toEqual([
      {
        monthKey: "2026-10",
        label: "October 2026",
        photos: [
          {
            id: "oct-2",
            monthKey: "2026-10",
            alt: "October second",
            name: "IMG_4409.jpg",
            thumbSrc: "https://cdn.example/albums/2026-10/thumbs/IMG_4409.jpg",
            fullSrc: "https://cdn.example/albums/2026-10/IMG_4409.jpg",
          },
          {
            id: "oct-1",
            monthKey: "2026-10",
            alt: "October first",
            name: "IMG_4407.jpg",
            thumbSrc: "https://cdn.example/albums/2026-10/thumbs/IMG_4407.jpg",
            fullSrc: "https://cdn.example/albums/2026-10/IMG_4407.jpg",
          },
        ],
      },
      {
        monthKey: "2026-09",
        label: "September 2026",
        photos: [
          {
            id: "sep-1",
            monthKey: "2026-09",
            alt: "September one",
            name: "IMG_4234.jpg",
            thumbSrc: "https://cdn.example/albums/2026-09/thumbs/IMG_4234.jpg",
            fullSrc: "https://cdn.example/albums/2026-09/IMG_4234.jpg",
          },
        ],
      },
    ]);
  });
});
