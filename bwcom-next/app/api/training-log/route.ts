import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TRAINING_LOG_TABLE_NAME as TABLE_NAME } from '@/lib/dynamodb';

interface DailyEntry {
  logId: string;
  sk: string;
  date: string;
  entryType: 'daily';
  slot: 'workout1' | 'workout2';
  description: string;
  miles: number;
  highlight?: boolean;
}

interface WeeklyEntry {
  logId: string;
  sk: string;
  date: string;
  entryType: 'week';
  description: string;
}

type TrainingLogEntry = DailyEntry | WeeklyEntry;

interface TrainingLogSection {
  id: string;
  name: string;
  entries: TrainingLogEntry[];
}

/** Map logId → display name. Add new cycles here. */
const LOG_NAMES: Record<string, string> = {
  'paris-2026': 'Paris 2026',
};

function toEntry(item: Record<string, unknown>): TrainingLogEntry {
  const base = {
    logId: item.logId as string,
    sk: item.sk as string,
    date: item.date as string,
    entryType: item.entryType as string,
    description: item.description as string,
  };

  if (base.entryType === 'daily') {
    return {
      ...base,
      entryType: 'daily',
      slot: item.slot as 'workout1' | 'workout2',
      miles: item.miles as number,
      ...(item.highlight ? { highlight: true } : {}),
    };
  }

  return { ...base, entryType: 'week' };
}

/**
 * GET /api/training-log?sectionId=paris-2026
 * Returns a single training log section with all entries, or 404.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');

  if (!sectionId) {
    return Response.json({ error: 'sectionId query parameter is required' }, { status: 400 });
  }

  try {
    const allItems: Record<string, unknown>[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'logId = :lid',
          ExpressionAttributeValues: { ':lid': sectionId },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );
      allItems.push(...(result.Items ?? []));
      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    if (allItems.length === 0) {
      // Return an empty section rather than 404 — the cycle exists but has no data yet
    }

    const entries = allItems.map(toEntry);

    const section: TrainingLogSection = {
      id: sectionId,
      name: LOG_NAMES[sectionId] ?? sectionId,
      entries,
    };

    return Response.json(section);
  } catch (err) {
    console.error('Failed to fetch training log data:', err);
    return Response.json(
      { error: 'Failed to fetch training log data' },
      { status: 500 }
    );
  }
}
