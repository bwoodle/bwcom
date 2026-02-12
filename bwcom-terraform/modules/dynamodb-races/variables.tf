variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "env" {
  description = "Environment (test or prod)"
  type        = string
}

variable "table_version" {
  description = "Version suffix for the table name (e.g. v1, v2). Bump this to create a new table for schema migrations."
  type        = string
  default     = "v1"
}
