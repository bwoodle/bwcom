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

resource "aws_dynamodb_table" "allowance" {
  name         = "allowance-${var.env}-${var.table_version}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "childName"
  range_key = "timestamp"

  attribute {
    name = "childName"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  deletion_protection_enabled = true

  tags = {
    Environment = var.env
    Version     = var.table_version
    ManagedBy   = "terraform"
  }
}
