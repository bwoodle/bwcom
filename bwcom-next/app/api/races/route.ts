import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, RACES_TABLE_NAME as TABLE_NAME } from '@/lib/dynamodb';

export interface RaceItem {
  yearKey: string;    // e.g. "2026"
  sk: string;         // e.g. "2026-02-08#5K"
  date: string;       // display date, e.g. "Feb 8, 2026"
  distance: string;
  time: string;       // e.g. "3:12:45" or "18:30"
  vdot: number;
  comments?: string;
  createdAt: string;
}

/**
 * GET /api/races — Return all race results as a flat list, newest first.
 * Public endpoint (no auth required).
 */
export async function GET() {
  try {
    const allItems: RaceItem[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
        })
      );

      for (const item of result.Items ?? []) {
        allItems.push({
          yearKey: item.yearKey as string,
          sk: item.sk as string,
          date: item.date as string,
          distance: item.distance as string,
          time: item.time as string,
          vdot: item.vdot as number,
          comments: item.comments as string | undefined,
          createdAt: item.createdAt as string,
        });
      }

      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    // Sort newest first by sort key (which starts with YYYY-MM-DD)
    allItems.sort((a, b) => b.sk.localeCompare(a.sk));

    return Response.json({ races: allItems });
  } catch (err) {
    console.error('Failed to fetch race data:', err);
    return Response.json(
      { error: 'Failed to fetch race data' },
      { status: 500 }
    );
  }
}
