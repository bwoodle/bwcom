"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Container,
  Header,
  SegmentedControl,
  SpaceBetween,
  Spinner,
  StatusIndicator,
} from '@cloudscape-design/components';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DailyEntry = {
  logId: string;
  sk: string;
  date: string;
  entryType: 'daily';
  slot: 'workout1' | 'workout2';
  description: string;
  miles: number;
  highlight?: boolean;
};

type WeeklyEntry = {
  logId: string;
  sk: string;
  date: string;
  entryType: 'week';
  description: string;
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
  workout1?: string;
  workout1Highlight?: boolean;
  workout2?: string;
  workout2Highlight?: boolean;
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
    .filter((entry): entry is WeeklyEntry => entry.entryType === 'week');

  const dailyEntries = entries.filter(
    (entry): entry is DailyEntry => entry.entryType === 'daily',
  );

  // Build a map of weekly summaries keyed by date (the Saturday ending the week)
  const summaryByDate = new Map<string, WeeklyEntry>();
  for (const w of weeklyEntries) {
    summaryByDate.set(w.date, w);
  }

  // Discover all week-ending Saturdays from daily entries + weekly summaries
  const weekEndingSet = new Set<string>();

  // Add weeks from weekly summaries
  for (const w of weeklyEntries) {
    weekEndingSet.add(w.date);
  }

  // Add weeks from daily entries — find the Saturday ending each entry's week
  for (const d of dailyEntries) {
    const date = parseDate(d.date);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
    const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7; // Sun(0)->6 days, Mon(1)->5, ... Sat(6)->7 (next Sat)
    // If the entry is on a Saturday, it belongs to the week ending that Saturday
    const satDate = dayOfWeek === 6 ? date : addDays(date, daysUntilSat);
    weekEndingSet.add(satDate.toISOString().slice(0, 10));
  }

  const weekEndings = Array.from(weekEndingSet).sort((a, b) =>
    parseDate(b).getTime() - parseDate(a).getTime(),
  );

  return weekEndings.map((weekEnding) => {
    const weekEnd = parseDate(weekEnding);
    const weekStart = addDays(weekEnd, -6);

    const weekDays: Date[] = Array.from({ length: 7 }).map((_, index) =>
      addDays(weekStart, index),
    );

    const dailyRows: DayRow[] = weekDays.map((day) => {
      const date = day.toISOString().slice(0, 10);
      const entriesForDay = dailyEntries.filter(
        (entry) => entry.date === date,
      );

      const bySlot = entriesForDay.reduce<
        Record<'workout1' | 'workout2', DailyEntry[]>
      >(
        (acc, entry) => {
          acc[entry.slot].push(entry);
          return acc;
        },
        { workout1: [], workout2: [] },
      );

      const formatSlotEntries = (list: DailyEntry[]) => {
        if (!list.length) return undefined;
        return list
          .map((e) => `${e.description} (${formatMiles(e.miles)})`)
          .join('\n');
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
        workout1: formatSlotEntries(bySlot.workout1),
        workout1Highlight: hasHighlight(bySlot.workout1),
        workout2: formatSlotEntries(bySlot.workout2),
        workout2Highlight: hasHighlight(bySlot.workout2),
        totalMiles,
      };
    });

    return {
      weekEnding,
      dailyRows,
      weeklySummary: summaryByDate.get(weekEnding),
    };
  });
};

/* ------------------------------------------------------------------ */
/*  Styles (CSS-in-JS kept close to the component)                     */
/* ------------------------------------------------------------------ */

const styles = {
  weekHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    fontWeight: 600,
    fontSize: 13,
    color: '#16191f',
    borderBottom: '2px solid #e9ebed',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    tableLayout: 'fixed' as const,
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
    borderBottom: '1px solid #e9ebed',
  } as React.CSSProperties,

  td: {
    padding: '3px 8px',
    verticalAlign: 'top' as const,
    borderBottom: '1px solid #f2f3f3',
    color: '#16191f',
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

  workoutCell: {
    whiteSpace: 'pre-line' as const,
  } as React.CSSProperties,

  summary: {
    padding: '4px 8px 8px',
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
    <div>
      <div style={styles.weekHeader}>
        <span>Week ending {formatWeekEnding(week.weekEnding)}</span>
        <span>{formatMiles(totalMiles)} mi</span>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: 40 }}>Day</th>
            <th style={{ ...styles.th, width: '42%' }}>Workout 1</th>
            <th style={{ ...styles.th, width: '42%' }}>Workout 2</th>
            <th style={{ ...styles.th, textAlign: 'right', width: 40 }}>Mi</th>
          </tr>
        </thead>
        <tbody>
          {week.dailyRows.map((row) => {
            const hasActivity = row.workout1 || row.workout2;
            return (
              <tr
                key={row.date}
                style={!hasActivity ? { opacity: 0.45 } : undefined}
              >
                <td style={{ ...styles.td, ...styles.dayCell }}>
                  {row.dayLabel}
                </td>
                <td style={{ ...styles.td, ...styles.workoutCell }}>
                  {row.workout1 ? (
                    <span style={row.workout1Highlight ? styles.highlightCell : undefined}>
                      {row.workout1}
                    </span>
                  ) : (
                    <span style={styles.emptyCell}>—</span>
                  )}
                </td>
                <td style={{ ...styles.td, ...styles.workoutCell }}>
                  {row.workout2 ? (
                    <span style={row.workout2Highlight ? styles.highlightCell : undefined}>
                      {row.workout2}
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
      <SpaceBetween size="l">
        {weekGroups.map((week) => (
          <WeekCard key={week.weekEnding} week={week} />
        ))}
      </SpaceBetween>
    );
  };

  const sectionName =
    sectionConfigs.find((s) => s.id === activeLogId)?.name ?? 'Training Log';

  return (
    <div>
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

      <Container header={<Header variant="h1">{sectionName}</Header>}>
        {renderContent()}
      </Container>
    </div>
  );
};

export default TrainingLog;