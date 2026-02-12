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

resource "aws_dynamodb_table" "races" {
  name         = "races-${var.env}-${var.table_version}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "yearKey"
  range_key = "sk"

  attribute {
    name = "yearKey"
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
