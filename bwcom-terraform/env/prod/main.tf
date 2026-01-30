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