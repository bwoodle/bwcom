# brentwoodle.com

Personal website built as a serverless React SPA with CloudFront + S3 hosting and Lambda@Edge for auth and API.

## Architecture overview

```md
┌───────────────────────────────────────────────────────────────┐
│  Route 53 (brentwoodle.com, woodle.org)                       │
│         ▼                                                     │
│  CloudFront (HTTPS, HTTP→HTTPS, SPA fallback)                 │
│    ├─ Origin: S3 (bwcom-spa-prod-site) → public React SPA     │
│    └─ Origin: Lambda (API) → authenticated endpoints         │
│         ▼                                                     │
│      S3 bucket    Lambda@Edge (auth)                           │
│   (SPA + assets)       ▼                                      │
│                  DynamoDB tables                              │
│              (allowance, media, races, training-log)          │
└───────────────────────────────────────────────────────────────┘
```

## Local development

### Prerequisites

- Node.js 22+
- Python 3.12+
- AWS CLI configured for `us-west-2`
- Terraform
- `just`

### Worktree-first workflow

Use a worktree for each task instead of editing the main checkout:

```bash
cd /home/brent/code/bwcom
git gtr trust
git gtr new feat/my-change --from-current
cd "$(git gtr go feat/my-change)"
```

### Setup

1. Deploy the test image CDN stack:

```bash
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name bwcom-images-cdn-test \
  --template-file cfn/bwcom-static/s3-cloudfront-stack/images-cdn.yml \
  --parameter-overrides BucketName=test.brentwoodle.com CreateDNS=false \
  --no-fail-on-empty-changeset
```

2. Read the CloudFront outputs and deploy the test-data tier:

```bash
IMAGE_CDN_DOMAIN=$(aws cloudformation describe-stacks \
  --region us-east-1 --stack-name bwcom-images-cdn-test \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" --output text)

cd bwcom-terraform/env/test-data
terraform init
TF_VAR_images_cloudfront_distribution_arns='["https://${IMAGE_CDN_DOMAIN}"]' terraform apply
```

3. Sync images to the test bucket:

```bash
./scripts/sync-images.sh test.brentwoodle.com
```

4. Create `bwcom-spa/.env.local` with local-only values:

```env
VITE_IMAGES_BASE_URL=https://<IMAGE_CDN_DOMAIN>
VITE_GOOGLE_CLIENT_ID=<your-client-id>
VITE_APP_VERSION=local
```

5. Install dependencies and start Vite:

```bash
cd bwcom-spa
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### Scripts and quality checks

```bash
just bootstrap
just lint
just test
cd bwcom-spa && npm run build
```

The repo uses a single SPA build for prod and test deployments.

### Photo albums

Source images live in `photos/albums/YYYY-MM/` and the sync script generates matching thumbnails automatically.

```bash
./scripts/sync-images.sh brentwoodle.com
```

### Deploying the SPA

```bash
./scripts/deploy-serverless-spa.sh test
./scripts/deploy-serverless-spa.sh prod
```

The same script is used for the GitHub Actions deploy workflow on pushes to `main`.
