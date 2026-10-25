import React from "react";
import { Container, Header, SpaceBetween } from "@cloudscape-design/components";
import PhotoAlbumGrid from "../components/PhotoAlbumGrid";
import { buildPhotoMonthGroups, type PhotoAsset } from "../lib/photo-albums";

const IMAGES_BASE_URL = import.meta.env.VITE_IMAGES_BASE_URL ?? "";

const albumPhotos: PhotoAsset[] = [
  {
    id: "2026-10-1",
    monthKey: "2026-10",
    alt: "October 2026 photo 1",
    name: "IMG_4407.jpg",
    thumbSrc: `${IMAGES_BASE_URL}/albums/2026-10/thumbs/IMG_4407.jpg`,
    fullSrc: `${IMAGES_BASE_URL}/albums/2026-10/IMG_4407.jpg`,
  },
  {
    id: "2026-10-2",
    monthKey: "2026-10",
    alt: "October 2026 photo 2",
    name: "IMG_4409.jpg",
    thumbSrc: `${IMAGES_BASE_URL}/albums/2026-10/thumbs/IMG_4409.jpg`,
    fullSrc: `${IMAGES_BASE_URL}/albums/2026-10/IMG_4409.jpg`,
  },
  {
    id: "2026-09-1",
    monthKey: "2026-09",
    alt: "September 2026 photo 1",
    name: "IMG_4234.jpg",
    thumbSrc: `${IMAGES_BASE_URL}/albums/2026-09/thumbs/IMG_4234.jpg`,
    fullSrc: `${IMAGES_BASE_URL}/albums/2026-09/IMG_4234.jpg`,
  },
];

const PhotosPage: React.FC = () => {
  const groups = buildPhotoMonthGroups(albumPhotos);

  return (
    <Container>
      <SpaceBetween direction="vertical" size="l">
        <Header variant="h1">Photos</Header>
        <p>
          A simple record of recent months, growing over time as new images are added.
        </p>
        <PhotoAlbumGrid groups={groups} />
      </SpaceBetween>
    </Container>
  );
};

export default PhotosPage;
