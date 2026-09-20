variable "region" {
  description = "AWS region for API, Lambda, and DynamoDB"
  type        = string
  default     = "us-west-2"
}

variable "env" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Primary domain alias for the SPA CloudFront distribution"
  type        = string
}

variable "create_www_record" {
  description = "Whether to create www.<domain> Route53 alias in the same zone"
  type        = bool
  default     = false
}

variable "additional_aliases" {
  description = "Additional CloudFront aliases (for example, redirect-only domains)"
  type        = list(string)
  default     = []
}

variable "route53_zone_name" {
  description = "Route53 hosted zone name used for domain records"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN in us-east-1 for CloudFront"
  type        = string
}

variable "spa_bucket_name" {
  description = "S3 bucket for SPA artifacts"
  type        = string
}

variable "media_table_name" {
  description = "Media DynamoDB table name"
  type        = string
}

variable "races_table_name" {
  description = "Races DynamoDB table name"
  type        = string
}

variable "training_log_table_name" {
  description = "Training log DynamoDB table name"
  type        = string
}

variable "origin_secret" {
  description = "Shared secret injected by CloudFront and required by Lambda API"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID used to verify OIDC ID tokens"
  type        = string
}

variable "admin_emails" {
  description = "Admin email addresses allowed to write media/training log data"
  type        = list(string)
}

variable "cors_allow_origin" {
  description = "Allowed CORS origin for API responses"
  type        = string
}

variable "spa_cache_ttl_default" {
  description = "Default TTL for static files"
  type        = number
  default     = 86400
}
