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

resource "aws_dynamodb_table" "media" {
  name         = "media-${var.env}-${var.table_version}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "monthKey"
  range_key = "sk"

  attribute {
    name = "monthKey"
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
