terraform {
  backend "s3" {
    bucket = "tfstate-bucket-9999"
    key    = "cloud-cost-logger.tfstate"
    region = "ap-northeast-1"
  }
}
variable "azure_client_secret" {}

variable "azure_client_id" {}

variable "azure_subscription_id" {}

variable "azure_tenant_id" {}

variable "slack_webhook_url" {}


provider "aws" {
  region = "ap-northeast-1"
}

module "collector" {
  source = "./collector"
  azure_client_secret = var.azure_client_secret
  azure_client_id = var.azure_client_id
  azure_subscription_id = var.azure_subscription_id
  azure_tenant_id = var.azure_tenant_id
  notifier_function_arn = module.notifier.arn
}

module "logstream" {
  source = "./logstream"
  notifier_function_arn = module.notifier.arn
}

module "notifier" {
  source = "./notifier"
  slack_webhook_url = var.slack_webhook_url
  collector_state_machine_arn = module.collector.collector_state_machine_arn
  logstream_state_machine_arn = module.logstream.logstream_state_machine_arn
}