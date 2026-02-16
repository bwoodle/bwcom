import { tool } from 'langchain';
import { z } from 'zod';
import { ScanCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, MEDIA_TABLE_NAME } from './dynamodb';
import {
  MEDIA_TOOL_DESCRIPTIONS,
  MEDIA_ARG_DESCRIPTIONS,
} from './prompts/tool-descriptions/media';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a monthKey string (e.g. "2026-02") from a month name and year.
 */
function toMonthKey(month: string, year: number): string {
  const monthNames: Record<string, string> = {
    january: '01', jan: '01',
    february: '02', feb: '02',
    march: '03', mar: '03',
    april: '04', apr: '04',
    may: '05',
    june: '06', jun: '06',
    july: '07', jul: '07',
    august: '08', aug: '08',
    september: '09', sep: '09', sept: '09',
    october: '10', oct: '10',
    november: '11', nov: '11',
    december: '12', dec: '12',
  };
  const num = monthNames[month.toLowerCase()];
  if (!num) throw new Error(`Unknown month: ${month}`);
  return `${year}-${num}`;
}

/**
 * Build the sort key for a media item: "<ISO timestamp>#<title>"
 * This ensures uniqueness even if the same title appears twice in a month.
 */
function buildSk(title: string): string {
  return `${new Date().toISOString()}#${title}`;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const listMedia = tool(
  async ({ month, year }) => {
    if (month && year) {
      const monthKey = toMonthKey(month, year);
      const result = await docClient.send(
        new QueryCommand({
          TableName: MEDIA_TABLE_NAME,
          KeyConditionExpression: 'monthKey = :mk',
          ExpressionAttributeValues: { ':mk': monthKey },
        })
      );
      const items = (result.Items ?? []).map((item) => ({
        monthKey: item.monthKey,
        sk: item.sk,
        title: item.title,
        format: item.format,
        comments: item.comments ?? null,
      }));
      return JSON.stringify(items, null, 2);
    }

    // Full scan — return everything grouped by month
    const allItems: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: MEDIA_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      allItems.push(...(result.Items ?? []));
      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    const items = allItems.map((item) => ({
      monthKey: item.monthKey,
      sk: item.sk,
      title: item.title,
      format: item.format,
      comments: item.comments ?? null,
    }));
    items.sort((a, b) => {
      const mk = (b.monthKey as string).localeCompare(a.monthKey as string);
      if (mk !== 0) return mk;
      return (a.title as string).localeCompare(b.title as string);
    });
    return JSON.stringify(items, null, 2);
  },
  {
    name: 'listMedia',
    description: MEDIA_TOOL_DESCRIPTIONS.listMedia,
    schema: z.object({
      month: z
        .string()
        .optional()
        .describe(MEDIA_ARG_DESCRIPTIONS.monthOptional),
      year: z
        .number()
        .optional()
        .describe(MEDIA_ARG_DESCRIPTIONS.yearOptional),
    }),
  }
);

export const addMedia = tool(
  async ({ month, year, title, format, comments }) => {
    const monthKey = toMonthKey(month, year);
    const sk = buildSk(title);
    const createdAt = new Date().toISOString();

    const item: Record<string, unknown> = {
      monthKey,
      sk,
      title,
      format,
      createdAt,
    };
    if (comments) {
      item.comments = comments;
    }

    await docClient.send(
      new PutCommand({
        TableName: MEDIA_TABLE_NAME,
        Item: item,
      })
    );

    return JSON.stringify({ success: true, monthKey, sk, title, format, comments: comments ?? null });
  },
  {
    name: 'addMedia',
    description: MEDIA_TOOL_DESCRIPTIONS.addMedia,
    schema: z.object({
      month: z.string().describe(MEDIA_ARG_DESCRIPTIONS.monthRequired),
      year: z.number().describe(MEDIA_ARG_DESCRIPTIONS.yearRequired),
      title: z.string().describe(MEDIA_ARG_DESCRIPTIONS.title),
      format: z.string().describe(MEDIA_ARG_DESCRIPTIONS.format),
      comments: z
        .string()
        .optional()
        .describe(MEDIA_ARG_DESCRIPTIONS.commentsOptional),
    }),
  }
);

export const removeMedia = tool(
  async ({ monthKey, sk }) => {
    await docClient.send(
      new DeleteCommand({
        TableName: MEDIA_TABLE_NAME,
        Key: { monthKey, sk },
      })
    );
    return JSON.stringify({ success: true, deleted: { monthKey, sk } });
  },
  {
    name: 'removeMedia',
    description: MEDIA_TOOL_DESCRIPTIONS.removeMedia,
    schema: z.object({
      monthKey: z.string().describe(MEDIA_ARG_DESCRIPTIONS.monthKey),
      sk: z.string().describe(MEDIA_ARG_DESCRIPTIONS.skToDelete),
    }),
  }
);

export const updateMediaComments = tool(
  async ({ monthKey, sk, comments }) => {
    if (comments === null || comments === undefined || comments === '') {
      // Remove comments attribute
      await docClient.send(
        new UpdateCommand({
          TableName: MEDIA_TABLE_NAME,
          Key: { monthKey, sk },
          UpdateExpression: 'REMOVE comments',
        })
      );
    } else {
      await docClient.send(
        new UpdateCommand({
          TableName: MEDIA_TABLE_NAME,
          Key: { monthKey, sk },
          UpdateExpression: 'SET comments = :c',
          ExpressionAttributeValues: { ':c': comments },
        })
      );
    }
    return JSON.stringify({ success: true, monthKey, sk, comments: comments ?? null });
  },
  {
    name: 'updateMediaComments',
    description: MEDIA_TOOL_DESCRIPTIONS.updateMediaComments,
    schema: z.object({
      monthKey: z.string().describe(MEDIA_ARG_DESCRIPTIONS.monthKey),
      sk: z.string().describe(MEDIA_ARG_DESCRIPTIONS.skToUpdate),
      comments: z
        .string()
        .optional()
        .describe(MEDIA_ARG_DESCRIPTIONS.commentsUpdate),
    }),
  }
);

/** All media tools, ready to pass to createAgent({ tools }). */
export const mediaTools = [listMedia, addMedia, removeMedia, updateMediaComments];
