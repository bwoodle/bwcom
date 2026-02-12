- Keep communication concise and focused.
- Follow development best practices.
- Recommend changes in design patterns when appropriate.

## Environments

There are two environments: **test** and **prod**.

- **Prod** is deployed automatically via CI (`.github/workflows/ci.yml`) on push to `main`. It provisions both the data tier (`prod-data`) and infrastructure (`prod` — ECS, ALB, etc.).
- **Test** data (`test-data` — DynamoDB tables, S3 buckets) is always deployed and is used for local development (`npm run dev`). The test infrastructure (`test` — ECS, ALB, etc.) is **not typically deployed** to save costs. It can be stood up on-demand via `scripts/deploy-test.sh`. Make sure any edits to test-data are immediately applied via CLI or `deploy-test.sh` so local development is working with the latest data schema.

Terraform state for each environment lives in the `bwcom-terraform-state` S3 bucket, keyed by environment name.

## Images / Static Assets

Images are stored in S3. This keeps the container small and serves images directly from S3.

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
The `NEXT_PUBLIC_IMAGES_BASE_URL` environment variable provides the S3 base URL. Because bucket names contain dots, **path-style** S3 URLs are used (e.g. `https://s3.us-west-2.amazonaws.com/test.brentwoodle.com`). This avoids SSL certificate issues with virtual-hosted style URLs.

For local development, set in `bwcom-next/.env.local`:
```
NEXT_PUBLIC_IMAGES_BASE_URL=https://s3.us-west-2.amazonaws.com/test.brentwoodle.com
```

For Docker builds (test and prod), the URL is passed as a `--build-arg` since `NEXT_PUBLIC_*` vars are inlined at build time.
