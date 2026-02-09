output "table_name" {
  description = "Name of the allowance DynamoDB table"
  value       = aws_dynamodb_table.allowance.name
}

output "table_arn" {
  description = "ARN of the allowance DynamoDB table"
  value       = aws_dynamodb_table.allowance.arn
}
