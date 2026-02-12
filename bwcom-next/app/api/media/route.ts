import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, MEDIA_TABLE_NAME as TABLE_NAME } from '@/lib/dynamodb';

export interface MediaItem {
  monthKey: string;   // e.g. "2026-02"
  sk: string;         // e.g. "2026-02-08T12:00:00.000Z#Paradais"
  title: string;
  format: string;
  comments?: string;
  createdAt: string;
}

export interface MonthGroup {
  monthKey: string;
  label: string;      // e.g. "February 2026"
  items: MediaItem[];
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * GET /api/media — Return all media items grouped by month, newest first.
 * Public endpoint (no auth required).
 */
export async function GET() {
  try {
    const allItems: MediaItem[] = [];
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
          monthKey: item.monthKey as string,
          sk: item.sk as string,
          title: item.title as string,
          format: item.format as string,
          comments: item.comments as string | undefined,
          createdAt: item.createdAt as string,
        });
      }

      lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    // Group by monthKey
    const groupMap = new Map<string, MediaItem[]>();
    for (const item of allItems) {
      const group = groupMap.get(item.monthKey) ?? [];
      group.push(item);
      groupMap.set(item.monthKey, group);
    }

    // Sort months descending, items within each month by title
    const months: MonthGroup[] = Array.from(groupMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monthKey, items]) => ({
        monthKey,
        label: formatMonthLabel(monthKey),
        items: items.sort((a, b) => a.title.localeCompare(b.title)),
      }));

    return Response.json({ months });
  } catch (err) {
    console.error('Failed to fetch media data:', err);
    return Response.json(
      { error: 'Failed to fetch media data' },
      { status: 500 }
    );
  }
}
