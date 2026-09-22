"use client";

import React from "react";
import { Box } from "@cloudscape-design/components";
import { formatMediaRating } from "@/lib/media";
import type { MediaItem } from "@/types/media";
import ContinuousTablePage from "./ContinuousTablePage";

const mediaTrackingNote = (
  <span
    style={{
      background: "#f4f9ff",
      borderLeft: "4px solid #0073bb",
      borderRadius: 4,
      display: "inline-block",
      maxWidth: "72ch",
      padding: "8px 12px",
    }}
  >
    <strong>
      I began tracking this data in early 2026, with the goal of tracking
      everything going forward. I&apos;ll add some past comments for media that
      I really liked.
    </strong>
  </span>
);

const Media: React.FC = () => (
  <ContinuousTablePage<MediaItem>
    title="Media"
    headerDescription={mediaTrackingNote}
    apiUrl="/api/media"
    extractGroups={(data) =>
      (
        (data.months as {
          monthKey: string;
          label: string;
          items: MediaItem[];
        }[]) ?? []
      ).map((m) => ({ key: m.monthKey, label: m.label, items: m.items }))
    }
    columnDefinitions={[
      {
        id: "title",
        header: "Title",
        cell: (item) => item.title,
        width: 250,
      },
      {
        id: "author",
        header: "Author",
        cell: (item) => item.author ?? <Box color="text-body-secondary">—</Box>,
        width: 180,
      },
      {
        id: "format",
        header: "Format",
        cell: (item) => item.format,
        width: 100,
      },
      {
        id: "rating",
        header: "Rating",
        cell: (item) =>
          item.rating ? (
            <span aria-label={`${item.rating} out of 5 stars`}>
              {formatMediaRating(item.rating)}
            </span>
          ) : (
            <Box color="text-body-secondary">—</Box>
          ),
        width: 100,
      },
      {
        id: "comments",
        header: "Comments",
        cell: (item) =>
          item.comments ? (
            <span style={{ whiteSpace: "pre-line" }}>{item.comments}</span>
          ) : (
            <Box color="text-body-secondary">—</Box>
          ),
        width: 300,
      },
    ]}
    emptyNoun="media entries"
    monthColumnEnabled={true}
  />
);

export default Media;
