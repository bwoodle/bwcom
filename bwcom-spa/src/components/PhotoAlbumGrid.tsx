import React, { useMemo, useState } from "react";
import { Box, Button, Container, Header, Modal, SpaceBetween } from "@cloudscape-design/components";
import type { PhotoMonthGroup } from "../lib/photo-albums";

const IMAGES_BASE_URL = import.meta.env.VITE_IMAGES_BASE_URL ?? "";

type PhotoAlbumGridProps = {
  groups: PhotoMonthGroup[];
};

const PhotoAlbumGrid: React.FC<PhotoAlbumGridProps> = ({ groups }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const groupsWithImages = useMemo(
    () =>
      groups.filter((group) => group.photos.length > 0).map((group) => ({
        ...group,
        photos: group.photos.map((photo) => ({
          ...photo,
          thumbSrc: photo.thumbSrc || `${IMAGES_BASE_URL}/albums/${photo.monthKey}/thumbs/${photo.name}`,
          fullSrc: photo.fullSrc || `${IMAGES_BASE_URL}/albums/${photo.monthKey}/${photo.name}`,
        })),
      })),
    [groups],
  );

  if (groupsWithImages.length === 0) {
    return (
      <Container>
        <Box color="text-body-secondary">No albums yet. Add images to a folder like photos/albums/2026-10/.</Box>
      </Container>
    );
  }

  const selected = groupsWithImages
    .flatMap((group) => group.photos)
    .find((photo) => photo.fullSrc === selectedPhoto || photo.thumbSrc === selectedPhoto);

  return (
    <>
      <SpaceBetween direction="vertical" size="l">
        {groupsWithImages.map((group) => (
          <section key={group.monthKey}>
            <Header variant="h2">{group.label}</Header>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "1rem",
                marginTop: "0.75rem",
              }}
            >
              {group.photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedPhoto(photo.fullSrc)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 3",
                      overflow: "hidden",
                      borderRadius: "10px",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <img
                      src={photo.thumbSrc}
                      alt={photo.alt}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </SpaceBetween>

      {selected && (
        <Modal
          onDismiss={() => setSelectedPhoto(null)}
          visible={true}
          header={selected.alt}
          size="max"
        >
          <img
            src={selected.fullSrc}
            alt={selected.alt}
            style={{
              display: "block",
              width: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
              borderRadius: "8px",
              background: "#f2f2f2",
            }}
          />
          <Box margin={{ top: "s" }}>
            <Button variant="primary" onClick={() => setSelectedPhoto(null)}>
              Close
            </Button>
          </Box>
        </Modal>
      )}
    </>
  );
};

export default PhotoAlbumGrid;
