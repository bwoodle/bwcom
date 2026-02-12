import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, RACES_TABLE_NAME as TABLE_NAME } from '@/lib/dynamodb';

export interface RaceItem {
  yearKey: string;    // e.g. "2026"
  sk: string;         // e.g. "2026-02-08T12:00:00.000Z#Boston Marathon"
  date: string;       // display date, e.g. "Feb 8, 2026"
  distance: string;
  time: string;       // e.g. "3:12:45" or "18:30"
  vdot: number;
  comments?: string;
  createdAt: string;
}

export interface YearGroup {
  yearKey: string;
  label: string;      // e.g. "2026"
  items: RaceItem[];
}

/**
 * GET /api/races — Return all race results grouped by year, newest first.
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

    // Group by yearKey
    const groupMap = new Map<string, RaceItem[]>();
    for (const item of allItems) {
      const group = groupMap.get(item.yearKey) ?? [];
      group.push(item);
      groupMap.set(item.yearKey, group);
    }

    // Sort years descending, items within each year by date descending (sk contains timestamp)
    const years: YearGroup[] = Array.from(groupMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([yearKey, items]) => ({
        yearKey,
        label: yearKey,
        items: items.sort((a, b) => b.sk.localeCompare(a.sk)),
      }));

    return Response.json({ years });
  } catch (err) {
    console.error('Failed to fetch race data:', err);
    return Response.json(
      { error: 'Failed to fetch race data' },
      { status: 500 }
    );
  }
}
