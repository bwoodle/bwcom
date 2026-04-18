- Keep communication concise and focused.
- Follow development best practices.
- Recommend changes in design patterns when appropriate.

## Development Workflow: Refine → Plan → Execute

This repository uses three custom agents that form a structured development workflow. Context is passed between agents via GitHub issues on the `bwoodle/bwcom` repository.

### How It Works

1. **Refine** (`refine` agent) — Defines **WHAT** to build. Explores the codebase, asks the user clarifying questions, and writes a "Refined Criteria" section to a GitHub issue.
2. **Plan** (`plan` agent) — Defines **HOW** to build it. Reads the Refined Criteria, performs deep codebase analysis, and writes a "Technical Plan" section to the same GitHub issue.
3. **Execute** (`execute` agent) — **BUILDS** it using TDD. Reads both sections, writes tests first, then implementation, validates with tests/lint/build.

### Invoking the Agents

Use the `/agent` slash command to select an agent, or reference it in a prompt:

```
Use the refine agent for #42        # Refine an existing issue
Use the refine agent                 # Create a new issue and refine it
Use the plan agent for #42           # Create a technical plan
Use the execute agent for #42        # Implement with TDD
```

Or launch directly from the command line:
```bash
copilot --agent=refine --prompt "Refine #42"
copilot --agent=plan --prompt "Plan #42"
copilot --agent=execute --prompt "Execute #42"
```

### GitHub Issue Structure

After all three agents have run, the issue will contain:

```
[Original description]

## Refined Criteria
[Requirements, user stories, acceptance criteria — written by refine agent]

## Technical Plan
[Architecture changes, implementation steps, testing strategy — written by plan agent]
```

### Architecture Principles (Execute Agent)

The execute agent follows these principles and may refactor existing code to align:

- **Dependency injection** over direct imports for service dependencies
- **Loose coupling** — modules depend on abstractions, not concrete implementations
- **Modularity** — small, focused, composable units with single responsibilities
- **Testability** — every module independently testable; mock boundaries via DI
- **TDD** — tests first, implementation second, refactor third

## Environments

There are two environments: **test** and **prod**.

- **Prod** is deployed automatically via CI (`.github/workflows/ci.yml`) on push to `main`. It provisions both the data tier (`prod-data`) and infrastructure (`prod` — ECS, ALB, etc.).
- **Test** data (`test-data` — DynamoDB tables, S3 buckets) is always deployed and is used for local development (`npm run dev`). The test infrastructure (`test` — ECS, ALB, etc.) is **not typically deployed** to save costs. It can be stood up on-demand via `scripts/deploy-test.sh`. Make sure any edits to test-data are immediately applied via CLI or `deploy-test.sh` so local development is working with the latest data schema.

Terraform state for each environment lives in the `bwcom-terraform-state` S3 bucket, keyed by environment name.

## Local Dev Verification

When verifying the local dev server (`npm run dev` on port 3000), check the following:

1. **All public pages return 200**: `/`, `/about-me`, `/race-history`, `/training-log`
2. **Auth-protected pages redirect**: `/media` and `/admin` return 307 (redirect to `/`) for unauthenticated users — this is correct behavior via `middleware.ts`
3. **API routes return data**: `GET /api/media`, `GET /api/races`, `GET /api/training-log?sectionId=<valid-id>`
4. **Image proxy works**: `GET /_next/image?url=<encoded-cloudfront-url>&w=640&q=75` should return 200
5. **CloudFront URLs resolve**: Direct `curl` to the CloudFront domain should return 200; direct S3 access should return 403

### Common .env.local pitfalls

- **`NEXT_PUBLIC_*` vars are inlined at build time** — after changing any `NEXT_PUBLIC_*` value, the dev server must be fully restarted (not just hot-reloaded).
- **Ensure the file ends with a newline** — appending lines without a trailing newline corrupts the next appended line (e.g. `...cloudfront.netNEW_VAR=value`). Always verify with `cat -A bwcom-next/.env.local` (lines should end with `$`).
- The `.env.local` file is gitignored. It must be created manually for local dev. See the root `README.md` for the full template.

