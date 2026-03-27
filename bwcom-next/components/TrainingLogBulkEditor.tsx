'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormField,
  Header,
  Input,
  SpaceBetween,
  Spinner,
  StatusIndicator,
  Textarea,
  SegmentedControl,
} from '@cloudscape-design/components';
import type {
  TrainingLogBatchUpdateItem,
  TrainingLogBatchUpdateResponse,
  TrainingLogEntry,
  TrainingLogSection,
} from '@/types/training-log';

type RowDraft = {
  description?: string;
  miles?: number;
  highlight?: boolean;
};

type RowErrorMap = Record<string, string>;

type EditorStatus = 'idle' | 'loading' | 'loaded' | 'error';

type LogConfig = { id: string; name: string };

const logConfigs: LogConfig[] = [{ id: 'paris-2026', name: 'Paris 2026' }];

function parseDate(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

function isDaily(entry: TrainingLogEntry): entry is Extract<TrainingLogEntry, { entryType: 'daily' }> {
  return entry.entryType === 'daily';
}

function initialDraft(entry: TrainingLogEntry): RowDraft {
  if (isDaily(entry)) {
    return {
      description: entry.description,
      miles: entry.miles,
      highlight: Boolean(entry.highlight),
    };
  }
  return { description: entry.description };
}

function hasDraftChanges(entry: TrainingLogEntry, draft: RowDraft | undefined): boolean {
  if (!draft) return false;

  if (draft.description !== undefined && draft.description !== entry.description) {
    return true;
  }

  if (isDaily(entry)) {
    if (draft.miles !== undefined && draft.miles !== entry.miles) {
      return true;
    }
    if (
      draft.highlight !== undefined &&
      Boolean(draft.highlight) !== Boolean(entry.highlight)
    ) {
      return true;
    }
  }

  return false;
}

function nextEntry(entry: TrainingLogEntry, update: TrainingLogBatchUpdateItem): TrainingLogEntry {
  if (entry.entryType === 'week') {
    return {
      ...entry,
      ...(update.description !== undefined ? { description: update.description } : {}),
    };
  }

  return {
    ...entry,
    ...(update.description !== undefined ? { description: update.description } : {}),
    ...(update.miles !== undefined ? { miles: update.miles } : {}),
    ...(update.highlight !== undefined
      ? update.highlight
        ? { highlight: true }
        : { highlight: undefined }
      : {}),
  };
}

const TrainingLogBulkEditor: React.FC = () => {
  const [activeLogId, setActiveLogId] = useState<string>(logConfigs[0].id);
  const [status, setStatus] = useState<EditorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<TrainingLogSection | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [selectedSk, setSelectedSk] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<RowErrorMap>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadSection = useCallback(async (logId: string) => {
    setStatus('loading');
    setError(null);
    setSaveMessage(null);
    setRowErrors({});
    setDrafts({});
    setSelectedSk({});

    try {
      const response = await fetch(`/api/training-log?sectionId=${logId}`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as TrainingLogSection;
      setSection(data);
      setStatus('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
    }
  }, []);

  React.useEffect(() => {
    void loadSection(activeLogId);
  }, [activeLogId, loadSection]);

  const sortedEntries = useMemo(() => {
    const entries = section?.entries ?? [];
    return [...entries].sort((a, b) => {
      const dateDelta = parseDate(b.date) - parseDate(a.date);
      if (dateDelta !== 0) return dateDelta;
      return a.sk.localeCompare(b.sk);
    });
  }, [section]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortedEntries.filter((entry) => {
      const inDateRange =
        (!startDate || entry.date >= startDate) &&
        (!endDate || entry.date <= endDate);

      if (!inDateRange) return false;
      if (!normalizedQuery) return true;

      return (
        entry.description.toLowerCase().includes(normalizedQuery) ||
        entry.sk.toLowerCase().includes(normalizedQuery) ||
        entry.date.includes(normalizedQuery)
      );
    });
  }, [sortedEntries, query, startDate, endDate]);

  const dirtyCount = useMemo(
    () =>
      sortedEntries.reduce((count, entry) => {
        return count + (hasDraftChanges(entry, drafts[entry.sk]) ? 1 : 0);
      }, 0),
    [sortedEntries, drafts],
  );

  const selectedCount = useMemo(
    () => Object.values(selectedSk).filter(Boolean).length,
    [selectedSk],
  );

  const selectedDirtyEntries = useMemo(() => {
    return sortedEntries.filter(
      (entry) => selectedSk[entry.sk] && hasDraftChanges(entry, drafts[entry.sk]),
    );
  }, [sortedEntries, selectedSk, drafts]);

  const onToggleSelectAllVisible = (checked: boolean) => {
    setSelectedSk((current) => {
      const next = { ...current };
      for (const entry of filteredEntries) {
        next[entry.sk] = checked;
      }
      return next;
    });
  };

  const onRowSelect = (sk: string, checked: boolean) => {
    setSelectedSk((current) => ({ ...current, [sk]: checked }));
  };

  const onDescriptionChange = (entry: TrainingLogEntry, value: string) => {
    setDrafts((current) => ({
      ...current,
      [entry.sk]: { ...initialDraft(entry), ...current[entry.sk], description: value },
    }));
  };

  const onMilesChange = (entry: TrainingLogEntry, value: string) => {
    if (!isDaily(entry)) return;

    const parsed = Number(value);
    setDrafts((current) => ({
      ...current,
      [entry.sk]: {
        ...initialDraft(entry),
        ...current[entry.sk],
        ...(Number.isFinite(parsed) ? { miles: parsed } : {}),
      },
    }));
  };

  const onHighlightChange = (entry: TrainingLogEntry, checked: boolean) => {
    if (!isDaily(entry)) return;

    setDrafts((current) => ({
      ...current,
      [entry.sk]: {
        ...initialDraft(entry),
        ...current[entry.sk],
        highlight: checked,
      },
    }));
  };

  const onSaveSelected = async () => {
    if (!section || selectedDirtyEntries.length === 0) return;

    setIsSaving(true);
    setSaveMessage(null);
    setRowErrors({});

    const updates: TrainingLogBatchUpdateItem[] = selectedDirtyEntries.map((entry) => {
      const draft = drafts[entry.sk] ?? {};
      const next: TrainingLogBatchUpdateItem = { sk: entry.sk };

      if (draft.description !== undefined && draft.description !== entry.description) {
        next.description = draft.description;
      }

      if (isDaily(entry)) {
        if (draft.miles !== undefined && draft.miles !== entry.miles) {
          next.miles = draft.miles;
        }
        if (
          draft.highlight !== undefined &&
          draft.highlight !== Boolean(entry.highlight)
        ) {
          next.highlight = draft.highlight;
        }
      }

      return next;
    });

    try {
      const response = await fetch('/api/training-log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId: section.id, updates }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      const result = (await response.json()) as TrainingLogBatchUpdateResponse;
      const updateBySk = new Map(updates.map((update) => [update.sk, update]));

      setSection((current) => {
        if (!current) return current;

        const succeeded = new Set(
          result.results.filter((row) => row.success).map((row) => row.sk),
        );

        return {
          ...current,
          entries: current.entries.map((entry) => {
            if (!succeeded.has(entry.sk)) return entry;
            return nextEntry(entry, updateBySk.get(entry.sk) ?? { sk: entry.sk });
          }),
        };
      });

      setDrafts((current) => {
        const next = { ...current };
        for (const row of result.results) {
          if (row.success) {
            delete next[row.sk];
          }
        }
        return next;
      });

      const nextRowErrors: RowErrorMap = {};
      for (const row of result.results) {
        if (!row.success && row.error) {
          nextRowErrors[row.sk] = row.error;
        }
      }
      setRowErrors(nextRowErrors);

      setSaveMessage(
        `Saved ${result.successCount} updates.${
          result.failureCount > 0
            ? ` ${result.failureCount} failed rows need attention.`
            : ''
        }`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown save error';
      setSaveMessage(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const allVisibleSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((entry) => Boolean(selectedSk[entry.sk]));

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => void loadSection(activeLogId)} disabled={status === 'loading'}>
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={onSaveSelected}
                disabled={isSaving || selectedDirtyEntries.length === 0}
                loading={isSaving}
              >
                Save selected changes ({selectedDirtyEntries.length})
              </Button>
            </SpaceBetween>
          }
        >
          Training Log Bulk Editor
        </Header>
      }
    >
      <SpaceBetween size="m">
        <SegmentedControl
          selectedId={activeLogId}
          onChange={({ detail }) => setActiveLogId(detail.selectedId)}
          options={logConfigs.map((config) => ({ id: config.id, text: config.name }))}
        />

        <SpaceBetween direction="horizontal" size="l">
          <FormField label="Search">
            <Input
              value={query}
              onChange={({ detail }) => setQuery(detail.value)}
              placeholder="description, date, or key"
            />
          </FormField>

          <FormField label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </FormField>

          <FormField label="End date">
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </FormField>
        </SpaceBetween>

        <Box color="text-body-secondary">
          {filteredEntries.length} rows visible, {selectedCount} selected, {dirtyCount} dirty
        </Box>

        {saveMessage && (
          <StatusIndicator type={saveMessage.includes('failed') ? 'warning' : 'success'}>
            {saveMessage}
          </StatusIndicator>
        )}

        {status === 'loading' && (
          <Box textAlign="center" padding={{ vertical: 'l' }}>
            <Spinner size="large" />
          </Box>
        )}

        {status === 'error' && error && (
          <StatusIndicator type="error">{error}</StatusIndicator>
        )}

        {status === 'loaded' && section && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8 }}>
                    <Checkbox
                      checked={allVisibleSelected}
                      onChange={({ detail }) => onToggleSelectAllVisible(detail.checked)}
                      ariaLabel="Select all visible rows"
                    />
                  </th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Date</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Type</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Slot</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Description</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Miles</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Highlight</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>State</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const draft = drafts[entry.sk];
                  const isDirty = hasDraftChanges(entry, draft);
                  const rowError = rowErrors[entry.sk];
                  const description = draft?.description ?? entry.description;
                  const miles = isDaily(entry)
                    ? String(draft?.miles ?? entry.miles)
                    : 'n/a';
                  const highlight = isDaily(entry)
                    ? Boolean(draft?.highlight ?? entry.highlight)
                    : false;

                  return (
                    <tr key={entry.sk} style={isDirty ? { background: '#f3fbff' } : undefined}>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8 }}>
                        <Checkbox
                          checked={Boolean(selectedSk[entry.sk])}
                          onChange={({ detail }) => onRowSelect(entry.sk, detail.checked)}
                          ariaLabel={`Select ${entry.sk}`}
                        />
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, whiteSpace: 'nowrap' }}>
                        {entry.date}
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8 }}>{entry.entryType}</td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8 }}>
                        {entry.entryType === 'daily' ? entry.slot : '—'}
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, minWidth: 480 }}>
                        <Textarea
                          value={description}
                          rows={3}
                          onChange={({ detail }) => onDescriptionChange(entry, detail.value)}
                          ariaLabel={`Description ${entry.sk}`}
                        />
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, width: 120 }}>
                        {isDaily(entry) ? (
                          <Input
                            value={miles}
                            type="number"
                            step={0.1}
                            onChange={({ detail }) => onMilesChange(entry, detail.value)}
                            ariaLabel={`Miles ${entry.sk}`}
                          />
                        ) : (
                          <Box color="text-body-secondary">n/a</Box>
                        )}
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, width: 120 }}>
                        {isDaily(entry) ? (
                          <Checkbox
                            checked={highlight}
                            onChange={({ detail }) => onHighlightChange(entry, detail.checked)}
                            ariaLabel={`Highlight ${entry.sk}`}
                          />
                        ) : (
                          <Box color="text-body-secondary">n/a</Box>
                        )}
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, minWidth: 220 }}>
                        {rowError ? (
                          <StatusIndicator type="error">{rowError}</StatusIndicator>
                        ) : isDirty ? (
                          <StatusIndicator type="info">Dirty</StatusIndicator>
                        ) : (
                          <StatusIndicator type="success">Clean</StatusIndicator>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SpaceBetween>
    </Container>
  );
};

export default TrainingLogBulkEditor;
