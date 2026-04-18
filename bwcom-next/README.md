# BWCom Next

Next.js application for [brentwoodle.com](https://brentwoodle.com). Uses CloudScape components, DynamoDB for data, CloudFront+S3 for images, and Amazon Bedrock (Nova) for an AI chat agent.

See the [root README](../README.md) for full architecture, deployment, and infrastructure documentation.

## Local development

```bash
npm install
npm run dev
```

Requires `bwcom-next/.env.local`:

```env
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
MEDIA_TABLE_NAME=media-test-v1
RACES_TABLE_NAME=races-test-v1
TRAINING_LOG_TABLE_NAME=training-log-test-v1
NEXT_PUBLIC_IMAGES_BASE_URL=https://<test-cloudfront-domain>.cloudfront.net
```

See the [root README setup steps](../README.md#setup) for how to deploy the test data tier and get the CloudFront domain.

## Quality checks

```bash
npm run format
npm run format:check
npm run lint
npm run test
npm run build
```

Vitest is configured for unit tests around pure helpers. Keep these tests focused on deterministic library code rather than environment-dependent integrations.

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_IMAGES_BASE_URL=https://<cdn-domain> -t bwcom-next .
docker run -p 3000:3000 bwcom-next
```

`NEXT_PUBLIC_IMAGES_BASE_URL` must be passed as a `--build-arg` because `NEXT_PUBLIC_*` vars are inlined at build time.
