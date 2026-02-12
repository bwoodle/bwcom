import { tool } from 'langchain';
import { z } from 'zod';
import { ScanCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TRAINING_LOG_TABLE_NAME } from './dynamodb';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the sort key for a daily workout entry: "daily#<date>#<slot>"
 * e.g. "daily#2026-02-08#workout1"
 */
function buildDailySk(date: string, slot: 'workout1' | 'workout2'): string {
  return `daily#${date}#${slot}`;
}

/**
 * Build the sort key for a weekly summary entry: "week#<date>"
 * e.g. "week#2026-02-08"
 */
function buildWeeklySk(date: string): string {
  return `week#${date}`;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const listTrainingLog = tool(
  async ({ logId }) => {
    if (logId) {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TRAINING_LOG_TABLE_NAME,
          KeyConditionExpression: 'logId = :lid',
          ExpressionAttributeValues: { ':lid': logId },
        })
      );
      const items = (result.Items ?? []).map(formatItem);
      items.sort((a, b) => (b.sk as string).localeCompare(a.sk as string));
      return JSON.stringify(items, null, 2);
    }

    // Full scan — return everything
    const allItems: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TRAINING_LOG_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      allItems.push(...(result.Items ?? []));
      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    const items = allItems.map(formatItem);
    items.sort((a, b) => {
      const lid = (a.logId as string).localeCompare(b.logId as string);
      if (lid !== 0) return lid;
      return (b.sk as string).localeCompare(a.sk as string);
    });
    return JSON.stringify(items, null, 2);
  },
  {
    name: 'listTrainingLog',
    description: `List training log entries from the training log table.

If logId is provided (e.g. "paris-2026"), returns only entries for that training
cycle. Otherwise returns all entries.

The table contains two kinds of entries, distinguished by the sort key prefix:

1. **Daily workout entries** — sk starts with "daily#"
   Fields: logId, sk, date, slot ("workout1" or "workout2"), description, miles,
   highlight (boolean), createdAt

2. **Weekly summary entries** — sk starts with "week#"
   Fields: logId, sk, date (the Saturday that ends the week), description
   (summary text), miles (total for the week), createdAt

Always call this before attempting to remove or update an entry so you have
the exact logId and sk values.`,
    schema: z.object({
      logId: z
        .string()
        .optional()
        .describe('Training log ID (e.g. "paris-2026"). Omit to list all.'),
    }),
  }
);

export const addDailyWorkout = tool(
  async ({ logId, date, slot, description, miles, highlight }) => {
    const sk = buildDailySk(date, slot);
    const createdAt = new Date().toISOString();

    const item: Record<string, unknown> = {
      logId,
      sk,
      date,
      slot,
      entryType: 'daily',
      description,
      miles,
      createdAt,
    };
    if (highlight) {
      item.highlight = true;
    }

    await docClient.send(
      new PutCommand({
        TableName: TRAINING_LOG_TABLE_NAME,
        Item: item,
      })
    );

    return JSON.stringify({ success: true, logId, sk, date, slot, description, miles, highlight: highlight ?? false });
  },
  {
    name: 'addDailyWorkout',
    description: `Add a single daily workout entry to the training log.

Each day can have up to 2 workouts: "workout1" (morning) and "workout2" (afternoon/evening).
The user will typically add one workout at a time — do NOT assume or ask about the second
workout unless the user mentions it.

**Required information — ask clarifying questions if any are missing:**
- logId: which training cycle (e.g. "paris-2026")
- date: the date of the workout (e.g. "2026-02-08")
- slot: "workout1" for morning or "workout2" for afternoon/evening
- description: what the workout was (e.g. "Easy run", "Tempo intervals\\n3x2mi @ LT pace").
  Supports multi-line with \\n.
- miles: distance in miles (number)

Optional:
- highlight: set to true for key workouts (long runs, races, breakthrough sessions)

If the user says something vague like "I ran 5 miles this morning", ask what the workout
description should be, and confirm the date and training cycle if ambiguous.

Examples:
  { logId: "paris-2026", date: "2026-02-08", slot: "workout1",
    description: "Easy aerobic run", miles: 5.0 }
  { logId: "paris-2026", date: "2026-02-08", slot: "workout2",
    description: "Recovery jog", miles: 2.5 }`,
    schema: z.object({
      logId: z.string().describe('Training log/cycle ID, e.g. "paris-2026".'),
      date: z.string().describe('Date in YYYY-MM-DD format, e.g. "2026-02-08".'),
      slot: z.enum(['workout1', 'workout2']).describe('"workout1" for morning, "workout2" for afternoon/evening.'),
      description: z.string().describe('Workout description. Supports multi-line with \\n.'),
      miles: z.number().describe('Distance in miles.'),
      highlight: z.boolean().optional().describe('True for key workouts (long runs, races, breakthroughs).'),
    }),
  }
);

