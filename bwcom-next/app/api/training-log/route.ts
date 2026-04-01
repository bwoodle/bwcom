import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { docClient, TRAINING_LOG_TABLE_NAME as TABLE_NAME } from '@/lib/dynamodb';
import {
  decodeCursor,
  encodeCursor,
  parseLimit,
  PUBLIC_CACHE_HEADERS,
  rateLimitPublicRequest,
} from '@/lib/public-api-guards';
import type {
  TrainingLogEntry,
  TrainingLogSection,
  TrainingLogBatchUpdateItem,
  TrainingLogBatchUpdateRequest,
  TrainingLogBatchUpdateResponse,
  TrainingLogCreateRequest,
  TrainingLogCreateResponse,
} from '@/types/training-log';

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

function isAdminSession(session: Session | null) {
  return Boolean(session?.user?.email && session?.user?.role === 'admin');
}

function isSkSupported(sk: string): boolean {
  return sk.startsWith('daily#') || sk.startsWith('week#');
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isSundayDate(value: string): boolean {
  if (!isIsoDate(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.getDay() === 0;
}

function buildDailySk(date: string, slot: 'workout1' | 'workout2'): string {
  return `daily#${date}#${slot}`;
}

function buildWeeklySk(date: string): string {
  return `week#${date}`;
}

function validateUpdateItem(item: TrainingLogBatchUpdateItem): string | null {
  if (!item.sk || typeof item.sk !== 'string' || !isSkSupported(item.sk)) {
    return 'Invalid sk format. Expected daily#... or week#...';
  }

  if (item.description !== undefined) {
    if (typeof item.description !== 'string' || item.description.trim().length === 0) {
      return 'Description must be a non-empty string when provided.';
    }
  }

  if (item.miles !== undefined) {
    if (typeof item.miles !== 'number' || !Number.isFinite(item.miles)) {
      return 'Miles must be a finite number when provided.';
    }
  }

  if (item.highlight !== undefined && typeof item.highlight !== 'boolean') {
    return 'Highlight must be a boolean when provided.';
  }

  if (
    item.description === undefined &&
    item.miles === undefined &&
    item.highlight === undefined
  ) {
    return 'No update fields provided.';
  }

  if (item.sk.startsWith('week#') && (item.miles !== undefined || item.highlight !== undefined)) {
    return 'Weekly entries only support description updates.';
  }

  return null;
}

/**
 * GET /api/training-log?sectionId=paris-2026
 * Returns a single training log section with all entries, or 404.
 */
export async function GET(request: Request) {
  const limited = rateLimitPublicRequest(request, 'training-log-get', 60);
  if (limited) {
    return limited;
  }

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get('sectionId');
  const limit = parseLimit(searchParams.get('limit'), 500, 1000);
  const cursor = decodeCursor(searchParams.get('cursor'));

  if (!sectionId) {
    return Response.json({ error: 'sectionId query parameter is required' }, { status: 400 });
  }

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'logId = :lid',
        ExpressionAttributeValues: { ':lid': sectionId },
        ExclusiveStartKey: cursor,
        Limit: limit,
      })
    );

    const items = result.Items ?? [];

    if (items.length === 0) {
      // Return an empty section rather than 404 — the cycle exists but has no data yet
    }

    const entries = items.map((item) => toEntry(item as Record<string, unknown>));

    const section: TrainingLogSection = {
      id: sectionId,
      name: LOG_NAMES[sectionId] ?? sectionId,
      entries,
    };

    return Response.json(
      {
        ...section,
        nextCursor: encodeCursor(result.LastEvaluatedKey as Record<string, unknown> | undefined),
      },
      { headers: PUBLIC_CACHE_HEADERS }
    );
  } catch (err) {
    console.error('Failed to fetch training log data:', err);
    return Response.json(
      { error: 'Failed to fetch training log data' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/training-log
 * Body: { logId: string, updates: [{ sk, description?, miles?, highlight? }] }
 * Applies row-level updates in bulk and returns per-row results.
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: TrainingLogBatchUpdateRequest;
  try {
    body = (await request.json()) as TrainingLogBatchUpdateRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.logId || typeof body.logId !== 'string') {
    return Response.json({ error: 'logId is required' }, { status: 400 });
  }
  if (!Array.isArray(body.updates) || body.updates.length === 0) {
    return Response.json({ error: 'updates must be a non-empty array' }, { status: 400 });
  }
  if (body.updates.length > 200) {
    return Response.json({ error: 'updates cannot exceed 200 items' }, { status: 400 });
  }

  const results: TrainingLogBatchUpdateResponse['results'] = [];

  for (const item of body.updates) {
    const validationError = validateUpdateItem(item);
    if (validationError) {
      results.push({ sk: item?.sk ?? 'unknown', success: false, error: validationError });
      continue;
    }

    const updates: string[] = [];
    const values: Record<string, unknown> = {};
    const removes: string[] = [];

    if (item.description !== undefined) {
      updates.push('description = :d');
      values[':d'] = item.description.trim();
    }
    if (item.miles !== undefined) {
      updates.push('miles = :m');
      values[':m'] = item.miles;
    }
    if (item.highlight === true) {
      updates.push('highlight = :h');
      values[':h'] = true;
    } else if (item.highlight === false) {
      removes.push('highlight');
    }

    let updateExpression = '';
    if (updates.length > 0) {
      updateExpression += `SET ${updates.join(', ')}`;
    }
    if (removes.length > 0) {
      updateExpression += `${updateExpression ? ' ' : ''}REMOVE ${removes.join(', ')}`;
    }

    try {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { logId: body.logId, sk: item.sk },
          ConditionExpression: 'attribute_exists(logId) AND attribute_exists(sk)',
          UpdateExpression: updateExpression,
          ...(Object.keys(values).length > 0
            ? { ExpressionAttributeValues: values }
            : {}),
        })
      );
      results.push({ sk: item.sk, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown update error';
      results.push({ sk: item.sk, success: false, error: message });
    }
  }

  const successCount = results.filter((result) => result.success).length;
  const failureCount = results.length - successCount;

  return Response.json({
    logId: body.logId,
    successCount,
    failureCount,
    results,
  } satisfies TrainingLogBatchUpdateResponse);
}

/**
 * POST /api/training-log
 * Body daily: { logId, entryType: 'daily', date, slot, description, miles, highlight? }
 * Body week: { logId, entryType: 'week', date, description }
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminSession(session)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: TrainingLogCreateRequest;
  try {
    body = (await request.json()) as TrainingLogCreateRequest;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.logId || typeof body.logId !== 'string') {
    return Response.json({ error: 'logId is required' }, { status: 400 });
  }
  if (!body?.entryType || (body.entryType !== 'daily' && body.entryType !== 'week')) {
    return Response.json({ error: 'entryType must be daily or week' }, { status: 400 });
  }
  if (!isIsoDate(body.date)) {
    return Response.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    return Response.json({ error: 'description is required' }, { status: 400 });
  }

  try {
    if (body.entryType === 'daily') {
      if (body.slot !== 'workout1' && body.slot !== 'workout2') {
        return Response.json({ error: 'slot must be workout1 or workout2 for daily entries' }, { status: 400 });
      }
      if (typeof body.miles !== 'number' || !Number.isFinite(body.miles)) {
        return Response.json({ error: 'miles must be a finite number for daily entries' }, { status: 400 });
      }

      const entry: TrainingLogEntry = {
        logId: body.logId,
        sk: buildDailySk(body.date, body.slot),
        date: body.date,
        entryType: 'daily',
        slot: body.slot,
        description: body.description.trim(),
        miles: body.miles,
        ...(body.highlight ? { highlight: true } : {}),
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...entry,
            createdAt: new Date().toISOString(),
          },
          ConditionExpression: 'attribute_not_exists(logId) AND attribute_not_exists(sk)',
        })
      );

      return Response.json({ success: true, entry } satisfies TrainingLogCreateResponse);
    }

    if (!isSundayDate(body.date)) {
      return Response.json({ error: 'Weekly summary date must be a Sunday' }, { status: 400 });
    }

    const entry: TrainingLogEntry = {
      logId: body.logId,
      sk: buildWeeklySk(body.date),
      date: body.date,
      entryType: 'week',
      description: body.description.trim(),
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...entry,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(logId) AND attribute_not_exists(sk)',
      })
    );

    return Response.json({ success: true, entry } satisfies TrainingLogCreateResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create entry';
    return Response.json({ error: message }, { status: 400 });
  }
}
