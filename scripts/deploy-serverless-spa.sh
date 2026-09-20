#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <test|prod>"
  echo "Required environment variables: ORIGIN_SECRET, GOOGLE_CLIENT_ID, IMAGES_BASE_URL"
  echo "Optional: ADMIN_EMAILS_CSV (default: bwoodle@gmail.com,nhughes137@gmail.com)"
  exit 1
fi

ENV_NAME="$1"
if [[ "$ENV_NAME" != "test" && "$ENV_NAME" != "prod" ]]; then
  echo "ENV_NAME must be test or prod"
  exit 1
fi

: "${ORIGIN_SECRET:?ORIGIN_SECRET is required}"
: "${GOOGLE_CLIENT_ID:?GOOGLE_CLIENT_ID is required}"
: "${IMAGES_BASE_URL:?IMAGES_BASE_URL is required}"

ADMIN_EMAILS_CSV="${ADMIN_EMAILS_CSV:-bwoodle@gmail.com,nhughes137@gmail.com}"
IFS=',' read -r -a ADMIN_EMAILS_ARRAY <<< "$ADMIN_EMAILS_CSV"
ADMIN_EMAILS_TF="["
for email in "${ADMIN_EMAILS_ARRAY[@]}"; do
  trimmed="$(echo "$email" | xargs)"
  if [[ -n "$trimmed" ]]; then
    if [[ "$ADMIN_EMAILS_TF" != "[" ]]; then
      ADMIN_EMAILS_TF+=","
    fi
    ADMIN_EMAILS_TF+="\"$trimmed\""
  fi
done
ADMIN_EMAILS_TF+="]"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TF_ENV_DIR="$ROOT_DIR/bwcom-terraform/env/${ENV_NAME}-serverless"
SPA_DIR="$ROOT_DIR/bwcom-spa"

cd "$TF_ENV_DIR"
terraform init
terraform apply -auto-approve \
  -var "origin_secret=$ORIGIN_SECRET" \
  -var "google_client_id=$GOOGLE_CLIENT_ID" \
  -var "admin_emails=$ADMIN_EMAILS_TF"

SPA_BUCKET_NAME="$(terraform output -raw spa_bucket_name)"
DISTRIBUTION_ID="$(terraform output -raw cloudfront_distribution_id)"
SITE_URL="$(terraform output -raw site_url)"

cd "$SPA_DIR"
npm install
VITE_IMAGES_BASE_URL="$IMAGES_BASE_URL" \
VITE_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
VITE_APP_VERSION="$(git -C "$ROOT_DIR" rev-parse --short HEAD)" \
npm run build

aws s3 sync dist/ "s3://${SPA_BUCKET_NAME}/" --delete
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" >/dev/null

echo "Deployment complete for ${ENV_NAME}: ${SITE_URL}"
