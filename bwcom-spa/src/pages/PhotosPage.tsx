import React from "react";
import { Container, Header, SpaceBetween } from "@cloudscape-design/components";
import PhotoAlbumGrid from "../components/PhotoAlbumGrid";
import { PHOTO_ALBUM_MANIFEST } from "../lib/photo-albums.generated";
import { buildPhotoAssetsFromManifest, buildPhotoMonthGroups } from "../lib/photo-albums";

const IMAGES_BASE_URL = import.meta.env.VITE_IMAGES_BASE_URL ?? "";

const albumPhotos = buildPhotoAssetsFromManifest(
  PHOTO_ALBUM_MANIFEST,
  IMAGES_BASE_URL,
);

const PhotosPage: React.FC = () => {
  const groups = buildPhotoMonthGroups(albumPhotos);

  return (
    <Container>
      <SpaceBetween direction="vertical" size="l">
        <Header variant="h1">Photos</Header>
        <PhotoAlbumGrid groups={groups} />
      </SpaceBetween>
    </Container>
  );
};

export default PhotosPage;
