import { PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { docClient, MEDIA_TABLE_NAME as TABLE_NAME } from '@/lib/dynamodb';
import type {
  MediaItem,
  MediaFormat,
  MediaBatchUpdateRequest,
  MediaBatchUpdateResponse,
  MediaCreateRequest,
  MediaCreateResponse,
} from '@/types/media';

interface MonthGroup {
  monthKey: string;
  label: string;      // e.g. "February 2026"
  items: MediaItem[];
}

const MEDIA_FORMAT_OPTIONS: readonly MediaFormat[] = [
  'book',
  'audiobook',
  'kindle',
  'movie',
  'tv',
  'podcast',
];

function isAdminSession(session: Session | null): boolean {
  return Boolean(session?.user?.email && session?.user?.role === 'admin');
}

function isValidMonthKey(monthKey: string): boolean {
  return /^\d{4}-\d{2}$/.test(monthKey);
}

function isValidFormat(format: string): format is MediaFormat {
  return MEDIA_FORMAT_OPTIONS.includes(format as MediaFormat);
}

function buildSk(title: string): string {
  return `${new Date().toISOString()}#${title}`;
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
          format: item.format as MediaFormat,
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

/**
 * POST /api/media
 * Body: { monthKey, title, format, comments? }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: MediaCreateRequest;
  try {
    body = (await request.json()) as MediaCreateRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.monthKey || !isValidMonthKey(body.monthKey)) {
    return Response.json({ error: 'monthKey must be YYYY-MM' }, { status: 400 });
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }
  if (!body.format || typeof body.format !== 'string' || !isValidFormat(body.format)) {
    return Response.json({ error: 'format is invalid' }, { status: 400 });
  }

  const entry: MediaItem = {
    monthKey: body.monthKey,
    sk: buildSk(body.title.trim()),
    title: body.title.trim(),
    format: body.format,
    ...(body.comments && body.comments.trim().length > 0
      ? { comments: body.comments.trim() }
      : {}),
    createdAt: new Date().toISOString(),
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: entry,
        ConditionExpression: 'attribute_not_exists(monthKey) AND attribute_not_exists(sk)',
      })
    );

    return Response.json({ success: true, entry } satisfies MediaCreateResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create media entry';
    return Response.json({ error: message }, { status: 400 });
  }
}

/**
 * PATCH /api/media
 * Body: { updates: [{ monthKey, sk, title?, format?, comments? }] }
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: MediaBatchUpdateRequest;
  try {
    body = (await request.json()) as MediaBatchUpdateRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body?.updates) || body.updates.length === 0) {
    return Response.json({ error: 'updates must be a non-empty array' }, { status: 400 });
  }
  if (body.updates.length > 200) {
    return Response.json({ error: 'updates cannot exceed 200 items' }, { status: 400 });
  }

  const results: MediaBatchUpdateResponse['results'] = [];

  for (const item of body.updates) {
    if (!item?.monthKey || !isValidMonthKey(item.monthKey)) {
      results.push({
        monthKey: item?.monthKey ?? 'unknown',
        sk: item?.sk ?? 'unknown',
        success: false,
        error: 'monthKey must be YYYY-MM',
      });
      continue;
    }
    if (!item?.sk || typeof item.sk !== 'string') {
      results.push({
        monthKey: item.monthKey,
        sk: item?.sk ?? 'unknown',
        success: false,
        error: 'sk is required',
      });
      continue;
    }
    if (item.format !== undefined && !isValidFormat(item.format)) {
      results.push({
        monthKey: item.monthKey,
        sk: item.sk,
        success: false,
        error: 'format is invalid',
      });
      continue;
    }

    const updates: string[] = [];
    const values: Record<string, unknown> = {};
    const names: Record<string, string> = {};
    const removes: string[] = [];

    if (item.title !== undefined) {
      if (item.title.trim().length === 0) {
        results.push({
          monthKey: item.monthKey,
          sk: item.sk,
          success: false,
          error: 'title cannot be empty',
        });
        continue;
      }
      updates.push('#title = :t');
      names['#title'] = 'title';
      values[':t'] = item.title.trim();
    }

    if (item.format !== undefined) {
      updates.push('#format = :f');
      names['#format'] = 'format';
      values[':f'] = item.format;
    }

    if (item.comments !== undefined) {
      if (item.comments === null || item.comments.trim().length === 0) {
        removes.push('comments');
      } else {
        updates.push('comments = :c');
        values[':c'] = item.comments.trim();
      }
    }

    if (updates.length === 0 && removes.length === 0) {
      results.push({
        monthKey: item.monthKey,
        sk: item.sk,
        success: false,
        error: 'No update fields provided',
      });
      continue;
    }

    let updateExpression = '';
    if (updates.length > 0) updateExpression += `SET ${updates.join(', ')}`;
    if (removes.length > 0) {
      updateExpression += `${updateExpression ? ' ' : ''}REMOVE ${removes.join(', ')}`;
    }

    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { monthKey: item.monthKey, sk: item.sk },
          ConditionExpression: 'attribute_exists(monthKey) AND attribute_exists(sk)',
          UpdateExpression: updateExpression,
          ...(Object.keys(values).length > 0 ? { ExpressionAttributeValues: values } : {}),
          ...(Object.keys(names).length > 0 ? { ExpressionAttributeNames: names } : {}),
        })
      );
      results.push({ monthKey: item.monthKey, sk: item.sk, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown update error';
      results.push({ monthKey: item.monthKey, sk: item.sk, success: false, error: message });
    }
  }

  const successCount = results.filter((row) => row.success).length;
  const failureCount = results.length - successCount;

  return Response.json({
    successCount,
    failureCount,
    results,
  } satisfies MediaBatchUpdateResponse);
}
