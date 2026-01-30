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

echo "Ensuring ECR repository exists: ${ECR_REPO}"
aws ecr describe-repositories --repository-names "${ECR_REPO}" --region ${REGION} >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "${ECR_REPO}" --region ${REGION} >/dev/null

echo "Building Docker image"
cd bwcom-next
npm ci
NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
NEXTAUTH_URL="https://test-next.brentwoodle.com" \
GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
npm run build

echo "Building and tagging image: ${FULL_REPO}:latest"
docker build -t bwcom-next .
docker tag bwcom-next:latest ${FULL_REPO}:latest

echo "Logging into ECR"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo "Pushing image"
docker push ${FULL_REPO}:latest

# Terraform apply in test environment
cd ../bwcom-terraform/env/test

export TF_VAR_nextauth_secret="$NEXTAUTH_SECRET"
export TF_VAR_google_client_id="$GOOGLE_CLIENT_ID"
export TF_VAR_google_client_secret="$GOOGLE_CLIENT_SECRET"

echo "Initializing Terraform (env/test)"
terraform init

echo "Applying Terraform (env/test)"
terraform apply -auto-approve

echo "Done. ALB DNS (outputs will include alb_dns_name)"
terraform output -raw alb_dns_name || true
