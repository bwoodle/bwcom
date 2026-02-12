variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "env" {
  description = "Environment (test or prod)"
  type        = string
}

variable "domain" {
  description = "Domain for the app"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN (must already exist in the region)"
  type        = string
}

variable "nextauth_secret" {
  description = "NextAuth secret"
  type        = string
  sensitive   = true
}

variable "nextauth_url" {
  description = "NextAuth URL"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "image_tag" {
  description = "Image tag to deploy (defaults to 'latest')"
  type        = string
  default     = "latest"
}

variable "ecr_repository_url" {
  description = "Full ECR repository URL (including registry and repo name)"
  type        = string
}

variable "create_www_redirect" {
  description = "If true, create a www.<domain> Route53 record and ALB listener rules to redirect to the apex domain"
  type        = bool
  default     = false
}

variable "create_woodle_org_redirect" {
  description = "If true, create woodle.org and www.woodle.org Route53 records and ALB listener rules to redirect to brentwoodle.com (prod only)"
  type        = bool
  default     = false
}

variable "woodle_org_certificate_arn" {
  description = "ACM certificate ARN covering woodle.org and www.woodle.org (required when create_woodle_org_redirect is true)"
  type        = string
  default     = ""
}

variable "allowance_table_name" {
  description = "Name of the DynamoDB allowance table (passed as ALLOWANCE_TABLE_NAME env var to the container)"
  type        = string
}

variable "media_table_name" {
  description = "Name of the DynamoDB media table (passed as MEDIA_TABLE_NAME env var to the container)"
  type        = string
}

variable "races_table_name" {
  description = "Name of the DynamoDB races table (passed as RACES_TABLE_NAME env var to the container)"
  type        = string
}

variable "training_log_table_name" {
  description = "Name of the DynamoDB training log table (passed as TRAINING_LOG_TABLE_NAME env var to the container)"
  type        = string
}