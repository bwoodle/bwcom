<!-- Root-level Copilot instructions for the bwcom monorepo -->

## Repository Structure

This is a monorepo with the following top-level directories:

- `bwcom-next/` — Next.js 15 application (App Router, Tailwind CSS, DynamoDB)
- `bwcom-terraform/` — Terraform infrastructure (modules, env tiers)
- `photos/` — Source images (synced to S3)
- `cfn/` — CloudFormation templates (image CDN stacks)
- `scripts/` — Deploy, destroy, and image sync scripts

## Development Workflow: Refine → Plan → Execute

This repository defines three custom agents (in `.github/agents/`) that form a structured development workflow. Context flows through GitHub issues on `bwoodle/bwcom`.

| Step | Agent | Purpose | Invocation |
|------|-------|---------|------------|
| 1 | **refine** | Define WHAT to build | `Use the refine agent for #N` or `Use the refine agent` |
| 2 | **plan** | Define HOW to build it | `Use the plan agent for #N` |
| 3 | **execute** | BUILD it with TDD | `Use the execute agent for #N` |

Each agent reads from and writes to the GitHub issue, so context accumulates:
- **Refine** writes a `## Refined Criteria` section
- **Plan** reads Refined Criteria, writes a `## Technical Plan` section
- **Execute** reads both sections, implements with test-driven development

### Architecture Principles

The execute agent (and plan agent) follow these principles:
- Dependency injection over direct imports for service dependencies
- Loose coupling — modules depend on abstractions, not concretions
- Modularity — small, focused, composable units
- Testability — every module independently testable; mock via DI
- TDD — tests first, implementation second, refactor third

## Local Development

### Starting the Dev Server

```bash
cd bwcom-next
npm install    # if node_modules is stale
npm run dev    # starts on http://localhost:3000
```

The dev server reads from **test** DynamoDB tables and serves images via the **test** CloudFront CDN. It requires `bwcom-next/.env.local` to be configured (see below).

### Required Environment Variables (`bwcom-next/.env.local`)

```env
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
MEDIA_TABLE_NAME=media-test-v1
RACES_TABLE_NAME=races-test-v1
TRAINING_LOG_TABLE_NAME=training-log-test-v1
NEXT_PUBLIC_IMAGES_BASE_URL=https://d1645k04l4065v.cloudfront.net
```

> **Important**: `.env.local` is gitignored. `NEXT_PUBLIC_*` vars are inlined at build time — restart the dev server after changing them.

### Verifying the Dev Server

After starting `npm run dev`, verify with curl:

```bash
# Public pages (expect 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/about-me
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/race-history
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/training-log

# Auth-protected pages (expect 307 redirect)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/media
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin

# API routes (expect 200 with JSON)
curl -s http://localhost:3000/api/races | head -c 200
curl -s http://localhost:3000/api/media | head -c 200
```

## Updating the Test Data Layer

When adding new DynamoDB tables or modifying table schemas:

### 1. Create/Modify the Terraform Module

```bash
# Modules live in bwcom-terraform/modules/
# Use dynamodb-media as a template for new tables
ls bwcom-terraform/modules/
```

### 2. Wire into Test Data Tier

Edit `bwcom-terraform/env/test-data/main.tf` to add the module block and outputs.

### 3. Apply Test Data Changes

```bash
cd bwcom-terraform/env/test-data
terraform init
terraform apply
```

This creates/updates the DynamoDB tables and S3 bucket used by local dev.

### 4. Update `.env.local`

Add the new table name environment variable:
```bash
echo 'NEW_TABLE_NAME=new-table-test-v1' >> bwcom-next/.env.local
```

### 5. Wire into Prod Data Tier

Edit `bwcom-terraform/env/prod-data/main.tf` with matching module block and outputs. Prod is applied automatically by CI on push to `main`.

### 6. Update Deploy Script

If the test ECS environment needs the new table name, update `scripts/deploy-test.sh` to read from Terraform output and export as `TF_VAR_`.

## Build, Lint, and Test

```bash
cd bwcom-next
npm run build    # Next.js production build
npm run lint     # ESLint
# No test runner is currently configured — the execute agent should set up
# a test framework (e.g., vitest) when first implementing TDD for an issue
```

## Deploying the Test Environment

The full test ECS environment is **not** deployed for normal day-to-day development. In most cases, use the local dev server (`bwcom-next`) against the test data tier.

Deploy test ECS only when validating infrastructure or deployment changes end-to-end:

```bash
# From repo root
./scripts/deploy-test.sh    # Builds, pushes Docker, applies Terraform, stands up ECS
# Test URL: https://test-next.brentwoodle.com

./scripts/destroy-test.sh   # Tears down infra (preserves data tier) to save costs
```

## Git / CI

- Push to `main` triggers CI which deploys to prod — never push without local verification
- If `git push` fails with credential errors: `gh auth setup-git`
- Monitor CI: `gh run list --limit 1` and `gh run watch <run-id>`
