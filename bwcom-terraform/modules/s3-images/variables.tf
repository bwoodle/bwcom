variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for images"
  type        = string
}

variable "cloudfront_distribution_arns" {
  description = "CloudFront distribution ARNs allowed to read objects. Leave empty to keep legacy public-read behavior until cutover."
  type        = list(string)
  default     = []
}
