import { readdirSync } from "node:fs";
import path from "node:path";

export type PhotoAsset = {
  id: string;
  monthKey: string;
  alt: string;
  thumbSrc: string;
  fullSrc: string;
};

export type PhotoMonthGroup = {
  monthKey: string;
  label: string;
  photos: PhotoAsset[];
};

const IMAGES_BASE_URL = process.env.NEXT_PUBLIC_IMAGES_BASE_URL ?? "";
const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

export function formatMonthLabel(monthKey: string): string {
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const month = Number(monthString);

  if (!year || !month || month < 1 || month > 12) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function buildPhotoMonthGroups(photos: PhotoAsset[]): PhotoMonthGroup[] {
  const grouped = new Map<string, PhotoMonthGroup>();

  for (const photo of photos) {
    const existing = grouped.get(photo.monthKey) ?? {
      monthKey: photo.monthKey,
      label: formatMonthLabel(photo.monthKey),
      photos: [],
    };

    existing.photos.push(photo);
    grouped.set(photo.monthKey, existing);
  }

  return Array.from(grouped.values()).sort((left, right) =>
    right.monthKey.localeCompare(left.monthKey),
  );
}

function isSupportedImageFile(name: string): boolean {
  return (
    /\.(jpe?g|png|webp)$/i.test(name) && !name.includes(":Zone.Identifier")
  );
}

export function getAlbumPhotoAssets(): PhotoAsset[] {
  const albumsRoot = path.resolve(process.cwd(), "..", "photos", "albums");

  try {
    const monthDirs = readdirSync(albumsRoot, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && MONTH_KEY_PATTERN.test(entry.name),
      )
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));

    const photos: PhotoAsset[] = [];

    for (const monthKey of monthDirs) {
      const monthDir = path.join(albumsRoot, monthKey);
      const files = readdirSync(monthDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && isSupportedImageFile(entry.name))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));

      for (const fileName of files) {
        const id = fileName.replace(/\.[^.]+$/, "");
        const fullSrc = `${IMAGES_BASE_URL}/albums/${monthKey}/${fileName}`;
        const thumbSrc = `${IMAGES_BASE_URL}/albums/${monthKey}/thumbs/${fileName}`;

        photos.push({
          id,
          monthKey,
          alt: `${formatMonthLabel(monthKey)} photo ${id}`,
          thumbSrc,
          fullSrc,
        });
      }
    }

    return photos;
  } catch {
    return [];
  }
}

export const PHOTO_ALBUMS = buildPhotoMonthGroups(getAlbumPhotoAssets());
