import { tool } from 'langchain';
import { z } from 'zod';
import { ScanCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, RACES_TABLE_NAME } from './dynamodb';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a sort key for a race item: "<date>#<distance>"
 * The date prefix ensures chronological ordering within a year.
 */
function buildSk(date: string, distance: string): string {
  return `${date}#${distance}`;
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const listRaces = tool(
  async ({ year }) => {
    if (year) {
      const yearKey = String(year);
      const result = await docClient.send(
        new QueryCommand({
          TableName: RACES_TABLE_NAME,
          KeyConditionExpression: 'yearKey = :yk',
          ExpressionAttributeValues: { ':yk': yearKey },
        })
      );
      const items = (result.Items ?? []).map((item) => ({
        yearKey: item.yearKey,
        sk: item.sk,
        date: item.date,
        distance: item.distance,
        time: item.time,
        vdot: item.vdot,
        comments: item.comments ?? null,
      }));
      items.sort((a, b) => (b.sk as string).localeCompare(a.sk as string));
      return JSON.stringify(items, null, 2);
    }

    // Full scan — return everything
    const allItems: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: RACES_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      allItems.push(...(result.Items ?? []));
      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    const items = allItems.map((item) => ({
      yearKey: item.yearKey,
      sk: item.sk,
      date: item.date,
      distance: item.distance,
      time: item.time,
      vdot: item.vdot,
      comments: item.comments ?? null,
    }));
    items.sort((a, b) => {
      const yk = (b.yearKey as string).localeCompare(a.yearKey as string);
      if (yk !== 0) return yk;
      return (b.sk as string).localeCompare(a.sk as string);
    });
    return JSON.stringify(items, null, 2);
  },
  {
    name: 'listRaces',
    description: `List race results from the race history table.

If year is provided, returns only results for that year.
Otherwise returns all results, sorted newest first.

Each item contains:
  yearKey   – partition key, e.g. "2026"
  sk        – sort key (date#distance), needed for updates and deletes
  date      – display date, e.g. "Feb 8, 2026"
  distance  – e.g. "5K", "Half Marathon", "Marathon"
  time      – finish time as a string, e.g. "3:12:45" or "18:30"
  vdot      – VDOT score, e.g. 67.0
  comments  – optional multi-line comments (may be null)

Always call this before attempting to remove or update an entry so you have
the exact yearKey and sk values.`,
    schema: z.object({
      year: z
        .number()
        .optional()
        .describe('Four-digit year (e.g. 2026). Omit to list all years.'),
    }),
  }
);

export const addRace = tool(
  async ({ date, distance, time, vdot, comments }) => {
    // Parse year from date string — expect formats like "Feb 8, 2026" or "2026-02-08"
    const parsed = new Date(date);
    const yearKey = String(parsed.getFullYear());
    // Build a sortable date string for the sk: YYYY-MM-DD
    const isoDate = parsed.toISOString().slice(0, 10);
    const sk = buildSk(isoDate, distance);
    const createdAt = new Date().toISOString();

    // Format display date
    const displayDate = parsed.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const item: Record<string, unknown> = {
      yearKey,
      sk,
      date: displayDate,
      distance,
      time,
      vdot,
      createdAt,
    };
    if (comments) {
      item.comments = comments;
    }

    await docClient.send(
      new PutCommand({
        TableName: RACES_TABLE_NAME,
        Item: item,
      })
    );

    return JSON.stringify({ success: true, yearKey, sk, date: displayDate, distance, time, vdot, comments: comments ?? null });
  },
  {
    name: 'addRace',
    description: `Add a new race result to the race history table.

Use this when the user tells you about a race they ran.

Parameters:
  date     – the race date, e.g. "Feb 8, 2026" or "2026-02-08"
  distance – e.g. "5K", "10K", "Half Marathon", "Marathon"
  time     – finish time as a string, e.g. "3:12:45" or "18:30"
  vdot     – VDOT score as a number, e.g. 67.0
  comments – optional multi-line comments about the race

The entry is written to DynamoDB with yearKey as partition key and a sort key
derived from the date and distance.`,
    schema: z.object({
      date: z.string().describe('Race date, e.g. "Feb 8, 2026" or "2026-02-08".'),
      distance: z.string().describe('Race distance, e.g. "5K", "10K", "Half Marathon", "Marathon".'),
      time: z.string().describe('Finish time as a string, e.g. "3:12:45" or "18:30".'),
      vdot: z.number().describe('VDOT score, e.g. 67.0.'),
      comments: z
        .string()
        .optional()
        .describe(
          'Optional multi-line comments about the race. Use newline characters (\\n) to separate lines.'
        ),
    }),
  }
);

export const removeRace = tool(
  async ({ yearKey, sk }) => {
    await docClient.send(
      new DeleteCommand({
        TableName: RACES_TABLE_NAME,
        Key: { yearKey, sk },
      })
    );
    return JSON.stringify({ success: true, deleted: { yearKey, sk } });
  },
  {
    name: 'removeRace',
    description: `Remove a race result from the race history table.

**IMPORTANT: Always ask the user for confirmation before calling this tool.**

Before calling this tool you MUST first call listRaces to discover the exact
yearKey and sk of the entry the user wants to delete.

Parameters:
  yearKey – the partition key (e.g. "2026")
  sk      – the exact sort key (e.g. "2026-02-08#5K")

The entry is permanently deleted. This cannot be undone.`,
    schema: z.object({
      yearKey: z.string().describe('The yearKey (partition key) of the entry to delete.'),
      sk: z.string().describe('The exact sk (sort key) of the entry to delete. Get this from listRaces.'),
    }),
  }
);

export const updateRaceComments = tool(
  async ({ yearKey, sk, comments }) => {
    if (comments === null || comments === undefined || comments === '') {
      await docClient.send(
        new UpdateCommand({
          TableName: RACES_TABLE_NAME,
          Key: { yearKey, sk },
          UpdateExpression: 'REMOVE comments',
        })
      );
    } else {
      await docClient.send(
        new UpdateCommand({
          TableName: RACES_TABLE_NAME,
          Key: { yearKey, sk },
          UpdateExpression: 'SET comments = :c',
          ExpressionAttributeValues: { ':c': comments },
        })
      );
    }
    return JSON.stringify({ success: true, yearKey, sk, comments: comments ?? null });
  },
  {
    name: 'updateRaceComments',
    description: `Update the comments on an existing race result.

Before calling this tool you MUST first call listRaces to discover the exact
yearKey and sk of the entry the user wants to update.

The comments field supports multi-line text. Pass an empty string or omit
to clear the comments entirely.

Parameters:
  yearKey  – the partition key (e.g. "2026")
  sk       – the exact sort key
  comments – new multi-line comments text, or empty string to clear`,
    schema: z.object({
      yearKey: z.string().describe('The yearKey (partition key) of the entry.'),
      sk: z.string().describe('The exact sk (sort key) of the entry. Get this from listRaces.'),
      comments: z
        .string()
        .optional()
        .describe(
          'New comments text (supports multi-line with \\n). Omit or pass empty string to clear.'
        ),
    }),
  }
);

/** All race history tools, ready to pass to createAgent({ tools }). */
export const raceTools = [listRaces, addRace, removeRace, updateRaceComments];
