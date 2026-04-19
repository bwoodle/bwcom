import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import type {
  RaceBatchUpdateItem,
  RaceBatchUpdateResponse,
  RaceCreateRequest,
  RaceItem,
} from "@/types/races";
import {
  buildRaceEntryFromCreateRequest,
  buildRaceUpdateMutation,
  toRaceItem,
} from "@/lib/races";

type DocumentClientLike = {
  send(command: object): Promise<{
    Items?: Record<string, unknown>[];
    LastEvaluatedKey?: Record<string, unknown>;
  }>;
};

export async function fetchRacePage(params: {
  client: DocumentClientLike;
  tableName: string;
  limit: number;
  cursor?: Record<string, unknown>;
}): Promise<{ races: RaceItem[]; lastEvaluatedKey?: Record<string, unknown> }> {
  const result = await params.client.send(
    new ScanCommand({
      TableName: params.tableName,
      Limit: params.limit,
      ExclusiveStartKey: params.cursor,
    }),
  );

  const races = (result.Items ?? []).map((item) => toRaceItem(item));
  races.sort((a, b) => b.sk.localeCompare(a.sk));

  return {
    races,
    lastEvaluatedKey: result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined,
  };
}

export async function fetchAllRaces(params: {
  client: DocumentClientLike;
  tableName: string;
}): Promise<RaceItem[]> {
  const allItems: RaceItem[] = [];
  let cursor: Record<string, unknown> | undefined;

  do {
    const page = await fetchRacePage({
      client: params.client,
      tableName: params.tableName,
      limit: 1000,
      cursor,
    });
    allItems.push(...page.races);
    cursor = page.lastEvaluatedKey;
  } while (cursor);

  allItems.sort((a, b) => {
    const yearDelta = b.yearKey.localeCompare(a.yearKey);
    if (yearDelta !== 0) return yearDelta;
    return b.sk.localeCompare(a.sk);
  });
  return allItems;
}

export async function createRace(params: {
  client: DocumentClientLike;
  tableName: string;
  request: RaceCreateRequest;
}): Promise<RaceItem> {
  const entry = buildRaceEntryFromCreateRequest(params.request);

  await params.client.send(
    new PutCommand({
      TableName: params.tableName,
      Item: entry,
      ConditionExpression:
        "attribute_not_exists(yearKey) AND attribute_not_exists(sk)",
    }),
  );

  return entry;
}

export async function updateRaces(params: {
  client: DocumentClientLike;
  tableName: string;
  updates: RaceBatchUpdateItem[];
}): Promise<RaceBatchUpdateResponse> {
  const results: RaceBatchUpdateResponse["results"] = [];

  for (const update of params.updates) {
    try {
      const mutation = buildRaceUpdateMutation(update);
      await params.client.send(
        new UpdateCommand({
          TableName: params.tableName,
          Key: { yearKey: update.yearKey, sk: update.sk },
          ConditionExpression:
            "attribute_exists(yearKey) AND attribute_exists(sk)",
          UpdateExpression: mutation.updateExpression,
          ...(mutation.expressionAttributeValues
            ? { ExpressionAttributeValues: mutation.expressionAttributeValues }
            : {}),
          ...(mutation.expressionAttributeNames
            ? { ExpressionAttributeNames: mutation.expressionAttributeNames }
            : {}),
        }),
      );

      results.push({
        yearKey: update.yearKey,
        sk: update.sk,
        success: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown update error";
      results.push({
        yearKey: update.yearKey,
        sk: update.sk,
        success: false,
        error: message,
      });
    }
  }

  const successCount = results.filter((row) => row.success).length;
  return {
    successCount,
    failureCount: results.length - successCount,
    results,
  };
}

export async function deleteRace(params: {
  client: DocumentClientLike;
  tableName: string;
  yearKey: string;
  sk: string;
}): Promise<void> {
  await params.client.send(
    new DeleteCommand({
      TableName: params.tableName,
      Key: { yearKey: params.yearKey, sk: params.sk },
    }),
  );
}
