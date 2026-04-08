'use client';

import React from 'react';
import { Box } from '@cloudscape-design/components';
import GroupedTablePage from './GroupedTablePage';

interface MediaItem {
  monthKey: string;
  sk: string;
  title: string;
  format: string;
  comments?: string;
  createdAt: string;
}

const mediaTrackingNote = (
  <Box
    variant="small"
    display="inline-block"
    padding={{ vertical: 'xs', horizontal: 's' }}
    style={{
      background: '#f4f9ff',
      borderLeft: '4px solid #0073bb',
      borderRadius: 4,
      fontWeight: 600,
      maxWidth: '72ch',
    }}
  >
    I began tracking this data in early 2026, with the goal of tracking everything going
    forward. I&apos;ll add some past comments for media that I really liked.
  </Box>
);

const Media: React.FC = () => (
  <GroupedTablePage<MediaItem>
    title="Media"
    headerDescription={mediaTrackingNote}
    apiUrl="/api/media"
    extractGroups={(data) =>
      ((data.months as { monthKey: string; label: string; items: MediaItem[] }[]) ?? []).map(
        (m) => ({ key: m.monthKey, label: m.label, items: m.items })
      )
    }
    columnDefinitions={[
      {
        id: 'title',
        header: 'Title',
        cell: (item) => item.title,
        width: 280,
      },
      {
        id: 'format',
        header: 'Format',
        cell: (item) => item.format,
        width: 140,
      },
      {
        id: 'comments',
        header: 'Comments',
        cell: (item) =>
          item.comments ? (
            <span style={{ whiteSpace: 'pre-line' }}>{item.comments}</span>
          ) : (
            <Box color="text-body-secondary">—</Box>
          ),
      },
    ]}
    emptyNoun="media entries"
  />
);

export default Media;