'use client';

import React from 'react';
import { Box } from '@cloudscape-design/components';
import GroupedTablePage from './GroupedTablePage';

interface RaceItem {
  yearKey: string;
  sk: string;
  date: string;
  distance: string;
  time: string;
  vdot: number;
  comments?: string;
  createdAt: string;
}

const RaceHistory: React.FC = () => (
  <GroupedTablePage<RaceItem>
    title="Race History"
    apiUrl="/api/races"
    extractGroups={(data) =>
      ((data.years as { yearKey: string; label: string; items: RaceItem[] }[]) ?? []).map(
        (y) => ({ key: y.yearKey, label: y.label, items: y.items })
      )
    }
    columnDefinitions={[
      {
        id: 'date',
        header: 'Date',
        cell: (item) => item.date,
        width: 140,
      },
      {
        id: 'distance',
        header: 'Distance',
        cell: (item) => item.distance,
        width: 120,
      },
      {
        id: 'time',
        header: 'Time',
        cell: (item) => item.time,
        width: 100,
      },
      {
        id: 'vdot',
        header: 'VDOT',
        cell: (item) => item.vdot.toFixed(1),
        width: 80,
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
    emptyNoun="race results"
  />
);

export default RaceHistory;