export const addWeeklySummary = tool(
  async ({ logId, date, description }) => {
    const sk = buildWeeklySk(date);
    const createdAt = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: TRAINING_LOG_TABLE_NAME,
        Item: {
          logId,
          sk,
          date,
          entryType: 'week',
          description,
          createdAt,
        },
      })
    );

    return JSON.stringify({ success: true, logId, sk, date, description });
  },
  {
    name: 'addWeeklySummary',
    description: `Add a weekly summary entry to the training log.

A weekly summary adds an optional description/note to a training week. The
date should be the Saturday that ends the week. Weekly summaries are NOT
required — weeks are automatically discovered from daily workout entries.
The total miles for a week are always computed from the daily workouts.

Only add a weekly summary when the user wants to annotate a week with a note
or comment (e.g. "Solid base week; legs felt fresh.").

Parameters:
  logId       – training cycle ID (e.g. "paris-2026")
  date        – the Saturday ending the week, YYYY-MM-DD format
  description – brief summary/note about the week`,
    schema: z.object({
      logId: z.string().describe('Training log/cycle ID, e.g. "paris-2026".'),
      date: z.string().describe('The Saturday ending the week, YYYY-MM-DD format.'),
      description: z.string().describe('Brief summary/note about the training week.'),
    }),
  }
);

export const removeTrainingLogEntry = tool(
  async ({ logId, sk }) => {
    await docClient.send(
      new DeleteCommand({
        TableName: TRAINING_LOG_TABLE_NAME,
        Key: { logId, sk },
      })
    );
    return JSON.stringify({ success: true, deleted: { logId, sk } });
  },
  {
    name: 'removeTrainingLogEntry',
    description: `Remove a training log entry (daily workout or weekly summary).

**IMPORTANT: Always ask the user for confirmation before calling this tool.**

Before calling this tool you MUST first call listTrainingLog to discover the
exact logId and sk of the entry the user wants to delete.

Parameters:
  logId – the training cycle ID (e.g. "paris-2026")
  sk    – the exact sort key (e.g. "daily#2026-02-08#workout1" or "week#2026-02-08")

The entry is permanently deleted. This cannot be undone.`,
    schema: z.object({
      logId: z.string().describe('The logId (partition key) of the entry to delete.'),
      sk: z.string().describe('The exact sk (sort key) of the entry to delete. Get this from listTrainingLog.'),
    }),
  }
);

export const updateTrainingLogEntry = tool(
  async ({ logId, sk, description, miles, highlight }) => {
    const updates: string[] = [];
    const values: Record<string, unknown> = {};
    const removes: string[] = [];

    if (description !== undefined) {
      updates.push('description = :d');
      values[':d'] = description;
    }
    if (miles !== undefined) {
      updates.push('miles = :m');
      values[':m'] = miles;
    }
    if (highlight === true) {
      updates.push('highlight = :h');
      values[':h'] = true;
    } else if (highlight === false) {
      removes.push('highlight');
    }

    let updateExpr = '';
    if (updates.length) updateExpr += `SET ${updates.join(', ')}`;
    if (removes.length) updateExpr += ` REMOVE ${removes.join(', ')}`;

    if (!updateExpr) {
      return JSON.stringify({ success: false, message: 'No fields to update.' });
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TRAINING_LOG_TABLE_NAME,
        Key: { logId, sk },
        UpdateExpression: updateExpr,
        ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
      })
    );

    return JSON.stringify({ success: true, logId, sk, updated: { description, miles, highlight } });
  },
  {
    name: 'updateTrainingLogEntry',
    description: `Update fields on an existing training log entry (daily or weekly).

Before calling this tool you MUST first call listTrainingLog to discover the
exact logId and sk of the entry the user wants to update.

You can update any combination of:
  description – new description text (supports multi-line with \\n)
  miles       – new mileage number
  highlight   – true to mark as key workout, false to remove highlight

Parameters:
  logId – the training cycle ID
  sk    – the exact sort key`,
    schema: z.object({
      logId: z.string().describe('The logId (partition key) of the entry.'),
      sk: z.string().describe('The exact sk (sort key) of the entry. Get this from listTrainingLog.'),
      description: z.string().optional().describe('New description text. Supports multi-line with \\n.'),
      miles: z.number().optional().describe('New mileage.'),
      highlight: z.boolean().optional().describe('True to mark as key workout, false to remove highlight.'),
    }),
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatItem(item: Record<string, unknown>) {
  const base: Record<string, unknown> = {
    logId: item.logId,
    sk: item.sk,
    date: item.date,
    entryType: item.entryType,
    description: item.description,
    miles: item.miles,
  };
  if (item.slot) base.slot = item.slot;
  if (item.highlight) base.highlight = item.highlight;
  if (item.createdAt) base.createdAt = item.createdAt;
  return base;
}

/** All training log tools, ready to pass to createAgent({ tools }). */
export const trainingLogTools = [
  listTrainingLog,
  addDailyWorkout,
  addWeeklySummary,
  removeTrainingLogEntry,
  updateTrainingLogEntry,
];
