#!/usr/bin/env bash
set -euo pipefail

# Generate thumbnails and sync photos to an S3 bucket.
# Usage: ./scripts/sync-images.sh <bucket-name>

BUCKET="$1"
PHOTOS_DIR="photos"

generate_thumbs() {
  local source_dir="$1"
  local thumbs_dir="${source_dir}/thumbs"

  if [ ! -d "${source_dir}" ]; then
    return 0
  fi

  rm -rf "${thumbs_dir}"
  mkdir -p "${thumbs_dir}"

  local jpgs=()
  while IFS= read -r file; do
    jpgs+=("${file}")
  done < <(find "${source_dir}" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) ! -name '*Zone.Identifier*' -print | sort)

  if [ "${#jpgs[@]}" -eq 0 ]; then
    echo "==> No image files found in ${source_dir}; skipping thumbnail generation"
    return 0
  fi

  echo "==> Generating thumbnails for ${source_dir}"
  npx sharp-cli -i "${source_dir}/*.{jpg,jpeg,png,webp}" -o "${thumbs_dir}" resize 800
}

echo "==> Cleaning Windows metadata junk files..."
find "${PHOTOS_DIR}" -type f -name '*:Zone.Identifier' -delete

echo "==> Regenerating SPA photo album manifest..."
python3 scripts/generate-photo-albums-manifest.py

echo "==> Generating thumbnails..."
generate_thumbs "${PHOTOS_DIR}/web-content"

if [ -d "${PHOTOS_DIR}/albums" ]; then
  while IFS= read -r -d '' month_dir; do
    generate_thumbs "${month_dir}"
  done < <(find "${PHOTOS_DIR}/albums" -mindepth 1 -maxdepth 1 -type d -print0)
fi

echo "==> Syncing to s3://${BUCKET}/..."
aws s3 sync "${PHOTOS_DIR}/" "s3://${BUCKET}/" \
	--delete \
	--cache-control "public,max-age=31536000,immutable" \
	--exclude "*:Zone.Identifier"

echo "==> Done."
