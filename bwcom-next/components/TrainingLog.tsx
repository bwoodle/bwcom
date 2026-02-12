"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  SegmentedControl,
  Spinner,
  StatusIndicator,
} from '@cloudscape-design/components';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DailyEntry = {
  id: string;
  logId: string;
  date: string;
  entryType: 'daily';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  description: string;
  miles: number;
  highlight?: boolean;
};

type WeeklyEntry = {
  id: string;
  logId: string;
  date: string;
  entryType: 'week';
  description: string;
  miles: number;
};

type TrainingLogEntry = DailyEntry | WeeklyEntry;

type TrainingLogSection = {
  id: string;
  name: string;
  entries: TrainingLogEntry[];
};

type SectionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; data: TrainingLogSection };

type DayRow = {
  date: string;
  dayLabel: string;
  morning?: string;
  morningHighlight?: boolean;
  afternoon?: string;
  afternoonHighlight?: boolean;
  evening?: string;
  eveningHighlight?: boolean;
  totalMiles: number;
};

type WeekGroup = {
  weekEnding: string;
  dailyRows: DayRow[];
  weeklySummary?: WeeklyEntry;
};

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const sectionConfigs = [
  { id: 'paris-2026', name: 'Paris 2026' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const formatDayLabel = (value: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    parseDate(value),
  );

const formatWeekEnding = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(parseDate(value));

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatMiles = (value: number) =>
  value % 1 === 0 ? `${value}` : `${value.toFixed(1)}`;

const buildWeekGroups = (entries: TrainingLogEntry[]): WeekGroup[] => {
  const weeklyEntries = entries
    .filter((entry): entry is WeeklyEntry => entry.entryType === 'week')
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  const dailyEntries = entries.filter(
    (entry): entry is DailyEntry => entry.entryType === 'daily',
  );

  return weeklyEntries.map((weeklyEntry) => {
    const weekEnd = parseDate(weeklyEntry.date);
    const weekStart = addDays(weekEnd, -6);

    const weekDays: Date[] = Array.from({ length: 7 }).map((_, index) =>
      addDays(weekStart, index),
    );

    const dailyRows: DayRow[] = weekDays.map((day) => {
      const date = day.toISOString().slice(0, 10);
      const entriesForDay = dailyEntries.filter(
        (entry) => entry.date === date,
      );

      const byTime = entriesForDay.reduce<
        Record<'morning' | 'afternoon' | 'evening', DailyEntry[]>
      >(
        (acc, entry) => {
          acc[entry.timeOfDay].push(entry);
          return acc;
        },
        { morning: [], afternoon: [], evening: [] },
      );

      const formatTimeEntries = (list: DailyEntry[]) => {
        if (!list.length) return undefined;
        return list
          .map((e) => `${e.description} (${formatMiles(e.miles)})`)
          .join('; ');
      };

      const hasHighlight = (list: DailyEntry[]) =>
        list.some((e) => e.highlight);

      const totalMiles = entriesForDay.reduce(
        (sum, entry) => sum + entry.miles,
        0,
      );

      return {
        date,
        dayLabel: formatDayLabel(date),
        morning: formatTimeEntries(byTime.morning),
        morningHighlight: hasHighlight(byTime.morning),
        afternoon: formatTimeEntries(byTime.afternoon),
        afternoonHighlight: hasHighlight(byTime.afternoon),
        evening: formatTimeEntries(byTime.evening),
        eveningHighlight: hasHighlight(byTime.evening),
        totalMiles,
      };
    });

    return {
      weekEnding: weeklyEntry.date,
      dailyRows,
      weeklySummary: weeklyEntry,
    };
  });
};

/* ------------------------------------------------------------------ */
/*  Styles (CSS-in-JS kept close to the component)                     */
/* ------------------------------------------------------------------ */

const styles = {
  root: {} as React.CSSProperties,

  weekCard: {
    border: '1px solid var(--color-border-divider-default, #e9ebed)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  } as React.CSSProperties,

  weekHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 12px',
    background: 'var(--color-background-container-header, #fafafa)',
    borderBottom: '1px solid var(--color-border-divider-default, #e9ebed)',
    fontWeight: 600,
    fontSize: 13,
    color: '#16191f',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
    lineHeight: 1.35,
  } as React.CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '4px 8px',
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase' as const,
    color: '#687078',
    borderBottom: '1px solid var(--color-border-divider-default, #e9ebed)',
  } as React.CSSProperties,

  td: {
    padding: '3px 8px',
    verticalAlign: 'top' as const,
    borderBottom: '1px solid var(--color-border-divider-secondary, #f2f3f3)',
  } as React.CSSProperties,

  dayCell: {
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    width: 36,
  } as React.CSSProperties,

  milesCell: {
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
    width: 32,
  } as React.CSSProperties,

  emptyCell: {
    color: '#aab7b8',
  } as React.CSSProperties,

  highlightCell: {
    fontWeight: 600,
    color: '#0972d3',
  } as React.CSSProperties,

  summary: {
    padding: '4px 12px 8px',
    fontSize: 12,
    color: '#545b64',
    lineHeight: 1.4,
  } as React.CSSProperties,
} as const;

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const WeekCard: React.FC<{ week: WeekGroup }> = ({ week }) => {
  const totalMiles = week.dailyRows.reduce((s, r) => s + r.totalMiles, 0);

  return (
    <div style={styles.weekCard}>
      <div style={styles.weekHeader}>
        <span>Week ending {formatWeekEnding(week.weekEnding)}</span>
        <span>{formatMiles(totalMiles)} mi</span>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Day</th>
            <th style={styles.th}>AM</th>
            <th style={styles.th}>PM</th>
            <th style={styles.th}>Eve</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Mi</th>
          </tr>
        </thead>
        <tbody>
          {week.dailyRows.map((row) => {
            const hasActivity =
              row.morning || row.afternoon || row.evening;
            return (
              <tr
                key={row.date}
                style={!hasActivity ? { opacity: 0.45 } : undefined}
              >
                <td style={{ ...styles.td, ...styles.dayCell }}>
                  {row.dayLabel}
                </td>
                <td style={styles.td}>
                  {row.morning ? (
                    <span style={row.morningHighlight ? styles.highlightCell : undefined}>
                      {row.morning}
                    </span>
                  ) : (
                    <span style={styles.emptyCell}>—</span>
                  )}
                </td>
                <td style={styles.td}>
                  {row.afternoon ? (
                    <span style={row.afternoonHighlight ? styles.highlightCell : undefined}>
                      {row.afternoon}
                    </span>
                  ) : (
                    <span style={styles.emptyCell}>—</span>
                  )}
                </td>
                <td style={styles.td}>
                  {row.evening ? (
                    <span style={row.eveningHighlight ? styles.highlightCell : undefined}>
                      {row.evening}
                    </span>
                  ) : (
                    <span style={styles.emptyCell}>—</span>
                  )}
                </td>
                <td style={{ ...styles.td, ...styles.milesCell }}>
                  {row.totalMiles > 0
                    ? formatMiles(row.totalMiles)
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {week.weeklySummary && (
        <div style={styles.summary}>
          {week.weeklySummary.description}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const TrainingLog: React.FC = () => {
  const [activeLogId, setActiveLogId] = useState(sectionConfigs[0].id);
  const [sectionState, setSectionState] = useState<
    Record<string, SectionState>
  >({});

  const loadSection = useCallback(async (sectionId: string) => {
    setSectionState((current) => {
      if (
        current[sectionId]?.status === 'loaded' ||
        current[sectionId]?.status === 'loading'
      ) {
        return current;
      }
      return { ...current, [sectionId]: { status: 'loading' } };
    });

    try {
      const response = await fetch(
        `/api/training-log?sectionId=${sectionId}`,
      );
      if (!response.ok)
        throw new Error(`Request failed with ${response.status}`);

      const data: TrainingLogSection = await response.json();
      setSectionState((current) => ({
        ...current,
        [sectionId]: { status: 'loaded', data },
      }));
    } catch (error) {
      setSectionState((current) => ({
        ...current,
        [sectionId]: {
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  }, []);

  useEffect(() => {
    void loadSection(activeLogId);
  }, [activeLogId, loadSection]);

  const renderContent = () => {
    const state = sectionState[activeLogId];

    if (!state || state.status === 'idle' || state.status === 'loading') {
      return (
        <Box padding={{ vertical: 'l' }} textAlign="center">
          <Spinner size="large" />
        </Box>
      );
    }

    if (state.status === 'error') {
      return <StatusIndicator type="error">{state.message}</StatusIndicator>;
    }

    const weekGroups = buildWeekGroups(state.data.entries);

    return (
      <div>
        {weekGroups.map((week) => (
          <WeekCard key={week.weekEnding} week={week} />
        ))}
      </div>
    );
  };

  return (
    <div style={styles.root}>
      {sectionConfigs.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <SegmentedControl
            selectedId={activeLogId}
            onChange={({ detail }) => setActiveLogId(detail.selectedId)}
            options={sectionConfigs.map((s) => ({
              id: s.id,
              text: s.name,
            }))}
          />
        </div>
      )}

      <h1
        style={{
          fontSize: 20,
          fontWeight: 700,
          margin: '0 0 12px',
        }}
      >
        {sectionConfigs.find((s) => s.id === activeLogId)?.name ??
          'Training Log'}
      </h1>

      {renderContent()}
    </div>
  );
};

export default TrainingLog;