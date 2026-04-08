- Keep communication concise and focused.
- Follow development best practices.
- Recommend changes in design patterns when appropriate.

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

## Next.js Configuration Notes

- `next.config.ts` allows remote image patterns for `**.cloudfront.net` and `s3.us-west-2.amazonaws.com`. If a new image domain is added, it must be registered in `remotePatterns`.
- Auth middleware (`middleware.ts`) protects `/admin/*` and `/media/*` routes — only users with `role: 'admin'` can access them. Unauthenticated requests are redirected to `/`.
- The app uses `output: 'standalone'` for Docker deployment.