## Images / Static Assets

Images are stored in S3 and served via CloudFront image distributions. This keeps the container small while avoiding direct public S3 serving.

### Bucket names
| Environment | Bucket |
|---|---|
| Test | `test.brentwoodle.com` |
| Prod | `brentwoodle.com` |

### Folder structure
Each bucket has a `web-content/` prefix containing full-size images and a `web-content/thumbs/` prefix containing 800px-wide thumbnails.

### How images are managed
- Source images live in the repo under `photos/web-content/`.
- Thumbnails are generated and all images are synced to S3 via `scripts/sync-images.sh <bucket-name>`.
- Convenience npm scripts: `npm run sync-images:test` and `npm run sync-images:prod`.
- The CI pipeline syncs to the prod bucket after applying `prod-data` Terraform.
- `deploy-test.sh` syncs to the test bucket after applying `test-data` Terraform.

### How images are referenced in Next.js
The `NEXT_PUBLIC_IMAGES_BASE_URL` environment variable provides the CloudFront base URL (for example, `https://<distribution>.cloudfront.net`). Both test and prod S3 buckets are restricted to CloudFront-only access.

For local development, set in `bwcom-next/.env.local` using the test CDN domain (see root README setup steps):
```
NEXT_PUBLIC_IMAGES_BASE_URL=https://<test-cloudfront-domain>.cloudfront.net
```

For Docker builds (test and prod), the URL is passed as a `--build-arg` since `NEXT_PUBLIC_*` vars are inlined at build time.

## Git / CI Operations

- **Git push**: If `git push` hangs or fails with a credential error, run `gh auth setup-git` to configure the Git credential helper. The GitHub CLI lives at `$HOME/.local/bin/gh` and may need `PATH` exported.
- **CI pipeline**: After pushing to `main`, CI runs automatically. Monitor via `gh run list --limit 1` and `gh run watch <run-id>`.
- **Never push to main without verifying locally first** — CI deploys to prod on every push.

## AWS Details

- **Account**: `685339315795`, primary region `us-west-2`, CloudFront stacks in `us-east-1`
- **Test CloudFront domain**: `d1645k04l4065v.cloudfront.net` (distribution `E1XUR4TCELH7XY`)
- **Prod CloudFront domain**: `d2fjzqbizxcvgu.cloudfront.net` (distribution `E3JJYF8AALGS5`)
- **ECR**: `685339315795.dkr.ecr.us-west-2.amazonaws.com/bwcom-next`
- **DynamoDB test tables**: `media-test-v1`, `races-test-v1`, `training-log-test-v1`
- **DynamoDB prod tables**: `media-v1`, `races-v1`, `training-log-v1`

## Build, Lint, and Test

```bash
cd bwcom-next
npm run build    # Next.js production build
npm run lint     # ESLint
# No test runner is currently configured — the execute agent should set up
# a test framework (e.g., vitest) when first implementing TDD for an issue
```

## Updating the Test Data Layer

When adding or modifying DynamoDB tables for a new feature:

1. Create/modify Terraform module in `bwcom-terraform/modules/`
2. Wire into `bwcom-terraform/env/test-data/main.tf` and `env/prod-data/main.tf`
3. Apply test data: `cd bwcom-terraform/env/test-data && terraform init && terraform apply`
4. Add table name to `bwcom-next/.env.local` (e.g., `NEW_TABLE_NAME=new-table-test-v1`)
5. Update `scripts/deploy-test.sh` to wire new table name for ECS
6. Restart dev server after `.env.local` changes

## Next.js Configuration Notes

- `next.config.ts` allows remote image patterns for `**.cloudfront.net` and `s3.us-west-2.amazonaws.com`. If a new image domain is added, it must be registered in `remotePatterns`.
- Auth middleware (`middleware.ts`) protects `/admin/*` and `/media/*` routes — only users with `role: 'admin'` can access them. Unauthenticated requests are redirected to `/`.
- The app uses `output: 'standalone'` for Docker deployment.
