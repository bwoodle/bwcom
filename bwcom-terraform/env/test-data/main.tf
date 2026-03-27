terraform {
  backend "s3" {
    bucket = "bwcom-terraform-state"
    key    = "test-data/terraform.tfstate"
    region = "us-west-2"
  }
}

module "media_table" {
  source = "../../modules/dynamodb-media"

  env           = "test"
  table_version = "v1"
}

module "races_table" {
  source = "../../modules/dynamodb-races"

  env           = "test"
  table_version = "v1"
}

module "training_log_table" {
  source = "../../modules/dynamodb-training-log"

  env           = "test"
  table_version = "v1"
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

module "images_bucket" {
  source = "../../modules/s3-images"

  bucket_name = "test.brentwoodle.com"
}

output "training_log_table_name" {
  value = module.training_log_table.table_name
}

output "training_log_table_arn" {
  value = module.training_log_table.table_arn
}

output "images_bucket_name" {
  value = module.images_bucket.bucket_name
}

output "images_bucket_arn" {
  value = module.images_bucket.bucket_arn
}
