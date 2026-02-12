output "table_name" {
  description = "Name of the training log DynamoDB table"
  value       = aws_dynamodb_table.training_log.name
}

output "table_arn" {
  description = "ARN of the training log DynamoDB table"
  value       = aws_dynamodb_table.training_log.arn
}
