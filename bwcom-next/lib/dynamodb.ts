import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-west-2' });

/** Shared DynamoDB Document Client singleton — reused across all server code. */
export const docClient = DynamoDBDocumentClient.from(client);

/** The allowance DynamoDB table name, injected via environment variable. */
export const ALLOWANCE_TABLE_NAME = process.env.ALLOWANCE_TABLE_NAME!;
