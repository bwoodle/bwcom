output "spa_bucket_name" {
  value = aws_s3_bucket.spa.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.spa.id
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.spa.domain_name
}

output "api_gateway_url" {
  value = aws_apigatewayv2_stage.this.invoke_url
}

output "site_url" {
  value = "https://${var.domain_name}"
}
