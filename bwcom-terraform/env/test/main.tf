terraform {
  backend "s3" {
    bucket = "bwcom-terraform-state"
    key    = "test/terraform.tfstate"
    region = "us-west-2"
  }
}

module "ecs_next" {
  source = "../../modules/ecs-next"

  env             = "test"
  domain          = "test-next.brentwoodle.com"
  certificate_arn = "arn:aws:acm:us-west-2:685339315795:certificate/efe79294-4420-4646-9809-adde5cf255da"
  nextauth_secret = var.nextauth_secret
  nextauth_url    = var.nextauth_url
  google_client_id = var.google_client_id
  google_client_secret = var.google_client_secret
  ecr_repository_url = "685339315795.dkr.ecr.us-west-2.amazonaws.com/bwcom-next"
  allowance_table_name = var.allowance_table_name
  media_table_name     = var.media_table_name
}

variable "nextauth_secret" {
  description = "NextAuth secret for test"
  type        = string
  sensitive   = true
}

variable "nextauth_url" {
  description = "NextAuth URL for test"
  type        = string
  default     = "https://test-next.brentwoodle.com"
}

variable "google_client_id" {
  description = "Google OAuth Client ID for test"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret for test"
  type        = string
  sensitive   = true
}

# test will use module default image_tag ("latest") unless overridden

variable "allowance_table_name" {
  description = "Name of the DynamoDB allowance table for test"
  type        = string
  default     = "allowance-test-v1"
}

variable "media_table_name" {
  description = "Name of the DynamoDB media table for test"
  type        = string
  default     = "media-test-v1"
}