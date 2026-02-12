output "table_name" {
  description = "Name of the media DynamoDB table"
  value       = aws_dynamodb_table.media.name
}

output "table_arn" {
  description = "ARN of the media DynamoDB table"
  value       = aws_dynamodb_table.media.arn
}
