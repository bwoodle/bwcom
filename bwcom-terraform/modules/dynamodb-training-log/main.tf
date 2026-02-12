terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_dynamodb_table" "training_log" {
  name         = "training-log-${var.env}-${var.table_version}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "logId"
  range_key = "sk"

  attribute {
    name = "logId"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  deletion_protection_enabled = true

  tags = {
    Environment = var.env
    Version     = var.table_version
    ManagedBy   = "terraform"
  }
}
