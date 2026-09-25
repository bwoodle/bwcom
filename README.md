# brentwoodle.com

Personal website built with **Next.js 16** (backend/admin) and **React SPA** (frontend). Frontend is serverless (CloudFront + S3 + Lambda@Edge), backend optional. Uses DynamoDB for data and CloudFront+S3 for images.

## Architecture overview

```md
┌───────────────────────────────────────────────────────────────┐
│  Route 53 (brentwoodle.com, woodle.org)                       │
│         ▼                                                     │
│  CloudFront (HTTPS, HTTP→HTTPS, SPA fallback)                 │
│    ├─ Origin: S3 (bwcom-spa-prod-site) → public React SPA   │
│    └─ Origin: Lambda (API) → authenticated endpoints         │
│         ▼              ▼                                      │
│      S3 bucket    Lambda@Edge (auth)                          │
│   (SPA + assets)       ▼                                      │
│                  DynamoDB tables                              │
│              (allowance, media,                               │
│               races, training-log)                            │
│                                                               │
│  Optional: ECS backend (test-only, for development)           │
└───────────────────────────────────────────────────────────────┘
```

### Deployment tiers

This is a **serverless SPA architecture** designed for cost efficiency:

| Component | Prod | Test |
| --- | --- | --- |
| Frontend (React SPA) | CloudFront + S3 | CloudFront + S3 |
| API (admin/authenticated routes) | Lambda + Lambda@Edge | Lambda + Lambda@Edge |
| Local dev | Next.js dev server (alternative backend) | Next.js dev server |
| ECS backend | **Not deployed** | Optional (for infra testing only) |

**Infrastructure is managed with Terraform:**
- `env/prod-data/` — DynamoDB tables and S3 images bucket (long-lived)
- `env/prod-serverless/` — CloudFront, Lambda, Lambda@Edge, Route 53 for production SPA
- `env/test-serverless/` — Same serverless stack for test environment
- `env/test/` — Optional ECS backend (test infra validation only)
- `env/test-data/` — DynamoDB tables and S3 bucket for local dev and test

Terraform state lives in the `bwcom-terraform-state` S3 bucket.

## Environments

| Environment | Domain | Frontend | API |
| --- | --- | --- | --- |
| **prod** | `brentwoodle.com` | SPA (CloudFront/S3) | Lambda |
| **test** | `test-next.brentwoodle.com` | SPA (CloudFront/S3) or Next.js | Lambda or Next.js backend |

- **Prod** is fully managed by CI. Never modify by hand.
- **Test data** (DynamoDB + images S3) is always deployed (local dev reads/writes to test tables).
- **Test serverless** is deployed by default. Test ECS backend only stands up when testing infra changes.

## Local development

### Prerequisites

