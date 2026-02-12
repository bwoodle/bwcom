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
  TableProps,
} from '@cloudscape-design/components';

export interface GroupedTableGroup<T> {
  key: string;
  label: string;
  items: T[];
}

interface GroupedTablePageProps<T> {
  /** Page title shown in the container header */
  title: string;
  /** API endpoint to fetch data from */
  apiUrl: string;
  /** Extract the groups array from the API response JSON */
  extractGroups: (data: Record<string, unknown>) => GroupedTableGroup<T>[];
  /** Column definitions passed to every Cloudscape Table */
  columnDefinitions: TableProps<T>['columnDefinitions'];
  /** Noun for empty states, e.g. "media entries" or "race results" */
  emptyNoun: string;
}

/**
 * A reusable page shell that fetches grouped data from an API and renders
 * each group as an embedded Cloudscape Table inside a single Container.
 */
function GroupedTablePage<T>({
  title,
  apiUrl,
  extractGroups,
  columnDefinitions,
  emptyNoun,
}: GroupedTablePageProps<T>) {
  const [groups, setGroups] = useState<GroupedTableGroup<T>[]>([]);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setGroups(extractGroups(data));
        setStatus('loaded');
      } catch (err) {
        console.error(`Failed to load ${emptyNoun}:`, err);
        setErrorMsg(`Failed to load ${emptyNoun}.`);
        setStatus('error');
      }
    }
    fetchData();
  // extractGroups is stable per call-site; apiUrl and emptyNoun are static strings.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  if (status === 'loading') {
    return (
      <Container header={<Header variant="h1">{title}</Header>}>
        <Box textAlign="center" padding={{ vertical: 'l' }}>
          <Spinner size="large" />
          <Box variant="p" margin={{ top: 's' }}>
            Loading {emptyNoun}...
          </Box>
        </Box>
      </Container>
    );
  }

  if (status === 'error') {
    return (
      <Container header={<Header variant="h1">{title}</Header>}>
        <StatusIndicator type="error">{errorMsg}</StatusIndicator>
      </Container>
    );
  }

  return (
    <Container header={<Header variant="h1">{title}</Header>}>
      {groups.length === 0 ? (
        <Box textAlign="center" color="text-body-secondary" padding="l">
          No {emptyNoun} yet.
        </Box>
      ) : (
        <SpaceBetween size="s">
          {groups.map((group) => (
            <Table<T>
              key={group.key}
              variant="embedded"
              header={<Header variant="h3">{group.label}</Header>}
              columnDefinitions={columnDefinitions}
              items={group.items}
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
}

export default GroupedTablePage;
