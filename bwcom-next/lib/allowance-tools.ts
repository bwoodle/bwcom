import { tool } from 'langchain';
import { z } from 'zod';
import { QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, ALLOWANCE_TABLE_NAME } from './dynamodb';

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
    description: `List the most recent allowance entries for one or both children.

This returns the same data that is displayed on the admin page: the current
balance and the last 10 transactions for each child requested.

Use this tool:
- When the user asks about a child's balance or recent activity.
- **Before** calling removeAllowanceEntry, so you know the exact timestamp
  of the entry the user wants to remove.

The result is a JSON array with one object per child, each containing:
  childName  – "Preston" or "Leighton"
  balance    – current total balance (sum of all amounts ever)
  recentEntries – array of the 10 most recent items, each with:
      timestamp   – ISO-8601 sort key (e.g. "2026-02-08T10:00:00Z")
      date        – human-readable date string
      description – what the entry is for
      amount      – signed number (positive = accrued/earned, negative = spent)`,
    schema: z.object({
      childName: z
        .enum(['Preston', 'Leighton'])
        .optional()
        .describe(
          'The child to query. Omit to return data for both Preston and Leighton.'
        ),
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
    description: `Add a new allowance entry for a child (Preston or Leighton).

Use this tool when the user asks you to record a new allowance transaction.
You should generate a short, human-readable description for the entry.

Amount sign convention:
  positive number → money earned / accrued (e.g. weekly allowance, bonus)
  negative number → money spent / deducted (e.g. buying a toy, a fine)

Examples:
  { childName: "Preston", amount: 10, description: "Weekly allowance" }
  { childName: "Leighton", amount: -4.50, description: "Bought stickers" }

The entry is written to DynamoDB with an auto-generated ISO-8601 timestamp as
the sort key. The result confirms the written record including the timestamp.`,
    schema: z.object({
      childName: z
        .enum(['Preston', 'Leighton'])
        .describe('The child to add the entry for.'),
      amount: z
        .number()
        .describe(
          'The dollar amount. Positive = earned/accrued, negative = spent/deducted.'
        ),
      description: z
        .string()
        .describe(
          'A short human-readable description of the transaction (e.g. "Weekly allowance", "Bought a book").'
        ),
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
    description: `Remove an existing allowance entry for a child.

**IMPORTANT: Always ask the user for confirmation before calling this tool.**
Describe which entry you are about to delete and wait for the user to confirm.

Before calling this tool you MUST first call listRecentAllowanceEntries to
discover the exact timestamp (ISO-8601 sort key) of the entry to remove.
The timestamp is the unique identifier for the entry within that child's
records.

Parameters:
  childName – "Preston" or "Leighton"
  timestamp – the exact ISO-8601 timestamp of the entry to delete
              (e.g. "2026-02-08T10:00:00Z")

The entry is permanently deleted from DynamoDB. This cannot be undone.`,
    schema: z.object({
      childName: z
        .enum(['Preston', 'Leighton'])
        .describe('The child whose entry should be removed.'),
      timestamp: z
        .string()
        .describe(
          'The exact ISO-8601 timestamp (sort key) of the entry to delete. Obtain this from listRecentAllowanceEntries first.'
        ),
    }),
  }
);

/** All allowance tools, ready to pass to createAgent({ tools }). */
export const allowanceTools = [
  listRecentAllowanceEntries,
  addAllowanceEntry,
  removeAllowanceEntry,
];
