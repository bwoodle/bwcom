import { tool } from 'langchain';
import { z } from 'zod';
import { ScanCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TRAINING_LOG_TABLE_NAME } from './dynamodb';
import {
  TRAINING_LOG_TOOL_DESCRIPTIONS,
  TRAINING_LOG_ARG_DESCRIPTIONS,
} from './prompts/tool-descriptions/training-log';

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

function isSundayDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getDay() === 0;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function requiredStringField(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value.trim();
}

function requiredNumberField(
  value: unknown,
  fieldName: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const listTrainingLog = tool(
  async ({ logId }) => {
    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to list training log: ${message}` });
    }
  },
  {
    name: 'listTrainingLog',
    description: TRAINING_LOG_TOOL_DESCRIPTIONS.listTrainingLog,
    schema: z.object({
      logId: z
        .string()
        .optional()
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.logIdOptional),
    }),
  }
);

export const addDailyWorkout = tool(
  async ({ logId, date, slot, description, miles, highlight }) => {
    try {
      const safeLogId = requiredStringField(logId, 'logId');
      const safeDate = requiredStringField(date, 'date');
      const safeDescription = requiredStringField(description, 'description');
      const safeMiles = requiredNumberField(miles, 'miles');
      const sk = buildDailySk(safeDate, slot);
      const createdAt = new Date().toISOString();

      const item: Record<string, unknown> = {
        logId: safeLogId,
        sk,
        date: safeDate,
        slot,
        entryType: 'daily',
        description: safeDescription,
        miles: safeMiles,
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

      return JSON.stringify({
        success: true,
        logId: safeLogId,
        sk,
        date: safeDate,
        slot,
        description: safeDescription,
        miles: safeMiles,
        highlight: highlight ?? false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to add daily workout: ${message}` });
    }
  },
  {
    name: 'addDailyWorkout',
    description: TRAINING_LOG_TOOL_DESCRIPTIONS.addDailyWorkout,
    schema: z.object({
      logId: z.string().trim().min(1).describe(TRAINING_LOG_ARG_DESCRIPTIONS.logId),
      date: z
        .string()
        .trim()
        .refine(isIsoDate, { message: 'Date must be YYYY-MM-DD.' })
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.date),
      slot: z
        .enum(['workout1', 'workout2'])
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.slot),
      description: z
        .string()
        .trim()
        .min(1)
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.description),
      miles: z.number().finite().describe(TRAINING_LOG_ARG_DESCRIPTIONS.miles),
      highlight: z
        .boolean()
        .optional()
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.highlightOptional),
    }),
  }
);

export const addWeeklySummary = tool(
  async ({ logId, date, description }) => {
    try {
      const safeLogId = requiredStringField(logId, 'logId');
      const safeDate = requiredStringField(date, 'date');
      const safeDescription = requiredStringField(description, 'description');
      const sk = buildWeeklySk(safeDate);
      const createdAt = new Date().toISOString();

      await docClient.send(
        new PutCommand({
          TableName: TRAINING_LOG_TABLE_NAME,
          Item: {
            logId: safeLogId,
            sk,
            date: safeDate,
            entryType: 'week',
            description: safeDescription,
            createdAt,
          },
        })
      );

      return JSON.stringify({
        success: true,
        logId: safeLogId,
        sk,
        date: safeDate,
        description: safeDescription,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to add weekly summary: ${message}` });
    }
  },
  {
    name: 'addWeeklySummary',
    description: TRAINING_LOG_TOOL_DESCRIPTIONS.addWeeklySummary,
    schema: z.object({
      logId: z.string().trim().min(1).describe(TRAINING_LOG_ARG_DESCRIPTIONS.logId),
      date: z
        .string()
        .trim()
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.weeklyDate)
        .refine(isSundayDate, {
          message: 'Weekly summary date must be a Sunday (YYYY-MM-DD).',
        }),
      description: z
        .string()
        .trim()
        .min(1)
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.weeklyDescription),
    }),
  }
);

export const removeTrainingLogEntry = tool(
  async ({ logId, sk }) => {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TRAINING_LOG_TABLE_NAME,
          Key: { logId, sk },
        })
      );
      return JSON.stringify({ success: true, deleted: { logId, sk } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to remove training log entry: ${message}` });
    }
  },
  {
    name: 'removeTrainingLogEntry',
    description: TRAINING_LOG_TOOL_DESCRIPTIONS.removeTrainingLogEntry,
    schema: z.object({
      logId: z.string().describe(TRAINING_LOG_ARG_DESCRIPTIONS.deleteLogId),
      sk: z.string().describe(TRAINING_LOG_ARG_DESCRIPTIONS.deleteSk),
    }),
  }
);

export const updateTrainingLogEntry = tool(
  async ({ logId, sk, description, miles, highlight }) => {
    try {
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
        return JSON.stringify({ success: false, error: 'No fields to update.' });
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to update training log entry: ${message}` });
    }
  },
  {
    name: 'updateTrainingLogEntry',
    description: TRAINING_LOG_TOOL_DESCRIPTIONS.updateTrainingLogEntry,
    schema: z.object({
      logId: z.string().describe(TRAINING_LOG_ARG_DESCRIPTIONS.updateLogId),
      sk: z.string().describe(TRAINING_LOG_ARG_DESCRIPTIONS.updateSk),
      description: z
        .string()
        .optional()
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.updateDescription),
      miles: z.number().optional().describe(TRAINING_LOG_ARG_DESCRIPTIONS.updateMiles),
      highlight: z
        .boolean()
        .optional()
        .describe(TRAINING_LOG_ARG_DESCRIPTIONS.updateHighlight),
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
