'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Spinner,
  StatusIndicator,
  Table,
} from '@cloudscape-design/components';

interface MediaItem {
  monthKey: string;
  sk: string;
  title: string;
  format: string;
  comments?: string;
  createdAt: string;
}

interface MonthGroup {
  monthKey: string;
  label: string;
  items: MediaItem[];
}

const Media: React.FC = () => {
  const [months, setMonths] = useState<MonthGroup[]>([]);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMedia() {
      try {
        const res = await fetch('/api/media');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setMonths(data.months);
        setStatus('loaded');
      } catch (err) {
        console.error('Failed to load media data:', err);
        setErrorMsg('Failed to load media data.');
        setStatus('error');
      }
    }
    fetchMedia();
  }, []);

  if (status === 'loading') {
    return (
      <Container header={<Header variant="h1">Media</Header>}>
        <Box textAlign="center" padding={{ vertical: 'l' }}>
          <Spinner size="large" />
          <Box variant="p" margin={{ top: 's' }}>
            Loading media data...
          </Box>
        </Box>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container header={<Header variant="h1">Media</Header>}>
        <StatusIndicator type="error">{errorMsg}</StatusIndicator>
      </Container>
    );
  }

  return (
    <Container header={<Header variant="h1">Media</Header>}>
      {months.length === 0 ? (
        <Box textAlign="center" color="text-body-secondary" padding="l">
          No media entries yet.
        </Box>
      ) : (
        <SpaceBetween size="s">
          {months.map((month) => (
            <Table
              key={month.monthKey}
              variant="embedded"
              header={<Header variant="h3">{month.label}</Header>}
              columnDefinitions={[
                {
                  id: 'title',
                  header: 'Title',
                  cell: (item: MediaItem) => item.title,
                  width: 280,
                },
                {
                  id: 'format',
                  header: 'Format',
                  cell: (item: MediaItem) => item.format,
                  width: 140,
                },
                {
                  id: 'comments',
                  header: 'Comments',
                  cell: (item: MediaItem) =>
                    item.comments ? (
                      <span style={{ whiteSpace: 'pre-line' }}>{item.comments}</span>
                    ) : (
                      <Box color="text-body-secondary">—</Box>
                    ),
                },
              ]}
              items={month.items}
              empty={
                <Box textAlign="center" color="text-body-secondary" padding="s">
                  No entries.
                </Box>
              }
            />
          ))}
        </SpaceBetween>
      )}
    </Container>
  );
};

export default Media;