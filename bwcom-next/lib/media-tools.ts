import { tool } from 'langchain';
import { z } from 'zod';
import { ScanCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, MEDIA_TABLE_NAME } from './dynamodb';

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
    description: `List media entries from the media tracking table.

If month and year are provided, returns only entries for that month.
Otherwise returns all entries, sorted newest month first.

Each item contains:
  monthKey  – partition key, e.g. "2026-02"
  sk        – sort key (timestamp#title), needed for updates and deletes
  title     – the title of the book, movie, show, etc.
  format    – e.g. "audiobook", "book", "movie", "TV", "podcast"
  comments  – optional multi-line comments/review (may be null)

Always call this before attempting to remove or update an entry so you have
the exact sk value.`,
    schema: z.object({
      month: z
        .string()
        .optional()
        .describe('Month name (e.g. "February" or "Feb"). Omit to list all months.'),
      year: z
        .number()
        .optional()
        .describe('Four-digit year (e.g. 2026). Required if month is provided.'),
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
    description: `Add a new media entry to the tracking table.

Use this when the user says they consumed a book, movie, audiobook, TV show,
podcast, etc.

The comments field is optional and supports multi-line text. Use it for
reviews, thoughts, or notes about the media.

Examples:
  { month: "February", year: 2026, title: "Paradais", format: "audiobook",
    comments: "Jeselnik book club for February.\\nWild beginning chapter." }
  { month: "January", year: 2026, title: "The Bear Season 3", format: "TV" }`,
    schema: z.object({
      month: z.string().describe('Month name (e.g. "February", "Feb").'),
      year: z.number().describe('Four-digit year (e.g. 2026).'),
      title: z.string().describe('Title of the media (book, movie, show, etc.).'),
      format: z
        .string()
        .describe('Format / medium — e.g. "audiobook", "book", "movie", "TV", "podcast".'),
      comments: z
        .string()
        .optional()
        .describe(
          'Optional multi-line comments or review. Use newline characters (\\n) to separate lines.'
        ),
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
    description: `Remove a media entry from the tracking table.

**IMPORTANT: Always ask the user for confirmation before calling this tool.**

Before calling this tool you MUST first call listMedia to discover the exact
monthKey and sk of the entry the user wants to delete.

Parameters:
  monthKey – the partition key (e.g. "2026-02")
  sk       – the exact sort key (e.g. "2026-02-08T12:00:00.000Z#Paradais")

The entry is permanently deleted. This cannot be undone.`,
    schema: z.object({
      monthKey: z.string().describe('The monthKey (partition key) of the entry to delete.'),
      sk: z.string().describe('The exact sk (sort key) of the entry to delete. Get this from listMedia.'),
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
    description: `Update the comments on an existing media entry.

Before calling this tool you MUST first call listMedia to discover the exact
monthKey and sk of the entry the user wants to update.

The comments field supports multi-line text. Pass an empty string or omit
to clear the comments entirely.

Parameters:
  monthKey – the partition key (e.g. "2026-02")
  sk       – the exact sort key
  comments – new multi-line comments text, or empty string to clear`,
    schema: z.object({
      monthKey: z.string().describe('The monthKey (partition key) of the entry.'),
      sk: z.string().describe('The exact sk (sort key) of the entry. Get this from listMedia.'),
      comments: z
        .string()
        .optional()
        .describe(
          'New comments text (supports multi-line with \\n). Omit or pass empty string to clear.'
        ),
    }),
  }
);

/** All media tools, ready to pass to createAgent({ tools }). */
export const mediaTools = [listMedia, addMedia, removeMedia, updateMediaComments];
