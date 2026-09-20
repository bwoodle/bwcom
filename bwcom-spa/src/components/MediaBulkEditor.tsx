"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@cloudscape-design/components";
import {
  applyMediaBatchUpdateItem,
  buildMediaBatchUpdateItem,
  formatMediaRating,
  hasMediaDraftChanges,
  type MediaEditorDraft,
} from "../lib/media";
import { buildAdminAuthHeaders } from "../lib/admin-auth";
import type {
  MediaBatchUpdateResponse,
  MediaCreateRequest,
  MediaCreateResponse,
  MediaFormat,
  MediaItem,
  MediaRating,
} from "../types/media";

type MediaApiResponse = {
  months: Array<{
    monthKey: string;
    label: string;
    items: MediaItem[];
  }>;
};

type EditorStatus = "idle" | "loading" | "loaded" | "error";

const formatOptions: MediaFormat[] = [
  "book",
  "audiobook",
  "kindle",
  "movie",
  "tv",
  "podcast",
];

const MediaBulkEditor: React.FC = () => {
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, MediaEditorDraft>>({});
  const [selectedRow, setSelectedRow] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const [newMonthKey, setNewMonthKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newFormat, setNewFormat] = useState<MediaFormat>("book");
  const [newComments, setNewComments] = useState("");
  const [newRating, setNewRating] = useState<"" | `${MediaRating}`>("");
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const resetEditorState = useCallback(() => {
    setStatus("loading");
    setError(null);
    setDrafts({});
    setSelectedRow({});
    setRowErrors({});
    setSaveMessage(null);
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const pages: MediaApiResponse[] = [];
      let cursor: string | null = null;

      for (let page = 0; page < 20; page += 1) {
        const params = new URLSearchParams({ limit: "1000" });
        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await fetch(`/api/media?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as MediaApiResponse & {
          nextCursor?: string | null;
        };
        pages.push(data);

        cursor =
          typeof data.nextCursor === "string" && data.nextCursor.length > 0
            ? data.nextCursor
            : null;
        if (!cursor) {
          break;
        }
      }

      const nextItems = pages.flatMap((page) =>
        (page.months ?? []).flatMap((month) => month.items ?? []),
      );
      nextItems.sort((a, b) => {
        const monthDelta = b.monthKey.localeCompare(a.monthKey);
        if (monthDelta !== 0) return monthDelta;
        return a.title.localeCompare(b.title);
      });
      setItems(nextItems);
      setStatus("loaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown load error";
      setError(message);
      setStatus("error");
    }
  }, []);

  const refreshItems = useCallback(() => {
    resetEditorState();
    void loadItems();
  }, [loadItems, resetEditorState]);

  useEffect(() => {
    // The effect triggers an async fetch; state updates happen from the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        (item.author ?? "").toLowerCase().includes(normalizedQuery) ||
        item.format.toLowerCase().includes(normalizedQuery) ||
        (item.comments ?? "").toLowerCase().includes(normalizedQuery) ||
        item.monthKey.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [items, query, monthFilter]);

  const monthOptions = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.monthKey))).sort((a, b) =>
        b.localeCompare(a),
      ),
    [items],
  );

  const selectedCount = useMemo(
    () => Object.values(selectedRow).filter(Boolean).length,
    [selectedRow],
  );

  const dirtyCount = useMemo(
    () =>
      items.reduce(
        (count, item) =>
          count +
          (hasMediaDraftChanges(item, drafts[`${item.monthKey}|${item.sk}`])
            ? 1
            : 0),
        0,
      ),
    [items, drafts],
  );

  const selectedDirtyItems = useMemo(
    () =>
      items.filter((item) => {
        const rowKey = `${item.monthKey}|${item.sk}`;
        return (
          selectedRow[rowKey] && hasMediaDraftChanges(item, drafts[rowKey])
        );
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

  const onRatingChange = (item: MediaItem, value: string) => {
    const rowKey = `${item.monthKey}|${item.sk}`;
    setDrafts((current) => {
      const nextDraft = { ...(current[rowKey] ?? {}) };

      if (value.length === 0) {
        if (item.rating === undefined) {
          delete nextDraft.rating;
        } else {
          nextDraft.rating = null;
        }
      } else {
        nextDraft.rating = Number(value) as MediaRating;
      }

      return {
        ...current,
        [rowKey]: nextDraft,
      };
    });
  };

  const onSaveSelected = async () => {
    if (selectedDirtyItems.length === 0) return;

    setIsSaving(true);
    setSaveMessage(null);
    setRowErrors({});

    const updates = selectedDirtyItems.map((item) =>
      buildMediaBatchUpdateItem(item, drafts[`${item.monthKey}|${item.sk}`]),
    );

    try {
      const response = await fetch("/api/media", {
        method: "PATCH",
        headers: buildAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      const result = (await response.json()) as MediaBatchUpdateResponse;
      const updatesByKey = new Map(
        updates.map((update) => [`${update.monthKey}|${update.sk}`, update]),
      );

      setItems((current) => {
        const successKeys = new Set(
          result.results
            .filter((row) => row.success)
            .map((row) => `${row.monthKey}|${row.sk}`),
        );
        return current.map((item) => {
          const rowKey = `${item.monthKey}|${item.sk}`;
          if (!successKeys.has(rowKey)) return item;
          return applyMediaBatchUpdateItem(
            item,
            updatesByKey.get(rowKey) ?? {
              monthKey: item.monthKey,
              sk: item.sk,
            },
          );
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
        `Saved ${result.successCount} updates.${result.failureCount > 0 ? ` ${result.failureCount} failed rows need attention.` : ""}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown save error";
      setSaveMessage(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onCreateEntry = async () => {
    setCreateMessage(null);

    if (!/^\d{4}-\d{2}$/.test(newMonthKey)) {
      setCreateMessage("monthKey must be in YYYY-MM format.");
      return;
    }
    if (!newTitle.trim()) {
      setCreateMessage("Title is required.");
      return;
    }

    const payload: MediaCreateRequest = {
      monthKey: newMonthKey,
      title: newTitle.trim(),
      ...(newAuthor.trim() ? { author: newAuthor.trim() } : {}),
      format: newFormat,
      ...(newComments.trim() ? { comments: newComments.trim() } : {}),
      ...(newRating ? { rating: Number(newRating) as MediaRating } : {}),
    };

    setIsCreating(true);
    try {
      const response = await fetch("/api/media", {
        method: "POST",
        headers: buildAdminAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.error || `Create failed with status ${response.status}`,
        );
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

      setCreateMessage("Media entry created.");
      setNewTitle("");
      setNewAuthor("");
      setNewComments("");
      setNewRating("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown create error";
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
              <Button onClick={refreshItems} disabled={status === "loading"}>
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
                  onChange={(event) =>
                    setNewFormat(event.target.value as MediaFormat)
                  }
                >
                  {formatOptions.map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Rating (optional)">
                <select
                  value={newRating}
                  onChange={(event) =>
                    setNewRating(event.target.value as "" | `${MediaRating}`)
                  }
                >
                  <option value="">Unrated</option>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <option key={rating} value={String(rating)}>
                      {formatMediaRating(rating as MediaRating)}
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
              <Button
                variant="primary"
                onClick={onCreateEntry}
                loading={isCreating}
              >
                Add media
              </Button>
              {createMessage && (
                <StatusIndicator
                  type={
                    createMessage.startsWith("Create failed")
                      ? "error"
                      : "success"
                  }
                >
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
          {filteredItems.length} rows visible, {selectedCount} selected,{" "}
          {dirtyCount} dirty
        </Box>

        {saveMessage && (
          <StatusIndicator
            type={saveMessage.includes("failed") ? "warning" : "success"}
          >
            {saveMessage}
          </StatusIndicator>
        )}

        {status === "loading" && (
          <Box textAlign="center" padding={{ vertical: "l" }}>
            <Spinner size="large" />
          </Box>
        )}

        {status === "error" && error && (
          <StatusIndicator type="error">{error}</StatusIndicator>
        )}

        {status === "loaded" && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 900,
              }}
            >
              <thead>
                <tr>
                  <th style={{ borderBottom: "1px solid #d5dbdb", padding: 8 }}>
                    <Checkbox
                      checked={allVisibleSelected}
                      onChange={({ detail }) =>
                        onToggleSelectAllVisible(detail.checked)
                      }
                      ariaLabel="Select all visible rows"
                    />
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #d5dbdb",
                      padding: 8,
                      textAlign: "left",
                    }}
                  >
                    Month
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #d5dbdb",
                      padding: 8,
                      textAlign: "left",
                    }}
                  >
                    Entry
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #d5dbdb",
                      padding: 8,
                      textAlign: "left",
                    }}
                  >
                    Details
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #d5dbdb",
                      padding: 8,
                      textAlign: "left",
                    }}
                  >
                    State
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const rowKey = `${item.monthKey}|${item.sk}`;
                  const draft = drafts[rowKey];
                  const isDirty = hasMediaDraftChanges(item, draft);
                  const rowError = rowErrors[rowKey];

                  return (
                    <tr
                      key={rowKey}
                      style={isDirty ? { background: "#f3fbff" } : undefined}
                    >
                      <td
                        style={{
                          borderBottom: "1px solid #eaeded",
                          padding: 8,
                        }}
                      >
                        <Checkbox
                          checked={Boolean(selectedRow[rowKey])}
                          onChange={({ detail }) =>
                            onSelectRow(item, detail.checked)
                          }
                          ariaLabel={`Select ${item.title}`}
                        />
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #eaeded",
                          padding: 8,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.monthKey}
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #eaeded",
                          padding: 8,
                          minWidth: 320,
                        }}
                      >
                        <SpaceBetween size="s">
                          <FormField label="Title">
                            <Input
                              value={draft?.title ?? item.title}
                              onChange={({ detail }) =>
                                onTitleChange(item, detail.value)
                              }
                              ariaLabel={`Title ${item.title}`}
                            />
                          </FormField>
                          <FormField label="Author">
                            <Input
                              value={draft?.author ?? item.author ?? ""}
                              onChange={({ detail }) =>
                                onAuthorChange(item, detail.value)
                              }
                              ariaLabel={`Author ${item.title}`}
                            />
                          </FormField>
                          <FormField label="Format">
                            <select
                              value={draft?.format ?? item.format}
                              onChange={(event) =>
                                onFormatChange(
                                  item,
                                  event.target.value as MediaFormat,
                                )
                              }
                              aria-label={`Format ${item.title}`}
                            >
                              {formatOptions.map((format) => (
                                <option key={format} value={format}>
                                  {format}
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </SpaceBetween>
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #eaeded",
                          padding: 8,
                          minWidth: 320,
                        }}
                      >
                        <SpaceBetween size="s">
                          <FormField label="Comments">
                            <Textarea
                              value={draft?.comments ?? item.comments ?? ""}
                              onChange={({ detail }) =>
                                onCommentsChange(item, detail.value)
                              }
                              rows={3}
                              ariaLabel={`Comments ${item.title}`}
                            />
                          </FormField>
                          <FormField label="Rating">
                            <select
                              value={
                                draft?.rating !== undefined
                                  ? draft.rating === null
                                    ? ""
                                    : String(draft.rating)
                                  : item.rating !== undefined
                                    ? String(item.rating)
                                    : ""
                              }
                              onChange={(event) =>
                                onRatingChange(item, event.target.value)
                              }
                              aria-label={`Rating ${item.title}`}
                            >
                              <option value="">Unrated</option>
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <option key={rating} value={String(rating)}>
                                  {formatMediaRating(rating as MediaRating)}
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </SpaceBetween>
                      </td>
                      <td
                        style={{
                          borderBottom: "1px solid #eaeded",
                          padding: 8,
                          minWidth: 180,
                        }}
                      >
                        {rowError ? (
                          <StatusIndicator type="error">
                            {rowError}
                          </StatusIndicator>
                        ) : isDirty ? (
                          <StatusIndicator type="info">Dirty</StatusIndicator>
                        ) : (
                          <StatusIndicator type="success">
                            Clean
                          </StatusIndicator>
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
