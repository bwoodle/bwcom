import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, ALLOWANCE_TABLE_NAME as TABLE_NAME } from '@/lib/dynamodb';

const CHILDREN = ['Preston', 'Leighton'];

interface AllowanceItem {
  date: string;
  description: string;
  amount: number;
}

interface ChildAllowance {
  childName: string;
  total: number;
  recentItems: AllowanceItem[];
}

async function getChildAllowance(childName: string): Promise<ChildAllowance> {
  // Query all items for this child to compute the total
  const allItems: AllowanceItem[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'childName = :name',
        ExpressionAttributeValues: { ':name': childName },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    for (const item of result.Items ?? []) {
      const ts = new Date(item.timestamp as string);
      const formatted = ts.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Chicago',
      });
      allItems.push({
        date: formatted,
        description: item.description as string,
        amount: item.amount as number,
      });
    }

    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  // Compute total from all items
  const total = allItems.reduce((sum, item) => sum + item.amount, 0);

  // Sort by timestamp descending and take the latest 10
  // Items come back sorted by sort key (timestamp) ascending, so reverse
  const recentItems = allItems.reverse().slice(0, 10);

  return { childName, total, recentItems };
}

/**
 * GET /api/allowance — Return allowance data for all children.
 * Requires admin authentication.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await Promise.all(CHILDREN.map(getChildAllowance));
    return Response.json({ children: results });
  } catch (err) {
    console.error('Failed to fetch allowance data:', err);
    return Response.json(
      { error: 'Failed to fetch allowance data' },
      { status: 500 }
    );
  }
}
