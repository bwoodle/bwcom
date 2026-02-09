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

output "allowance_table_name" {
  value = module.allowance_table.table_name
}

output "allowance_table_arn" {
  value = module.allowance_table.table_arn
}
