#!/usr/bin/env bash
set -euo pipefail

# Helper: build, push Docker to ECR and apply Terraform for test environment
# Reads secrets from bwcom-next/.env.local

REGION="us-west-2"
ACCOUNT_ID="685339315795"
ECR_REPO="bwcom-next"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
FULL_REPO="${ECR_REGISTRY}/${ECR_REPO}"

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

echo "Building and tagging image: ${FULL_REPO}:latest"
cd bwcom-next
docker buildx create --use >/dev/null 2>&1 || true

CACHE_DIR="${HOME}/.cache/buildx/bwcom-next"
mkdir -p "${CACHE_DIR}"
docker buildx build --platform linux/arm64 \
  -t ${FULL_REPO}:latest \
  --cache-from type=local,src=${CACHE_DIR} \
  --cache-to type=local,dest=${CACHE_DIR},mode=max \
  . --push

# Terraform apply data tier (DynamoDB tables — separate lifecycle, never destroyed)
cd ../bwcom-terraform/env/test-data

echo "Initializing Terraform (env/test-data)"
terraform init

echo "Applying Terraform (env/test-data)"
terraform apply -auto-approve

# Capture the table name from the data tier output
ALLOWANCE_TABLE_NAME=$(terraform output -raw allowance_table_name)
echo "Allowance table: ${ALLOWANCE_TABLE_NAME}"

# Terraform apply in test environment
cd ../test

export TF_VAR_nextauth_secret="$NEXTAUTH_SECRET"
export TF_VAR_google_client_id="$GOOGLE_CLIENT_ID"
export TF_VAR_google_client_secret="$GOOGLE_CLIENT_SECRET"
export TF_VAR_allowance_table_name="$ALLOWANCE_TABLE_NAME"

echo "Initializing Terraform (env/test)"
terraform init

echo "Applying Terraform (env/test)"
terraform apply -auto-approve

echo "Done. ALB DNS (outputs will include alb_dns_name)"
terraform output -raw alb_dns_name || true
