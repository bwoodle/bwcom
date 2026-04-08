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
} from '@cloudscape-design/components';
import type {
  MediaBatchUpdateItem,
  MediaBatchUpdateResponse,
  MediaCreateRequest,
  MediaCreateResponse,
  MediaFormat,
  MediaItem,
} from '@/types/media';

type MediaApiResponse = {
  months: Array<{
    monthKey: string;
    label: string;
    items: MediaItem[];
  }>;
};

type RowDraft = {
  title?: string;
  author?: string;
  format?: MediaFormat;
  comments?: string;
};

type EditorStatus = 'idle' | 'loading' | 'loaded' | 'error';

const formatOptions: MediaFormat[] = [
  'book',
  'audiobook',
  'kindle',
  'movie',
  'tv',
  'podcast',
];

function hasChanges(item: MediaItem, draft: RowDraft | undefined): boolean {
  if (!draft) return false;
  if (draft.title !== undefined && draft.title !== item.title) return true;
  if (draft.author !== undefined && draft.author !== (item.author ?? '')) return true;
  if (draft.format !== undefined && draft.format !== item.format) return true;

  const originalComments = item.comments ?? '';
  if (draft.comments !== undefined && draft.comments !== originalComments) return true;

  return false;
}

function nextItem(item: MediaItem, update: MediaBatchUpdateItem): MediaItem {
  const next: MediaItem = {
    ...item,
    ...(update.title !== undefined ? { title: update.title } : {}),
    ...(update.author !== undefined && update.author !== null ? { author: update.author } : {}),
    ...(update.format !== undefined ? { format: update.format } : {}),
  };

  if (update.author === null) {
    delete next.author;
  }

  if (update.comments !== undefined) {
    if (update.comments === null) {
      delete next.comments;
    } else {
      next.comments = update.comments;
    }
  }

  return next;
}

