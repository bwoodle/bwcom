output "table_name" {
  description = "Name of the races DynamoDB table"
  value       = aws_dynamodb_table.races.name
}

output "table_arn" {
  description = "ARN of the races DynamoDB table"
  value       = aws_dynamodb_table.races.arn
}
