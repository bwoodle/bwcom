#!/usr/bin/env bash
set -euo pipefail

# Helper: destroy Terraform-managed test environment
# Reads secrets from bwcom-next/.env.local

REGION="us-west-2"

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

# Terraform destroy in test environment (ECS/ALB only — data tier is NOT destroyed)
cd bwcom-terraform/env/test

export TF_VAR_nextauth_secret="$NEXTAUTH_SECRET"
export TF_VAR_google_client_id="$GOOGLE_CLIENT_ID"
export TF_VAR_google_client_secret="$GOOGLE_CLIENT_SECRET"
export TF_VAR_allowance_table_name="unused"

echo "Initializing Terraform (env/test)"
terraform init

echo "Destroying Terraform (env/test)"
terraform destroy -auto-approve

echo "Done."