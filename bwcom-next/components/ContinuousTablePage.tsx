"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Header,
  Box,
  Spinner,
  StatusIndicator,
  Table,
  TableProps,
} from "@cloudscape-design/components";

export interface GroupedTableGroup<T> {
  key: string;
  label: string;
  items: T[];
}

interface ContinuousTablePageProps<T> {
  /** Page title shown in the container header */
  title: string;
  /** Optional short note shown under the page title */
  headerDescription?: React.ReactNode;
  /** API endpoint to fetch data from */
  apiUrl: string;
  /** Extract the groups array from the API response JSON */
  extractGroups: (data: Record<string, unknown>) => GroupedTableGroup<T>[];
  /** Column definitions passed to Cloudscape Table */
  columnDefinitions: TableProps<T>["columnDefinitions"];
  /** Noun for empty states, e.g. "media entries" or "race results" */
  emptyNoun: string;
  /** Whether to add a month column (assumes items have monthKey) */
  monthColumnEnabled?: boolean;
}

interface ItemWithMonth extends Record<string, unknown> {
  _monthLabel?: string;
}

/**
 * A reusable page shell that fetches grouped data from an API and renders
 * all items in a single continuous Cloudscape Table for consistent column widths
 * and compact layout. Optionally adds a month column for context.
 */
function ContinuousTablePage<T>({
  title,
  headerDescription,
  apiUrl,
  extractGroups,
  columnDefinitions,
  emptyNoun,
  monthColumnEnabled = false,
}: ContinuousTablePageProps<T>) {
  const [items, setItems] = useState<(T & ItemWithMonth)[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const baseUrl = new URL(apiUrl, window.location.origin);
        baseUrl.searchParams.set("limit", "1000");

        const pages: Record<string, unknown>[] = [];
        let cursor: string | null = null;

        for (let page = 0; page < 20; page += 1) {
          const url = new URL(baseUrl.toString());
          if (cursor) {
            url.searchParams.set("cursor", cursor);
          }

          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = (await res.json()) as Record<string, unknown>;
          pages.push(data);

          const nextCursor = data.nextCursor;
          cursor =
            typeof nextCursor === "string" && nextCursor.length > 0
              ? nextCursor
              : null;
          if (!cursor) {
            break;
          }
        }

        // Flatten all groups into a single array, adding month labels
        const flatItems: (T & ItemWithMonth)[] = [];
        for (const page of pages) {
          for (const group of extractGroups(page)) {
            for (const item of group.items) {
              const itemWithMonth = {
                ...item,
                _monthLabel: group.label,
              } as T & ItemWithMonth;
              flatItems.push(itemWithMonth);
            }
          }
        }

        setItems(flatItems);
        setStatus("loaded");
      } catch (err) {
        console.error(`Failed to load ${emptyNoun}:`, err);
        setErrorMsg(`Failed to load ${emptyNoun}.`);
        setStatus("error");
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  // Build column definitions, optionally prepending month column
  const allColumnDefinitions: TableProps<
    T & ItemWithMonth
  >["columnDefinitions"] = monthColumnEnabled
    ? [
        {
          id: "_month",
          header: "Month",
          cell: (item: T & ItemWithMonth) => item._monthLabel || "—",
          width: 150,
        },
        ...(columnDefinitions || []),
      ]
    : columnDefinitions;

  if (status === "loading") {
    return (
      <Container
        header={
          <Header variant="h1" description={headerDescription}>
            {title}
          </Header>
        }
      >
        <Box textAlign="center" padding={{ vertical: "l" }}>
          <Spinner size="large" />
          <Box variant="p" margin={{ top: "s" }}>
            Loading {emptyNoun}...
          </Box>
        </Box>
      </Container>
    );
  }

  if (status === "error") {
    return (
      <Container
        header={
          <Header variant="h1" description={headerDescription}>
            {title}
          </Header>
        }
      >
        <StatusIndicator type="error">{errorMsg}</StatusIndicator>
      </Container>
    );
  }

  return (
    <Container
      header={
        <Header variant="h1" description={headerDescription}>
          {title}
        </Header>
      }
    >
      {items.length === 0 ? (
        <Box textAlign="center" color="text-body-secondary" padding="l">
          No {emptyNoun} yet.
        </Box>
      ) : (
        <Table<T & ItemWithMonth>
          variant="full-page"
          columnDefinitions={allColumnDefinitions}
          items={items}
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

export default ContinuousTablePage;
