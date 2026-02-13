'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Header,
  Box,
  Spinner,
  StatusIndicator,
  Table,
  TableProps,
} from '@cloudscape-design/components';

export interface SortableColumnDefinition<T> {
  id: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  /** Return a sortable primitive for this column. Defaults to cell(item) as string. */
  sortingField?: keyof T;
  /** Custom comparator for sorting. Receives two items and returns -1/0/1. */
  sortingComparator?: (a: T, b: T) => number;
  width?: number;
}

interface SortableTablePageProps<T> {
  title: string;
  apiUrl: string;
  /** Extract a flat array of items from the API response JSON */
  extractItems: (data: Record<string, unknown>) => T[];
  columnDefinitions: SortableColumnDefinition<T>[];
  /** Column id to sort by initially */
  defaultSortingColumnId: string;
  defaultSortingDescending?: boolean;
  emptyNoun: string;
}

function SortableTablePage<T>({
  title,
  apiUrl,
  extractItems,
  columnDefinitions,
  defaultSortingColumnId,
  defaultSortingDescending = true,
  emptyNoun,
}: SortableTablePageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultCol = columnDefinitions.find((c) => c.id === defaultSortingColumnId) ?? columnDefinitions[0];
  const [sortingColumn, setSortingColumn] = useState<TableProps.SortingColumn<T>>({
    sortingField: defaultCol.id,
  });
  const [sortingDescending, setSortingDescending] = useState(defaultSortingDescending);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(extractItems(data));
        setStatus('loaded');
      } catch (err) {
        console.error(`Failed to load ${emptyNoun}:`, err);
        setErrorMsg(`Failed to load ${emptyNoun}.`);
        setStatus('error');
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  // Build sorted items
  const sortedItems = React.useMemo(() => {
    const colDef = columnDefinitions.find((c) => c.id === sortingColumn.sortingField);
    if (!colDef) return items;

    const sorted = [...items].sort((a, b) => {
      if (colDef.sortingComparator) {
        return colDef.sortingComparator(a, b);
      }
      // Default: compare by sortingField or cell text
      let aVal: unknown;
      let bVal: unknown;
      if (colDef.sortingField) {
        aVal = a[colDef.sortingField];
        bVal = b[colDef.sortingField];
      } else {
        aVal = colDef.cell(a);
        bVal = colDef.cell(b);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      return String(aVal ?? '').localeCompare(String(bVal ?? ''));
    });

    if (sortingDescending) sorted.reverse();
    return sorted;
  }, [items, sortingColumn, sortingDescending, columnDefinitions]);

  // Build Cloudscape-compatible column defs
  const cloudscapeColumns: TableProps.ColumnDefinition<T>[] = columnDefinitions.map((col) => ({
    id: col.id,
    header: col.header,
    cell: col.cell,
    sortingField: col.id,
    width: col.width,
  }));

  const handleSortingChange: TableProps['onSortingChange'] = (event) => {
    setSortingColumn(event.detail.sortingColumn);
    setSortingDescending(event.detail.isDescending ?? false);
  };

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
      {items.length === 0 ? (
        <Box textAlign="center" color="text-body-secondary" padding="l">
          No {emptyNoun} yet.
        </Box>
      ) : (
        <Table<T>
          variant="embedded"
          columnDefinitions={cloudscapeColumns}
          items={sortedItems}
          sortingColumn={sortingColumn}
          sortingDescending={sortingDescending}
          onSortingChange={handleSortingChange}
          empty={
            <Box textAlign="center" color="text-body-secondary" padding="s">
              No entries.
            </Box>
          }
        />
      )}
    </Container>
  );
}

export default SortableTablePage;