const MediaBulkEditor: React.FC = () => {
  const [status, setStatus] = useState<EditorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [selectedRow, setSelectedRow] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const [newMonthKey, setNewMonthKey] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newFormat, setNewFormat] = useState<MediaFormat>('book');
  const [newComments, setNewComments] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setDrafts({});
    setSelectedRow({});
    setRowErrors({});
    setSaveMessage(null);

    try {
      const pages: MediaApiResponse[] = [];
      let cursor: string | null = null;

      for (let page = 0; page < 20; page += 1) {
        const params = new URLSearchParams({ limit: '1000' });
        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(`/api/media?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as MediaApiResponse & { nextCursor?: string | null };
        pages.push(data);

        cursor = typeof data.nextCursor === 'string' && data.nextCursor.length > 0
          ? data.nextCursor
          : null;
        if (!cursor) {
          break;
        }
      }

      const nextItems = pages.flatMap((page) => (page.months ?? []).flatMap((month) => month.items ?? []));
      nextItems.sort((a, b) => {
        const monthDelta = b.monthKey.localeCompare(a.monthKey);
        if (monthDelta !== 0) return monthDelta;
        return a.title.localeCompare(b.title);
      });
      setItems(nextItems);
      setStatus('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown load error';
      setError(message);
      setStatus('error');
    }
  }, []);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (monthFilter && item.monthKey !== monthFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        item.title.toLowerCase().includes(normalizedQuery) ||
        (item.author ?? '').toLowerCase().includes(normalizedQuery) ||
        item.format.toLowerCase().includes(normalizedQuery) ||
        (item.comments ?? '').toLowerCase().includes(normalizedQuery) ||
        item.monthKey.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [items, query, monthFilter]);

  const monthOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.monthKey))).sort((a, b) => b.localeCompare(a)),
    [items],
  );

  const selectedCount = useMemo(
    () => Object.values(selectedRow).filter(Boolean).length,
    [selectedRow],
  );

  const dirtyCount = useMemo(
    () => items.reduce((count, item) => count + (hasChanges(item, drafts[`${item.monthKey}|${item.sk}`]) ? 1 : 0), 0),
    [items, drafts],
  );

  const selectedDirtyItems = useMemo(
    () =>
      items.filter((item) => {
        const rowKey = `${item.monthKey}|${item.sk}`;
        return selectedRow[rowKey] && hasChanges(item, drafts[rowKey]);
      }),
    [items, selectedRow, drafts],
  );

  const onToggleSelectAllVisible = (checked: boolean) => {
    setSelectedRow((current) => {
      const next = { ...current };
      for (const item of filteredItems) {
        next[`${item.monthKey}|${item.sk}`] = checked;
      }
      return next;
    });
  };

  const onSelectRow = (item: MediaItem, checked: boolean) => {
    const rowKey = `${item.monthKey}|${item.sk}`;
    setSelectedRow((current) => ({ ...current, [rowKey]: checked }));
  };

  const onTitleChange = (item: MediaItem, value: string) => {
    const rowKey = `${item.monthKey}|${item.sk}`;
    setDrafts((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        title: value,
      },
    }));
  };

  const onFormatChange = (item: MediaItem, value: MediaFormat) => {
    const rowKey = `${item.monthKey}|${item.sk}`;
    setDrafts((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        format: value,
      },
    }));
  };

  const onAuthorChange = (item: MediaItem, value: string) => {
    const rowKey = `${item.monthKey}|${item.sk}`;
    setDrafts((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        author: value,
      },
    }));
  };

  const onCommentsChange = (item: MediaItem, value: string) => {
    const rowKey = `${item.monthKey}|${item.sk}`;
    setDrafts((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        comments: value,
      },
    }));
  };

  const onSaveSelected = async () => {
    if (selectedDirtyItems.length === 0) return;

    setIsSaving(true);
    setSaveMessage(null);
    setRowErrors({});

    const updates: MediaBatchUpdateItem[] = selectedDirtyItems.map((item) => {
      const rowKey = `${item.monthKey}|${item.sk}`;
      const draft = drafts[rowKey] ?? {};
      const next: MediaBatchUpdateItem = {
        monthKey: item.monthKey,
        sk: item.sk,
      };

      if (draft.title !== undefined && draft.title !== item.title) {
        next.title = draft.title;
      }
      if (draft.author !== undefined) {
        const normalized = draft.author.trim();
        const original = (item.author ?? '').trim();
        if (normalized !== original) {
          next.author = normalized.length === 0 ? null : draft.author;
        }
      }
      if (draft.format !== undefined && draft.format !== item.format) {
        next.format = draft.format;
      }
      if (draft.comments !== undefined) {
        const normalized = draft.comments.trim();
        const original = (item.comments ?? '').trim();
        if (normalized !== original) {
          next.comments = normalized.length === 0 ? null : draft.comments;
        }
      }

      return next;
    });

    try {
      const response = await fetch('/api/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      const result = (await response.json()) as MediaBatchUpdateResponse;
      const updatesByKey = new Map(updates.map((update) => [`${update.monthKey}|${update.sk}`, update]));

      setItems((current) => {
        const successKeys = new Set(
          result.results
            .filter((row) => row.success)
            .map((row) => `${row.monthKey}|${row.sk}`),
        );
        return current.map((item) => {
          const rowKey = `${item.monthKey}|${item.sk}`;
          if (!successKeys.has(rowKey)) return item;
          return nextItem(item, updatesByKey.get(rowKey) ?? { monthKey: item.monthKey, sk: item.sk });
        });
      });

      setDrafts((current) => {
        const next = { ...current };
        for (const row of result.results) {
          if (row.success) {
            delete next[`${row.monthKey}|${row.sk}`];
          }
        }
        return next;
      });

      const nextErrors: Record<string, string> = {};
      for (const row of result.results) {
        if (!row.success && row.error) {
          nextErrors[`${row.monthKey}|${row.sk}`] = row.error;
        }
      }
      setRowErrors(nextErrors);

      setSaveMessage(
        `Saved ${result.successCount} updates.${result.failureCount > 0 ? ` ${result.failureCount} failed rows need attention.` : ''}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown save error';
      setSaveMessage(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onCreateEntry = async () => {
    setCreateMessage(null);

    if (!/^\d{4}-\d{2}$/.test(newMonthKey)) {
      setCreateMessage('monthKey must be in YYYY-MM format.');
      return;
    }
    if (!newTitle.trim()) {
      setCreateMessage('Title is required.');
      return;
    }

    const payload: MediaCreateRequest = {
      monthKey: newMonthKey,
      title: newTitle.trim(),
      ...(newAuthor.trim() ? { author: newAuthor.trim() } : {}),
      format: newFormat,
      ...(newComments.trim() ? { comments: newComments.trim() } : {}),
    };

    setIsCreating(true);
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || `Create failed with status ${response.status}`);
      }

      const result = body as MediaCreateResponse;
      setItems((current) => {
        const next = [result.entry, ...current];
        next.sort((a, b) => {
          const monthDelta = b.monthKey.localeCompare(a.monthKey);
          if (monthDelta !== 0) return monthDelta;
          return a.title.localeCompare(b.title);
        });
        return next;
      });

      setCreateMessage('Media entry created.');
      setNewTitle('');
      setNewAuthor('');
      setNewComments('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown create error';
      setCreateMessage(`Create failed: ${message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedRow[`${item.monthKey}|${item.sk}`]);

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => void loadItems()} disabled={status === 'loading'}>
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={onSaveSelected}
                disabled={isSaving || selectedDirtyItems.length === 0}
                loading={isSaving}
              >
                Save selected changes ({selectedDirtyItems.length})
              </Button>
            </SpaceBetween>
          }
        >
          Media Bulk Editor
        </Header>
      }
    >
      <SpaceBetween size="m">
        <Container header={<Header variant="h3">Add Media Entry</Header>}>
          <SpaceBetween size="m">
            <SpaceBetween direction="horizontal" size="l">
              <FormField label="Month (YYYY-MM)">
                <Input
                  value={newMonthKey}
                  onChange={({ detail }) => setNewMonthKey(detail.value)}
                  placeholder="2026-03"
                />
              </FormField>

              <FormField label="Format">
                <select
                  value={newFormat}
                  onChange={(event) => setNewFormat(event.target.value as MediaFormat)}
                >
                  {formatOptions.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </FormField>
            </SpaceBetween>

            <FormField label="Title">
              <Input
                value={newTitle}
                onChange={({ detail }) => setNewTitle(detail.value)}
              />
            </FormField>

            <FormField label="Author (optional)">
              <Input
                value={newAuthor}
                onChange={({ detail }) => setNewAuthor(detail.value)}
              />
            </FormField>

            <FormField label="Comments (optional)">
              <Textarea
                value={newComments}
                onChange={({ detail }) => setNewComments(detail.value)}
                rows={3}
              />
            </FormField>

            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="primary" onClick={onCreateEntry} loading={isCreating}>
                Add media
              </Button>
              {createMessage && (
                <StatusIndicator type={createMessage.startsWith('Create failed') ? 'error' : 'success'}>
                  {createMessage}
                </StatusIndicator>
              )}
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        <SpaceBetween direction="horizontal" size="l">
          <FormField label="Search">
            <Input
              value={query}
              onChange={({ detail }) => setQuery(detail.value)}
              placeholder="title, author, format, comments"
            />
          </FormField>

          <FormField label="Month filter">
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="">All months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </FormField>
        </SpaceBetween>

        <Box color="text-body-secondary">
          {filteredItems.length} rows visible, {selectedCount} selected, {dirtyCount} dirty
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

        {status === 'error' && error && <StatusIndicator type="error">{error}</StatusIndicator>}

        {status === 'loaded' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8 }}>
                    <Checkbox
                      checked={allVisibleSelected}
                      onChange={({ detail }) => onToggleSelectAllVisible(detail.checked)}
                      ariaLabel="Select all visible rows"
                    />
                  </th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Month</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Title</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Author</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Format</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>Comments</th>
                  <th style={{ borderBottom: '1px solid #d5dbdb', padding: 8, textAlign: 'left' }}>State</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const rowKey = `${item.monthKey}|${item.sk}`;
                  const draft = drafts[rowKey];
                  const isDirty = hasChanges(item, draft);
                  const rowError = rowErrors[rowKey];

                  return (
                    <tr key={rowKey} style={isDirty ? { background: '#f3fbff' } : undefined}>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8 }}>
                        <Checkbox
                          checked={Boolean(selectedRow[rowKey])}
                          onChange={({ detail }) => onSelectRow(item, detail.checked)}
                          ariaLabel={`Select ${item.title}`}
                        />
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, whiteSpace: 'nowrap' }}>
                        {item.monthKey}
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, minWidth: 280 }}>
                        <Input
                          value={draft?.title ?? item.title}
                          onChange={({ detail }) => onTitleChange(item, detail.value)}
                          ariaLabel={`Title ${item.title}`}
                        />
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, minWidth: 220 }}>
                        <Input
                          value={draft?.author ?? item.author ?? ''}
                          onChange={({ detail }) => onAuthorChange(item, detail.value)}
                          ariaLabel={`Author ${item.title}`}
                        />
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, minWidth: 150 }}>
                        <select
                          value={draft?.format ?? item.format}
                          onChange={(event) => onFormatChange(item, event.target.value as MediaFormat)}
                          aria-label={`Format ${item.title}`}
                        >
                          {formatOptions.map((format) => (
                            <option key={format} value={format}>
                              {format}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ borderBottom: '1px solid #eaeded', padding: 8, minWidth: 420 }}>
                        <Textarea
                          value={draft?.comments ?? item.comments ?? ''}
                          onChange={({ detail }) => onCommentsChange(item, detail.value)}
                          rows={2}
                          ariaLabel={`Comments ${item.title}`}
                        />
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

export default MediaBulkEditor;
