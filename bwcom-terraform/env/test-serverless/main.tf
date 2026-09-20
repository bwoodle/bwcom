terraform {
  backend "s3" {
    bucket = "bwcom-terraform-state"
    key    = "test-serverless/terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" {
  region = "us-west-2"
}

provider "aws" {
  alias  = "use1"
  region = "us-east-1"
}

data "aws_route53_zone" "root" {
  name = "brentwoodle.com"
}

resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.use1
  domain_name       = "brentwoodle.com"
  validation_method = "DNS"
  subject_alternative_names = [
    "*.brentwoodle.com",
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cloudfront_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  zone_id         = data.aws_route53_zone.root.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
}

resource "aws_acm_certificate_validation" "cloudfront" {
  provider                = aws.use1
  certificate_arn         = aws_acm_certificate.cloudfront.arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_validation : record.fqdn]
}

data "terraform_remote_state" "data" {
  backend = "s3"

  config = {
    bucket = "bwcom-terraform-state"
    key    = "test-data/terraform.tfstate"
    region = "us-west-2"
  }
}

module "spa_api_serverless" {
  source = "../../modules/spa-api-serverless"

  env                     = "test"
  domain_name             = "test-next.brentwoodle.com"
  route53_zone_name       = "brentwoodle.com"
  create_www_record       = false
  certificate_arn         = aws_acm_certificate_validation.cloudfront.certificate_arn
  spa_bucket_name         = "bwcom-spa-test-site"
  media_table_name        = data.terraform_remote_state.data.outputs.media_table_name
  races_table_name        = data.terraform_remote_state.data.outputs.races_table_name
  training_log_table_name = data.terraform_remote_state.data.outputs.training_log_table_name
  origin_secret           = var.origin_secret
  google_client_id        = var.google_client_id
  admin_emails            = var.admin_emails
  cors_allow_origin       = "https://test-next.brentwoodle.com"
}

variable "origin_secret" {
  description = "Shared secret for CloudFront -> API origin"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID used by SPA and Lambda auth verification"
  type        = string
}

variable "admin_emails" {
  description = "Email addresses that should be allowed admin write access"
  type        = list(string)
  default     = ["bwoodle@gmail.com", "nhughes137@gmail.com"]
}

output "site_url" {
  value = module.spa_api_serverless.site_url
}

output "spa_bucket_name" {
  value = module.spa_api_serverless.spa_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.spa_api_serverless.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  value = module.spa_api_serverless.cloudfront_domain_name
}

output "api_gateway_url" {
  value = module.spa_api_serverless.api_gateway_url
}
