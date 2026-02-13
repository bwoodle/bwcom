'use client';

import React from 'react';
import { Box } from '@cloudscape-design/components';
import SortableTablePage from './SortableTablePage';

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

/** Map distance labels to a numeric rank for sorting */
const DISTANCE_ORDER: Record<string, number> = {
  '5K': 1,
  '10K': 2,
  '8 Mile': 3,
  '15K': 4,
  '10 Mile': 5,
  'Half Marathon': 6,
  'Marathon': 7,
  '50K': 8,
};

function distanceRank(distance: string): number {
  return DISTANCE_ORDER[distance] ?? 99;
}

const RaceHistory: React.FC = () => (
  <SortableTablePage<RaceItem>
    title="Race History"
    apiUrl="/api/races"
    extractItems={(data) => (data.races as RaceItem[]) ?? []}
    defaultSortingColumnId="date"
    defaultSortingDescending
    columnDefinitions={[
      {
        id: 'date',
        header: 'Date',
        cell: (item) => item.date,
        sortingComparator: (a, b) => a.sk.localeCompare(b.sk),
        width: 140,
      },
      {
        id: 'distance',
        header: 'Distance',
        cell: (item) => item.distance,
        sortingComparator: (a, b) => distanceRank(a.distance) - distanceRank(b.distance),
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
        sortingComparator: (a, b) => a.vdot - b.vdot,
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