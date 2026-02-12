terraform {
  backend "s3" {
    bucket = "bwcom-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-west-2"
  }
}

module "ecs_next" {
  source = "../../modules/ecs-next"

  env             = "prod"
  domain          = "brentwoodle.com"
  certificate_arn = "arn:aws:acm:us-west-2:685339315795:certificate/efe79294-4420-4646-9809-adde5cf255da"
  nextauth_secret = var.nextauth_secret
  nextauth_url    = var.nextauth_url
  google_client_id = var.google_client_id
  google_client_secret = var.google_client_secret
  ecr_repository_url = "685339315795.dkr.ecr.us-west-2.amazonaws.com/bwcom-next"
  image_tag = var.image_tag
  create_www_redirect = true
  create_woodle_org_redirect = true
  woodle_org_certificate_arn = "arn:aws:acm:us-west-2:685339315795:certificate/9c0eafa3-671f-4bd9-8f73-e053073e881b"
  allowance_table_name = var.allowance_table_name
  media_table_name     = var.media_table_name
  races_table_name     = var.races_table_name
}

variable "nextauth_secret" {
  description = "NextAuth secret for prod"
  type        = string
  sensitive   = true
}

variable "nextauth_url" {
  description = "NextAuth URL for prod"
  type        = string
  default     = "https://brentwoodle.com"
}

variable "google_client_id" {
  description = "Google OAuth Client ID for prod"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret for prod"
  type        = string
  sensitive   = true
}

variable "image_tag" {
  description = "Image tag to deploy for prod (should be provided by CI as TF_VAR_image_tag)"
  type        = string
}

variable "allowance_table_name" {
  description = "Name of the DynamoDB allowance table for prod"
  type        = string
  default     = "allowance-prod-v1"
}

variable "media_table_name" {
  description = "Name of the DynamoDB media table for prod"
  type        = string
  default     = "media-prod-v1"
}

variable "races_table_name" {
  description = "Name of the DynamoDB races table for prod"
  type        = string
  default     = "races-prod-v1"
}