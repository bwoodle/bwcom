output "bucket_name" {
  description = "Name of the images S3 bucket"
  value       = aws_s3_bucket.images.bucket
}

output "bucket_arn" {
  description = "ARN of the images S3 bucket"
  value       = aws_s3_bucket.images.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the images S3 bucket"
  value       = aws_s3_bucket.images.bucket_regional_domain_name
}
