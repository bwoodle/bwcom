terraform {
  backend "s3" {
    bucket = "bwcom-terraform-state"
    key    = "test-data/terraform.tfstate"
    region = "us-west-2"
  }
}

module "allowance_table" {
  source = "../../modules/dynamodb-allowance"

  env           = "test"
  table_version = "v1"
}

module "media_table" {
  source = "../../modules/dynamodb-media"

  env           = "test"
  table_version = "v1"
}

output "allowance_table_name" {
  value = module.allowance_table.table_name
}

output "allowance_table_arn" {
  value = module.allowance_table.table_arn
}

output "media_table_name" {
  value = module.media_table.table_name
}

output "media_table_arn" {
  value = module.media_table.table_arn
}
