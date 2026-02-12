#!/usr/bin/env bash
set -euo pipefail

# Generate thumbnails and sync photos to an S3 bucket.
# Usage: ./scripts/sync-images.sh <bucket-name>

BUCKET="$1"
PHOTOS_DIR="photos"
THUMBS_DIR="${PHOTOS_DIR}/web-content/thumbs"

echo "==> Generating thumbnails..."
mkdir -p "${THUMBS_DIR}"
npx sharp-cli -i "${PHOTOS_DIR}/web-content/*.jpg" -o "${THUMBS_DIR}" resize 800

echo "==> Syncing to s3://${BUCKET}/..."
aws s3 sync "${PHOTOS_DIR}/" "s3://${BUCKET}/" --delete

echo "==> Done."
