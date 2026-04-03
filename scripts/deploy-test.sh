#!/usr/bin/env bash
set -euo pipefail

# Helper: build, push Docker to ECR and apply Terraform for test environment
# Reads secrets from bwcom-next/.env.local

REGION="us-west-2"
ACCOUNT_ID="685339315795"
ECR_REPO="bwcom-next"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
FULL_REPO="${ECR_REGISTRY}/${ECR_REPO}"
IMAGE_CDN_STACK="bwcom-images-cdn-test"

# Load secrets from .env.local
if [[ ! -f "bwcom-next/.env.local" ]]; then
  echo "Error: bwcom-next/.env.local not found" >&2
  exit 1
fi

# Source .env.local to get NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
set -a
source bwcom-next/.env.local
set +a

# Check required env vars
for var in NEXTAUTH_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  if [[ -z "${!var:-}" ]]; then
    echo "Error: $var not found in bwcom-next/.env.local" >&2
    exit 1
  fi
done

echo "Logging into ECR"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo "Deploying image CDN stack: ${IMAGE_CDN_STACK}"
aws cloudformation deploy \
  --region us-east-1 \
  --stack-name ${IMAGE_CDN_STACK} \
  --template-file cfn/bwcom-static/s3-cloudfront-stack/images-cdn.yml \
  --parameter-overrides BucketName=test.brentwoodle.com CreateDNS=false \
  --no-fail-on-empty-changeset

IMAGE_CDN_DOMAIN=$(aws cloudformation describe-stacks \
  --region us-east-1 \
  --stack-name ${IMAGE_CDN_STACK} \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
  --output text)

IMAGE_CDN_ARN=$(aws cloudformation describe-stacks \
  --region us-east-1 \
  --stack-name ${IMAGE_CDN_STACK} \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionArn'].OutputValue" \
  --output text)

if [[ -z "${IMAGE_CDN_DOMAIN}" || -z "${IMAGE_CDN_ARN}" ]]; then
  echo "Error: missing CloudFront outputs from ${IMAGE_CDN_STACK}" >&2
  exit 1
fi

echo "Building and tagging image: ${FULL_REPO}:latest"
cd bwcom-next
docker buildx create --use >/dev/null 2>&1 || true

CACHE_DIR="${HOME}/.cache/buildx/bwcom-next"
mkdir -p "${CACHE_DIR}"
docker buildx build --platform linux/arm64 \
  --build-arg NEXT_PUBLIC_IMAGES_BASE_URL=https://${IMAGE_CDN_DOMAIN} \
  -t ${FULL_REPO}:latest \
  --cache-from type=local,src=${CACHE_DIR} \
  --cache-to type=local,dest=${CACHE_DIR},mode=max \
  . --push

# Terraform apply data tier (DynamoDB tables — separate lifecycle, never destroyed)
cd ../bwcom-terraform/env/test-data

echo "Initializing Terraform (env/test-data)"
terraform init

echo "Applying Terraform (env/test-data)"
TF_VAR_images_cloudfront_distribution_arns='["'"${IMAGE_CDN_ARN}"'"]' terraform apply -auto-approve

# Sync images to test S3 bucket
cd ../..
echo "Syncing images to test S3 bucket"
./scripts/sync-images.sh test.brentwoodle.com
cd bwcom-terraform/env/test-data

MEDIA_TABLE_NAME=$(terraform output -raw media_table_name)
echo "Media table: ${MEDIA_TABLE_NAME}"

RACES_TABLE_NAME=$(terraform output -raw races_table_name)
echo "Races table: ${RACES_TABLE_NAME}"

TRAINING_LOG_TABLE_NAME=$(terraform output -raw training_log_table_name)
echo "Training log table: ${TRAINING_LOG_TABLE_NAME}"

# Terraform apply in test environment
cd ../test

export TF_VAR_nextauth_secret="$NEXTAUTH_SECRET"
export TF_VAR_google_client_id="$GOOGLE_CLIENT_ID"
export TF_VAR_google_client_secret="$GOOGLE_CLIENT_SECRET"
export TF_VAR_media_table_name="$MEDIA_TABLE_NAME"
export TF_VAR_races_table_name="$RACES_TABLE_NAME"
export TF_VAR_training_log_table_name="$TRAINING_LOG_TABLE_NAME"

echo "Initializing Terraform (env/test)"
terraform init

echo "Applying Terraform (env/test)"
terraform apply -auto-approve

echo "Done. ALB DNS (outputs will include alb_dns_name)"
terraform output -raw alb_dns_name || true
