import { tool } from 'langchain';
import { z } from 'zod';
import { ScanCommand, PutCommand, DeleteCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, RACES_TABLE_NAME } from './dynamodb';
import {
  RACE_TOOL_DESCRIPTIONS,
  RACE_ARG_DESCRIPTIONS,
} from './prompts/tool-descriptions/races';

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
    try {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to list races: ${message}` });
    }
  },
  {
    name: 'listRaces',
    description: RACE_TOOL_DESCRIPTIONS.listRaces,
    schema: z.object({
      year: z
        .number()
        .optional()
        .describe(RACE_ARG_DESCRIPTIONS.yearOptional),
    }),
  }
);

export const addRace = tool(
  async ({ date, distance, time, vdot, comments }) => {
    try {
      // Parse year from date string — expect formats like "Feb 8, 2026" or "2026-02-08"
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        return JSON.stringify({ success: false, error: `Invalid date: "${date}". Use a format like "Feb 8, 2026" or "2026-02-08".` });
      }
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to add race: ${message}` });
    }
  },
  {
    name: 'addRace',
    description: RACE_TOOL_DESCRIPTIONS.addRace,
    schema: z.object({
      date: z.string().describe(RACE_ARG_DESCRIPTIONS.date),
      distance: z.string().describe(RACE_ARG_DESCRIPTIONS.distance),
      time: z.string().describe(RACE_ARG_DESCRIPTIONS.time),
      vdot: z.number().describe(RACE_ARG_DESCRIPTIONS.vdot),
      comments: z
        .string()
        .optional()
        .describe(RACE_ARG_DESCRIPTIONS.commentsOptional),
    }),
  }
);

export const removeRace = tool(
  async ({ yearKey, sk }) => {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: RACES_TABLE_NAME,
          Key: { yearKey, sk },
        })
      );
      return JSON.stringify({ success: true, deleted: { yearKey, sk } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to remove race: ${message}` });
    }
  },
  {
    name: 'removeRace',
    description: RACE_TOOL_DESCRIPTIONS.removeRace,
    schema: z.object({
      yearKey: z.string().describe(RACE_ARG_DESCRIPTIONS.yearKeyDelete),
      sk: z.string().describe(RACE_ARG_DESCRIPTIONS.skDelete),
    }),
  }
);

export const updateRace = tool(
  async ({ yearKey, sk, time, vdot, comments }) => {
    try {
      const updates: string[] = [];
      const values: Record<string, unknown> = {};
      const removes: string[] = [];

      if (time !== undefined) {
        updates.push('#t = :t');
        values[':t'] = time;
      }
      if (vdot !== undefined) {
        updates.push('vdot = :v');
        values[':v'] = vdot;
      }
      if (comments !== undefined) {
        if (comments === '') {
          removes.push('comments');
        } else {
          updates.push('comments = :c');
          values[':c'] = comments;
        }
      }

      let updateExpr = '';
      if (updates.length) updateExpr += `SET ${updates.join(', ')}`;
      if (removes.length) updateExpr += ` REMOVE ${removes.join(', ')}`;

      if (!updateExpr) {
        return JSON.stringify({ success: false, error: 'No fields to update. Provide at least one of: time, vdot, comments.' });
      }

      // "time" is a DynamoDB reserved word, so use an expression attribute name
      const expressionAttributeNames: Record<string, string> = {};
      if (time !== undefined) {
        expressionAttributeNames['#t'] = 'time';
      }

      await docClient.send(
        new UpdateCommand({
          TableName: RACES_TABLE_NAME,
          Key: { yearKey, sk },
          UpdateExpression: updateExpr,
          ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
          ...(Object.keys(expressionAttributeNames).length ? { ExpressionAttributeNames: expressionAttributeNames } : {}),
        })
      );

      return JSON.stringify({ success: true, yearKey, sk, updated: { time, vdot, comments } });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return JSON.stringify({ success: false, error: `Failed to update race: ${message}` });
    }
  },
  {
    name: 'updateRace',
    description: RACE_TOOL_DESCRIPTIONS.updateRace,
    schema: z.object({
      yearKey: z.string().describe(RACE_ARG_DESCRIPTIONS.yearKeyUpdate),
      sk: z.string().describe(RACE_ARG_DESCRIPTIONS.skUpdate),
      time: z.string().optional().describe(RACE_ARG_DESCRIPTIONS.timeUpdate),
      vdot: z.number().optional().describe(RACE_ARG_DESCRIPTIONS.vdotUpdate),
      comments: z
        .string()
        .optional()
        .describe(RACE_ARG_DESCRIPTIONS.commentsUpdate),
    }),
  }
);

/** All race history tools, ready to pass to createAgent({ tools }). */
export const raceTools = [listRaces, addRace, removeRace, updateRace];