- Node.js 22+
- Python 3.12+
- AWS CLI configured with credentials that can access DynamoDB and S3 in `us-west-2`
- Terraform (for data tier changes)
- [`just`](https://github.com/casey/just)
- [`git-gtr`](https://github.com/coderabbitai/git-worktree-runner)

### Worktree-first workflow

Treat the primary checkout (`/home/brent/code/bwcom`) as a control plane only. Do not implement changes there; create a dedicated worktree first.

Install gtr on Linux/macOS:

```bash
git clone https://github.com/coderabbitai/git-worktree-runner.git ~/.local/share/git-worktree-runner
cd ~/.local/share/git-worktree-runner
./install.sh
```

After pulling this repository's `.gtrconfig`, trust it once:

```bash
cd /home/brent/code/bwcom
git gtr trust
```

Then create a worktree for each task:

```bash
cd /home/brent/code/bwcom
git gtr new feat/my-change --from-current
cd "$(git gtr go feat/my-change)"
```

This repository's gtr config places worktrees under `../bwcom-worktrees`, copies `bwcom-next/.env.local`, and runs `just bootstrap` after creation. `just bootstrap` creates `.venv` with `python3 -m venv` when available and falls back to `python3 -m virtualenv` when needed.

For legacy branches that predate this tooling and do not yet contain the `justfile`, use `--no-hooks` and bootstrap manually after checkout.

### Setup

1. Deploy the test image CDN stack (CloudFront distribution for the test S3 bucket):

   ```bash
   aws cloudformation deploy \
     --region us-east-1 \
     --stack-name bwcom-images-cdn-test \
     --template-file cfn/bwcom-static/s3-cloudfront-stack/images-cdn.yml \
     --parameter-overrides BucketName=test.brentwoodle.com CreateDNS=false \
     --no-fail-on-empty-changeset
   ```

   Then read the CloudFront domain and ARN:

   ```bash
   IMAGE_CDN_DOMAIN=$(aws cloudformation describe-stacks \
     --region us-east-1 --stack-name bwcom-images-cdn-test \
     --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" --output text)
   IMAGE_CDN_ARN=$(aws cloudformation describe-stacks \
     --region us-east-1 --stack-name bwcom-images-cdn-test \
     --query "Stacks[0].Outputs[?OutputKey=='DistributionArn'].OutputValue" --output text)
   echo "CDN domain: ${IMAGE_CDN_DOMAIN}"
   ```

1. Deploy the test data tier (DynamoDB tables + S3 bucket with CloudFront-only access):

   ```bash
   cd bwcom-terraform/env/test-data
   terraform init
   TF_VAR_images_cloudfront_distribution_arns='["'"${IMAGE_CDN_ARN}"'"]' terraform apply
   ```

1. Sync images to the test S3 bucket:

   ```bash
   ./scripts/sync-images.sh test.brentwoodle.com
   ```

1. Create `bwcom-next/.env.local` with your secrets and table names:

   ```env
   NEXTAUTH_SECRET=<your-secret>
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=<your-google-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-client-secret>
   MEDIA_TABLE_NAME=media-test-v1
   RACES_TABLE_NAME=races-test-v1
   TRAINING_LOG_TABLE_NAME=training-log-test-v1
   NEXT_PUBLIC_IMAGES_BASE_URL=https://<IMAGE_CDN_DOMAIN from step 1>
   ```

   If you only need to get the dev server running, `cd bwcom-next && npm run dev` will bootstrap `bwcom-next/.env.local` from `bwcom-next/.env.local.example`.

1. Install dependencies and start the dev server:

   ```bash
   cd bwcom-next
   npm install
   npm run dev
   ```

   The app runs at `http://localhost:3000`, hitting test DynamoDB tables and images served via CloudFront.

### Code quality guardrails

Set up local guardrails once per development environment:

```bash
# From a task worktree root
just bootstrap
.venv/bin/python -m pre_commit install
```

Canonical local commands:

```bash
just lint
just test
just _next-build
```

To verify the hook wiring in a new environment, run `python -m pre_commit run --all-files` after installation. Pull requests run the same Python and Next.js checks in CI.

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

Images are referenced via `NEXT_PUBLIC_IMAGES_BASE_URL` (inlined at build time). Both test and prod S3 buckets are restricted to CloudFront-only access — images must be served through the CloudFront distributions.

## Deploying the serverless SPA

The serverless SPA is deployed via GitHub Actions CI on every push to `main`. To deploy manually or to test:

```bash
# Deploy SPA to test environment
./scripts/deploy-serverless-spa.sh test

# Deploy SPA to prod (use with caution!)
./scripts/deploy-serverless-spa.sh prod
```

Required environment variables:
- `ORIGIN_SECRET` — secret for CloudFront origin requests
- `GOOGLE_CLIENT_ID` — for frontend OAuth
- `IMAGES_BASE_URL` — CloudFront CDN for images (e.g., `https://d1645k04l4065v.cloudfront.net`)
- `ADMIN_EMAILS_CSV` — (optional) comma-separated admin emails for Lambda@Edge auth

The script:
1. Initializes and applies Terraform for `env/{test|prod}-serverless`
2. Reads the S3 bucket name and CloudFront distribution ID from Terraform output
3. Builds the SPA (`bwcom-spa/`) with environment variables inlined
4. Syncs the SPA dist/ to the S3 bucket
5. Invalidates CloudFront cache

## Testing ECS backend (optional)

**Note:** ECS backend is optional and only needed to validate infrastructure changes. For normal development, use the local Next.js dev server.

To stand up the test ECS environment:

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

The test environment will be accessible at `https://test-next.brentwoodle.com` (backend only).

To tear it down (data tier is preserved):

```bash
./scripts/destroy-test.sh
```

## CI / CD

CI is defined in `.github/workflows/ci.yml`. On every push to `main`:

1. Runs repository checks (linting, tests) on ARM64 GitHub runner
2. Plans Terraform changes for both `prod-data` and `prod-serverless`
3. On merge to main (not on PR), applies Terraform and deploys:
   - Applies `prod-data` (DynamoDB tables + S3 images bucket)
   - Applies `prod-serverless` (CloudFront + Lambda + Lambda@Edge)
   - Syncs images to prod S3 bucket
   - Builds and deploys the SPA to the prod S3 bucket

The SPA deployment is **fully serverless**:
- Frontend code runs in browser (React client)
- API routes run as AWS Lambda functions
- Authentication/authorization via Lambda@Edge
- Static assets served via CloudFront from S3
- No VPC, ALB, or ECS needed

Secrets are stored in GitHub Actions secrets: `AWS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `ORIGIN_SECRET`, `GOOGLE_CLIENT_ID`.

## Docker and the Next.js backend

The optional Next.js backend is containerized via multi-stage Dockerfile (`bwcom-next/Dockerfile`):

- **Builder stage**: `node:22-slim` — installs deps, builds Next.js standalone output
- **Runner stage**: `node:22-slim` — copies only the built app, runs as non-root `nextjs` user
- Health check: `GET /api/health`
- Runs on ARM64 (Fargate `ARM64` runtime platform)

`NEXT_PUBLIC_IMAGES_BASE_URL` is passed as a `--build-arg` since `NEXT_PUBLIC_*` vars are inlined at build time.

**Note:** The Next.js Docker image is only built for test ECS deployments and is not used in production. The production site is served entirely by the React SPA deployed to CloudFront/S3.

## Terraform modules

### Data modules
- `modules/dynamodb-allowance`: allowance tracker table (`childName` / `timestamp`)
- `modules/dynamodb-media`: media entries table
- `modules/dynamodb-races`: race history table
- `modules/dynamodb-training-log`: training log table
- `modules/s3-images`: S3 bucket with versioning for photos, with optional CloudFront-only read policy

### Infrastructure modules
- `modules/spa-api-serverless`: CloudFront distribution, Lambda functions, Lambda@Edge authentication, Route 53 DNS
- `modules/ecs-next` (optional): VPC, ALB (HTTPS), ECS Fargate service, IAM roles (used only for test backend validation)

## Adding a new data feature

To add a new data-backed feature (e.g. a gallery page), follow this pattern:

1. **Create a Terraform module** in `bwcom-terraform/modules/`. Use `dynamodb-media` as a template — it shows the standard pattern for a DynamoDB table with environment/version naming, outputs, and deletion protection.

2. **Wire into both data tiers** — add a `module` block to both `env/prod-data/main.tf` and `env/test-data/main.tf`. Export the table name and ARN as outputs.

3. **Add the table name to the ECS task definition** — add a new variable to `modules/ecs-next/variables.tf` and a corresponding `environment` entry in the container definition in `modules/ecs-next/main.tf`. Wire the variable in both `env/prod/main.tf` and `env/test/main.tf`.

4. **Add the API route** in `bwcom-next/app/api/<feature>/route.ts`. Export the table name from `bwcom-next/lib/dynamodb.ts`.

5. **Update local dev** — add `<TABLE>_TABLE_NAME=<table>-test-v1` to `bwcom-next/.env.local`.

6. **Update `scripts/deploy-test.sh`** — read the new table name from Terraform output and pass it as `TF_VAR_<table>_table_name` to the test infra apply.

7. **Deploy** — apply `test-data` Terraform, then verify locally with `npm run dev`. Prod picks up the change automatically via CI on push to `main`.

## Project structure

```md
bwcom-next/              # Next.js backend (optional, for admin routes)
  app/                   # App Router pages and API routes
  components/            # React components (shared with SPA)
  lib/                   # Server-side utilities
  public/                # Static assets
  types/                 # TypeScript type extensions

bwcom-spa/               # React SPA (main production frontend)
  src/
    components/          # React components
    pages/               # Page components
    lib/                 # Client-side utilities
    types/               # TypeScript types
  public/                # Static assets (favicon, etc) — copied to dist/ during build
  index.html             # Single HTML entry point

bwcom-terraform/         # Terraform infrastructure
  env/
    prod-data/           # Prod data tier (DynamoDB + images S3)
    prod-serverless/     # Prod serverless SPA (CloudFront + Lambda + Lambda@Edge)
    test-data/           # Test data tier (DynamoDB + images S3)
    test-serverless/     # Test serverless SPA
    test/                # Test ECS backend (optional, for infra testing only)
  modules/
    dynamodb-*           # DynamoDB table modules
    s3-images            # S3 images bucket module
    spa-api-serverless   # CloudFront + Lambda + Lambda@Edge module
    ecs-next             # ECS backend module (optional)

photos/                  # Source images (synced to S3)

scripts/
  deploy-serverless-spa.sh  # Deploy SPA to CloudFront/S3
  deploy-test.sh            # Deploy test ECS backend (optional)
  destroy-test.sh           # Tear down test ECS backend
  sync-images.sh            # Sync images to S3

.github/workflows/       # CI/CD pipeline
```
