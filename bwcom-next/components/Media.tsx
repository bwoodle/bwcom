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

const Media: React.FC = () => (
  <GroupedTablePage<MediaItem>
    title="Media"
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