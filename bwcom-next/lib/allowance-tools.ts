import { tool } from 'langchain';
import { z } from 'zod';
import { QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, ALLOWANCE_TABLE_NAME } from './dynamodb';
import {
  ALLOWANCE_TOOL_DESCRIPTIONS,
  ALLOWANCE_ARG_DESCRIPTIONS,
} from './prompts/tool-descriptions/allowance';

const CHILDREN = ['Preston', 'Leighton'] as const;

/**
 * Shared helper: query a single child's allowance data from DynamoDB.
 * Returns the computed balance and the most recent `limit` entries.
 */
async function queryChildAllowance(
  childName: string,
  limit: number = 10
): Promise<{
  childName: string;
  balance: number;
  recentEntries: { timestamp: string; date: string; description: string; amount: number }[];
}> {
  // First, query ALL items to compute the total balance
  const allItems: { timestamp: string; description: string; amount: number }[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: ALLOWANCE_TABLE_NAME,
        KeyConditionExpression: 'childName = :name',
        ExpressionAttributeValues: { ':name': childName },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    for (const item of result.Items ?? []) {
      allItems.push({
        timestamp: item.timestamp as string,
        description: item.description as string,
        amount: item.amount as number,
      });
    }

    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  const balance = allItems.reduce((sum, item) => sum + item.amount, 0);

  // Sort descending by timestamp and take the most recent entries
  allItems.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const recentEntries = allItems.slice(0, limit).map((item) => {
    const ts = new Date(item.timestamp);
    const date = ts.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Chicago',
    });
    return { timestamp: item.timestamp, date, description: item.description, amount: item.amount };
  });

  return { childName, balance, recentEntries };
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const listRecentAllowanceEntries = tool(
  async ({ childName }) => {
    const names = childName ? [childName] : [...CHILDREN];
    const results = await Promise.all(names.map((n) => queryChildAllowance(n)));
    return JSON.stringify(results, null, 2);
  },
  {
    name: 'listRecentAllowanceEntries',
    description: ALLOWANCE_TOOL_DESCRIPTIONS.listRecentAllowanceEntries,
    schema: z.object({
      childName: z
        .enum(['Preston', 'Leighton'])
        .optional()
        .describe(ALLOWANCE_ARG_DESCRIPTIONS.childNameOptional),
    }),
  }
);

export const addAllowanceEntry = tool(
  async ({ childName, amount, description }) => {
    const timestamp = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: ALLOWANCE_TABLE_NAME,
        Item: {
          childName,
          timestamp,
          description,
          amount,
        },
      })
    );

    return JSON.stringify({
      success: true,
      childName,
      timestamp,
      description,
      amount,
    });
  },
  {
    name: 'addAllowanceEntry',
    description: ALLOWANCE_TOOL_DESCRIPTIONS.addAllowanceEntry,
    schema: z.object({
      childName: z
        .enum(['Preston', 'Leighton'])
        .describe(ALLOWANCE_ARG_DESCRIPTIONS.childNameRequired),
      amount: z
        .number()
        .describe(ALLOWANCE_ARG_DESCRIPTIONS.amount),
      description: z.string().describe(ALLOWANCE_ARG_DESCRIPTIONS.description),
    }),
  }
);

export const removeAllowanceEntry = tool(
  async ({ childName, timestamp }) => {
    await docClient.send(
      new DeleteCommand({
        TableName: ALLOWANCE_TABLE_NAME,
        Key: {
          childName,
          timestamp,
        },
      })
    );

    return JSON.stringify({
      success: true,
      deleted: { childName, timestamp },
    });
  },
  {
    name: 'removeAllowanceEntry',
    description: ALLOWANCE_TOOL_DESCRIPTIONS.removeAllowanceEntry,
    schema: z.object({
      childName: z
        .enum(['Preston', 'Leighton'])
        .describe(ALLOWANCE_ARG_DESCRIPTIONS.removeChildName),
      timestamp: z
        .string()
        .describe(ALLOWANCE_ARG_DESCRIPTIONS.timestamp),
    }),
  }
);

/** All allowance tools, ready to pass to createAgent({ tools }). */
export const allowanceTools = [
  listRecentAllowanceEntries,
  addAllowanceEntry,
  removeAllowanceEntry,
];
