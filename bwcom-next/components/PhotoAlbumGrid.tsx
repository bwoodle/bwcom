"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Container,
  Header,
  Modal,
  SpaceBetween,
} from "@cloudscape-design/components";

import { type PhotoAsset, type PhotoMonthGroup } from "../lib/photo-albums";

export function PhotoAlbumGrid({ groups }: { groups: PhotoMonthGroup[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoAsset | null>(null);

  return (
    <Container>
      <SpaceBetween direction="vertical" size="l">
        <Header variant="h1">Photos</Header>

        {groups.length === 0 ? (
          <p>
            No albums yet. Add images to a folder like photos/albums/2026-10/.
          </p>
        ) : null}

        {groups.map((month) => (
          <section key={month.monthKey}>
            <SpaceBetween direction="vertical" size="m">
              <Header variant="h2">{month.label}</Header>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: "clamp(0.5rem, 1vw, 1rem)",
                }}
              >
                {month.photos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhoto(photo)}
                    style={{
                      border: "none",
                      padding: 0,
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    aria-label={`Open photo ${photo.alt}`}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "4 / 3",
                        overflow: "hidden",
                        borderRadius: "8px",
                      }}
                    >
                      <Image
                        src={photo.thumbSrc}
                        alt={photo.alt}
                        fill
                        sizes="(min-width: 960px) 25vw, 50vw"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </SpaceBetween>
          </section>
        ))}
      </SpaceBetween>

      <Modal
        visible={Boolean(selectedPhoto)}
        onDismiss={() => setSelectedPhoto(null)}
        header={selectedPhoto?.alt ?? "Photo"}
        size="large"
      >
        {selectedPhoto && (
          <Image
            src={selectedPhoto.fullSrc}
            alt={selectedPhoto.alt}
            width={1200}
            height={1200}
            style={{ width: "100%", height: "auto", borderRadius: "8px" }}
          />
        )}
      </Modal>
    </Container>
  );
}
