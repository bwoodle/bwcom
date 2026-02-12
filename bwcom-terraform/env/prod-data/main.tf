terraform {
  backend "s3" {
    bucket = "bwcom-terraform-state"
    key    = "prod-data/terraform.tfstate"
    region = "us-west-2"
  }
}

module "allowance_table" {
  source = "../../modules/dynamodb-allowance"

  env           = "prod"
  table_version = "v1"
}

module "media_table" {
  source = "../../modules/dynamodb-media"

  env           = "prod"
  table_version = "v1"
}

module "races_table" {
  source = "../../modules/dynamodb-races"

  env           = "prod"
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

output "races_table_name" {
  value = module.races_table.table_name
}

output "races_table_arn" {
  value = module.races_table.table_arn
}
