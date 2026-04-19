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
  SegmentedControl,
  SpaceBetween,
  Spinner,
  StatusIndicator,
  Textarea,
} from "@cloudscape-design/components";

import { hasRaceDraftChanges, nextRaceItem } from "@/lib/races";
import type {
  RaceBatchUpdateItem,
  RaceBatchUpdateResponse,
  RaceCreateRequest,
  RaceCreateResponse,
  RaceDraft,
  RaceItem,
  RaceValidationState,
} from "@/types/races";

type RaceApiResponse = {
  races: RaceItem[];
  nextCursor?: string | null;
};

type EditorStatus = "loading" | "loaded" | "error";
type FilterMode = "staged" | "legacy" | "all";

const RaceBulkEditor: React.FC = () => {
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RaceItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RaceDraft>>({});
  const [selectedRow, setSelectedRow] = useState<Record<string, boolean>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("staged");

  const [newDate, setNewDate] = useState("");
  const [newDistance, setNewDistance] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newVdot, setNewVdot] = useState("");
  const [newName, setNewName] = useState("");
  const [newComments, setNewComments] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const pages: RaceApiResponse[] = [];
      let cursor: string | null = null;

      for (let page = 0; page < 20; page += 1) {
        const params = new URLSearchParams({ limit: "1000" });
        if (cursor) {
          params.set("cursor", cursor);
        }

        const response = await fetch(`/api/races?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as RaceApiResponse;
        pages.push(data);
        cursor =
          typeof data.nextCursor === "string" && data.nextCursor.length > 0
            ? data.nextCursor
            : null;
        if (!cursor) {
          break;
        }
      }

      const nextItems = pages.flatMap((page) => page.races ?? []);
      nextItems.sort((a, b) => b.sk.localeCompare(a.sk));
      setItems(nextItems);
      setStatus("loaded");
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unknown load error";
      setError(message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // The effect triggers an async fetch; state updates happen from the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filterMode === "staged") {
        if (
          item.source !== "legacy-spreadsheet" ||
          item.validationState !== "staged"
        ) {
          return false;
        }
      } else if (
        filterMode === "legacy" &&
        item.source !== "legacy-spreadsheet"
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return (
        item.date.toLowerCase().includes(normalizedQuery) ||
        item.distance.toLowerCase().includes(normalizedQuery) ||
        item.time.toLowerCase().includes(normalizedQuery) ||
        (item.name ?? "").toLowerCase().includes(normalizedQuery) ||
        (item.comments ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filterMode, items, query]);

  const selectedDirtyItems = useMemo(
    () =>
      items.filter((item) => {
        const rowKey = `${item.yearKey}|${item.sk}`;
        return selectedRow[rowKey] && hasRaceDraftChanges(item, drafts[rowKey]);
      }),
    [drafts, items, selectedRow],
  );

  const onSelectRow = (item: RaceItem, checked: boolean) => {
    const rowKey = `${item.yearKey}|${item.sk}`;
    setSelectedRow((current) => ({ ...current, [rowKey]: checked }));
  };

  const onToggleSelectAllVisible = (checked: boolean) => {
    setSelectedRow((current) => {
      const next = { ...current };
      for (const item of filteredItems) {
        next[`${item.yearKey}|${item.sk}`] = checked;
      }
      return next;
    });
  };

  const updateDraft = (item: RaceItem, patch: RaceDraft) => {
    const rowKey = `${item.yearKey}|${item.sk}`;
    setDrafts((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        ...patch,
      },
    }));
  };

  const onSaveSelected = async () => {
    if (selectedDirtyItems.length === 0) return;

    setIsSaving(true);
    setRowErrors({});
    setSaveMessage(null);

    const updates: RaceBatchUpdateItem[] = selectedDirtyItems.map((item) => {
      const rowKey = `${item.yearKey}|${item.sk}`;
      const draft = drafts[rowKey] ?? {};
      const update: RaceBatchUpdateItem = {
        yearKey: item.yearKey,
        sk: item.sk,
      };

      if (draft.time !== undefined && draft.time !== item.time) {
        update.time = draft.time;
      }
      if (draft.vdot !== undefined && draft.vdot !== item.vdot) {
        update.vdot = draft.vdot;
      }
      if (draft.name !== undefined) {
        update.name = draft.name.trim() ? draft.name.trim() : null;
      }
      if (draft.comments !== undefined) {
        update.comments = draft.comments.trim() ? draft.comments : null;
      }
      if (
        draft.validationState !== undefined &&
        draft.validationState !== item.validationState
      ) {
        update.validationState = draft.validationState;
      }

      return update;
    });

    try {
      const response = await fetch("/api/races", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      const result = (await response.json()) as RaceBatchUpdateResponse;
      const updatesByKey = new Map(
        updates.map((update) => [`${update.yearKey}|${update.sk}`, update]),
      );

      setItems((current) => {
        const successKeys = new Set(
          result.results
            .filter((row) => row.success)
            .map((row) => `${row.yearKey}|${row.sk}`),
        );

        return current.map((item) => {
          const rowKey = `${item.yearKey}|${item.sk}`;
          if (!successKeys.has(rowKey)) return item;
          return nextRaceItem(
            item,
            updatesByKey.get(rowKey) ?? { yearKey: item.yearKey, sk: item.sk },
          );
        });
      });

      setDrafts((current) => {
        const next = { ...current };
        for (const row of result.results) {
          if (row.success) {
            delete next[`${row.yearKey}|${row.sk}`];
          }
        }
        return next;
      });

      const nextErrors: Record<string, string> = {};
      for (const row of result.results) {
        if (!row.success && row.error) {
          nextErrors[`${row.yearKey}|${row.sk}`] = row.error;
        }
      }
      setRowErrors(nextErrors);
      setSaveMessage(
        `Saved ${result.successCount} updates.${result.failureCount > 0 ? ` ${result.failureCount} failed rows need attention.` : ""}`,
      );
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unknown save error";
      setSaveMessage(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onCreateRace = async () => {
    setCreateMessage(null);
    const parsedVdot = Number(newVdot);
    if (!newDate) {
      setCreateMessage("Date is required.");
      return;
    }
    if (!newDistance.trim()) {
      setCreateMessage("Distance is required.");
      return;
    }
    if (!newTime.trim()) {
      setCreateMessage("Time is required.");
      return;
    }
    if (!Number.isFinite(parsedVdot)) {
      setCreateMessage("VDOT must be a valid number.");
      return;
    }

    const payload: RaceCreateRequest = {
      date: newDate,
      distance: newDistance.trim(),
      time: newTime.trim(),
      vdot: parsedVdot,
      ...(newName.trim() ? { name: newName.trim() } : {}),
      ...(newComments.trim() ? { comments: newComments.trim() } : {}),
    };

    setIsCreating(true);
    try {
      const response = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.error || `Create failed with status ${response.status}`,
        );
      }

      const result = body as RaceCreateResponse;
      setItems((current) => [result.entry, ...current]);
      setCreateMessage("Race created.");
      setNewDate("");
      setNewDistance("");
      setNewTime("");
      setNewVdot("");
      setNewName("");
      setNewComments("");
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Unknown create error";
      setCreateMessage(`Create failed: ${message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedRow[`${item.yearKey}|${item.sk}`]);

  return (
    <Container
      header={
        <Header
          variant="h2"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                onClick={() => void loadItems()}
                disabled={status === "loading"}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                onClick={onSaveSelected}
                loading={isSaving}
                disabled={selectedDirtyItems.length === 0 || isSaving}
              >
                Save selected changes ({selectedDirtyItems.length})
              </Button>
            </SpaceBetween>
          }
        >
          Race History Bulk Editor
        </Header>
      }
    >
      <SpaceBetween size="m">
        <SegmentedControl
          selectedId={filterMode}
          onChange={({ detail }) =>
            setFilterMode(detail.selectedId as FilterMode)
          }
          options={[
            { id: "staged", text: "Staged only" },
            { id: "legacy", text: "All legacy" },
            { id: "all", text: "All races" },
          ]}
        />

        <Input
          value={query}
          onChange={({ detail }) => setQuery(detail.value)}
          placeholder="Search date, distance, name, notes, or time"
        />

        {status === "loading" ? (
          <Box textAlign="center" padding={{ vertical: "l" }}>
            <Spinner size="large" />
          </Box>
        ) : null}
        {status === "error" ? (
          <StatusIndicator type="error">{error}</StatusIndicator>
        ) : null}
        {saveMessage ? (
          <StatusIndicator type="info">{saveMessage}</StatusIndicator>
        ) : null}

        {status === "loaded" ? (
          <SpaceBetween size="m">
            <Checkbox
              checked={allVisibleSelected}
              onChange={({ detail }) =>
                onToggleSelectAllVisible(detail.checked)
              }
            >
              Select all visible rows
            </Checkbox>

            {filteredItems.map((item) => {
              const rowKey = `${item.yearKey}|${item.sk}`;
              const draft = drafts[rowKey] ?? {};
              const validationState: RaceValidationState =
                draft.validationState ?? item.validationState ?? "staged";

              return (
                <Container
                  key={rowKey}
                  header={
                    <Header
                      variant="h3"
                      description={`${item.date} • ${item.distance} • ${item.time}`}
                      actions={
                        <Checkbox
                          checked={Boolean(selectedRow[rowKey])}
                          onChange={({ detail }) =>
                            onSelectRow(item, detail.checked)
                          }
                        >
                          Select
                        </Checkbox>
                      }
                    >
                      {item.name ?? "Unnamed race"}
                    </Header>
                  }
                >
                  <SpaceBetween size="s">
                    <SpaceBetween direction="horizontal" size="l">
                      <Box>
                        <strong>Source:</strong> {item.source ?? "manual"}
                      </Box>
                      <Box>
                        <strong>Status:</strong> {item.validationState ?? "—"}
                      </Box>
                    </SpaceBetween>

                    <FormField label="Name">
                      <Input
                        value={draft.name ?? item.name ?? ""}
                        onChange={({ detail }) =>
                          updateDraft(item, { name: detail.value })
                        }
                      />
                    </FormField>

                    <SpaceBetween direction="horizontal" size="m">
                      <FormField label="Time">
                        <Input
                          value={draft.time ?? item.time}
                          onChange={({ detail }) =>
                            updateDraft(item, { time: detail.value })
                          }
                        />
                      </FormField>
                      <FormField label="VDOT">
                        <Input
                          value={String(draft.vdot ?? item.vdot)}
                          onChange={({ detail }) => {
                            const parsed = Number(detail.value);
                            if (Number.isFinite(parsed)) {
                              updateDraft(item, { vdot: parsed });
                            }
                          }}
                        />
                      </FormField>
                    </SpaceBetween>

                    <FormField label="Notes">
                      <Textarea
                        value={draft.comments ?? item.comments ?? ""}
                        onChange={({ detail }) =>
                          updateDraft(item, { comments: detail.value })
                        }
                        rows={3}
                      />
                    </FormField>

                    <Checkbox
                      checked={validationState === "validated"}
                      onChange={({ detail }) =>
                        updateDraft(item, {
                          validationState: detail.checked
                            ? "validated"
                            : "staged",
                        })
                      }
                    >
                      Mark as validated
                    </Checkbox>

                    {rowErrors[rowKey] ? (
                      <StatusIndicator type="error">
                        {rowErrors[rowKey]}
                      </StatusIndicator>
                    ) : null}
                  </SpaceBetween>
                </Container>
              );
            })}
          </SpaceBetween>
        ) : null}

        <Container header={<Header variant="h3">Create race manually</Header>}>
          <SpaceBetween size="s">
            <FormField label="Date">
              <Input
                value={newDate}
                onChange={({ detail }) => setNewDate(detail.value)}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Distance">
              <Input
                value={newDistance}
                onChange={({ detail }) => setNewDistance(detail.value)}
              />
            </FormField>
            <SpaceBetween direction="horizontal" size="m">
              <FormField label="Time">
                <Input
                  value={newTime}
                  onChange={({ detail }) => setNewTime(detail.value)}
                />
              </FormField>
              <FormField label="VDOT">
                <Input
                  value={newVdot}
                  onChange={({ detail }) => setNewVdot(detail.value)}
                />
              </FormField>
            </SpaceBetween>
            <FormField label="Name">
              <Input
                value={newName}
                onChange={({ detail }) => setNewName(detail.value)}
              />
            </FormField>
            <FormField label="Notes">
              <Textarea
                value={newComments}
                onChange={({ detail }) => setNewComments(detail.value)}
                rows={3}
              />
            </FormField>
            <Button
              variant="primary"
              onClick={onCreateRace}
              loading={isCreating}
            >
              Create race
            </Button>
            {createMessage ? (
              <StatusIndicator type="info">{createMessage}</StatusIndicator>
            ) : null}
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </Container>
  );
};

export default RaceBulkEditor;
