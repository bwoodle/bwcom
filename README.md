# brentwoodle.com

Personal website built with Next.js 15, deployed on AWS ECS Fargate (ARM64) behind an ALB. Uses DynamoDB for data, CloudFront+S3 for images, and Amazon Bedrock (Nova) for an AI chat agent.

## Architecture overview

```md
┌─────────────────────────────────────────────────────────┐
│  Route 53 (brentwoodle.com, woodle.org)                 │
│         ▼                                               │
│  ALB (HTTPS, www/woodle.org → apex redirects)           │
│         ▼                                               │
│  ECS Fargate (ARM64, Next.js standalone)                │
│         ▼                    ▼                           │
│  DynamoDB tables        CloudFront image CDN            │
│  (allowance, media,     -> S3 images bucket             │
│   races, training-log)                                  │
│         ▼                                               │
│  Amazon Bedrock (Nova)                                  │
└─────────────────────────────────────────────────────────┘
```

Infrastructure is managed with Terraform using a **two-tier** pattern:

- **Data tier** (`env/*-data`): DynamoDB tables and the S3 images bucket. Long-lived, never destroyed.
- **Infra tier** (`env/test`, `env/prod`): VPC, ALB, ECS cluster/service, Route 53 records. Can be created/destroyed independently.

Terraform state lives in the `bwcom-terraform-state` S3 bucket, keyed by environment name.

## Environments

| Environment | Domain |
| --- | --- |
| **prod** | `brentwoodle.com` |
| **test** | `test-next.brentwoodle.com` |

- **Prod** is fully managed by CI. Never modify prod by hand.
- **Test data** (DynamoDB tables + S3 bucket) is always deployed because local development (`npm run dev`) reads/writes to the test tables and images.
- **Test infra** (ECS, ALB, etc.) only exists when you need to test infrastructure changes. Stand it up with `deploy-test.sh` and tear it down with `destroy-test.sh` to avoid ongoing costs.

## Local development

### Prerequisites

- Node.js 22+
- AWS CLI configured with credentials that can access DynamoDB and S3 in `us-west-2`
- Terraform (for data tier changes)

### Setup

1. Ensure the test data tier is deployed:

   ```bash
   cd bwcom-terraform/env/test-data
   terraform init
   terraform apply
   ```

1. Create `bwcom-next/.env.local` with your secrets:

  ```env
   NEXTAUTH_SECRET=<your-secret>
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
  NEXT_PUBLIC_IMAGES_BASE_URL=https://test-image-cdn.example.cloudfront.net
   ```

1. Install dependencies and start the dev server:

   ```bash
   cd bwcom-next
   npm install
   npm run dev
   ```

   The app runs at `http://localhost:3000`, hitting test DynamoDB tables and the test S3 images bucket.

### Syncing images

Source images live in `photos/web-content/`. Thumbnails are auto-generated (800px wide) and everything is synced to S3:

```bash
# From bwcom-next/
npm run sync-images:test    # → s3://test.brentwoodle.com
npm run sync-images:prod    # → s3://brentwoodle.com
```

Or directly:

```bash
./scripts/sync-images.sh test.brentwoodle.com
```

Images are referenced via `NEXT_PUBLIC_IMAGES_BASE_URL` (inlined at build time). Current deployments use CloudFront distribution domains instead of direct S3 URLs.

## Testing infrastructure changes

To stand up the full test ECS environment:

```bash
./scripts/deploy-test.sh
```

This script (run from the repo root):

1. Reads secrets from `bwcom-next/.env.local`
1. Deploys/updates test image CDN stack (`bwcom-images-cdn-test`) in `us-east-1`
1. Builds and pushes a Docker image to ECR (tagged `latest`) using the test image CDN URL as `NEXT_PUBLIC_IMAGES_BASE_URL`
1. Applies the test data tier (`env/test-data`) with the CDN distribution ARN wired to the S3 bucket policy
1. Syncs images to the test S3 bucket
1. Applies the test infra tier (`env/test`) — creates VPC, ALB, ECS service

The test environment will be accessible at `https://test-next.brentwoodle.com`.

To tear it down (data tier is preserved):

```bash
./scripts/destroy-test.sh
```

## CI / CD

CI is defined in `.github/workflows/ci.yml`. On every push to `main`:

1. Runs on a native ARM64 GitHub runner (`ubuntu-24.04-arm`)
1. Deploys/updates the prod image CDN stack (`bwcom-images-cdn-prod`) in `us-east-1`
1. Reads CDN outputs (distribution domain + ARN)
1. Builds the Docker image and pushes to ECR (tagged with commit SHA + `latest`), using the CDN domain as `NEXT_PUBLIC_IMAGES_BASE_URL`
1. Applies `prod-data` Terraform with `TF_VAR_images_cloudfront_distribution_arns` so S3 object reads are limited to the CloudFront distribution
1. Syncs images to the prod S3 bucket
1. Applies `prod` Terraform (ECS service picks up new image tag)

Secrets are stored in GitHub Actions secrets: `AWS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Docker

The app is containerized via a multi-stage Dockerfile (`bwcom-next/Dockerfile`):

- **Builder stage**: `node:22-slim` — installs deps, builds Next.js standalone output
- **Runner stage**: `node:22-slim` — copies only the built app, runs as non-root `nextjs` user
- Health check: `GET /api/health`
- Runs on ARM64 (Fargate `ARM64` runtime platform)

`NEXT_PUBLIC_IMAGES_BASE_URL` is passed as a `--build-arg` since `NEXT_PUBLIC_*` vars are inlined at build time.

## Terraform modules

- `modules/dynamodb-allowance`: allowance tracker table (`childName` / `timestamp`)
- `modules/dynamodb-media`: media entries table
- `modules/dynamodb-races`: race history table
- `modules/dynamodb-training-log`: training log table
- `modules/s3-images`: S3 bucket with versioning for photos, with optional CloudFront-only read policy
- `modules/ecs-next`: VPC, ALB (HTTPS + HTTP->HTTPS redirect), ECS Fargate service, Route 53, IAM roles (Bedrock, DynamoDB), optional www and woodle.org redirects

## Project structure

```md
bwcom-next/            # Next.js application
  app/                 # App Router pages and API routes
  components/          # React components
  lib/                 # Server-side utilities, AI agent, tool definitions
  public/              # Static assets
  types/               # TypeScript type extensions
bwcom-terraform/       # Terraform infrastructure
  env/
    prod-data/         # Prod data tier (DynamoDB + S3)
    prod/              # Prod infra tier (ECS + ALB)
    test-data/         # Test data tier (DynamoDB + S3)
    test/              # Test infra tier (ECS + ALB)
  modules/             # Reusable Terraform modules
photos/                # Source images (synced to S3)
scripts/               # deploy-test.sh, destroy-test.sh, sync-images.sh
.github/workflows/     # CI/CD pipeline
```
