export type PhotoAsset = {
  id: string;
  monthKey: string;
  alt: string;
  name: string;
  thumbSrc: string;
  fullSrc: string;
};

export type PhotoManifestEntry = {
  monthKey: string;
  name: string;
};

export type PhotoMonthGroup = {
  monthKey: string;
  label: string;
  photos: PhotoAsset[];
};

export function buildPhotoAssetsFromManifest(
  manifest: PhotoManifestEntry[],
  imagesBaseUrl: string,
): PhotoAsset[] {
  return manifest.map(({ monthKey, name }) => {
    const baseName = name.replace(/\.[^.]+$/, "");

    return {
      id: `${monthKey}-${baseName}`,
      monthKey,
      alt: `${formatMonthLabel(monthKey)} photo ${baseName}`,
      name,
      thumbSrc: `${imagesBaseUrl}/albums/${monthKey}/thumbs/${name}`,
      fullSrc: `${imagesBaseUrl}/albums/${monthKey}/${name}`,
    };
  });
}

export function buildPhotoMonthGroups(photos: PhotoAsset[]): PhotoMonthGroup[] {
  const grouped = new Map<string, PhotoAsset[]>();

  for (const photo of photos) {
    const list = grouped.get(photo.monthKey) ?? [];
    list.push(photo);
    grouped.set(photo.monthKey, list);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([monthKey, monthPhotos]) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      photos: [...monthPhotos].sort((a, b) => b.name.localeCompare(a.name)),
    }));
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
