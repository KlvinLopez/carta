# =============================================================================
# Carta — DEV Environment Entry Point
# =============================================================================
# Usage:
#   cd terraform/environments/dev
#   terraform init
#   terraform plan -var-file=terraform.tfvars
#   terraform apply -var-file=terraform.tfvars
# =============================================================================

module "carta" {
  source = "../../"

  project_id  = var.project_id
  region      = var.region
  environment = var.environment

  # Database
  db_tier     = var.db_tier
  db_name     = var.db_name
  db_user     = var.db_user
  db_password = var.db_password

  # Cloud Run
  cloud_run_service_name  = var.cloud_run_service_name
  cloud_run_image         = "${var.region}-docker.pkg.dev/${var.project_id}/carta-${var.environment}/carta-api:latest"
  cloud_run_cpu           = var.cloud_run_cpu
  cloud_run_memory        = var.cloud_run_memory
  cloud_run_min_instances = var.cloud_run_min_instances
  cloud_run_max_instances = var.cloud_run_max_instances

  # Redis
  redis_tier           = var.redis_tier
  redis_memory_size_gb = var.redis_memory_size_gb

  labels = var.labels
}

# Re-declare variables for this environment
variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "db_tier" { type = string }
variable "db_name" { type = string }
variable "db_user" { type = string }
variable "db_password" { type = string; sensitive = true }
variable "cloud_run_service_name" { type = string }
variable "cloud_run_cpu" { type = string }
variable "cloud_run_memory" { type = string }
variable "cloud_run_min_instances" { type = number }
variable "cloud_run_max_instances" { type = number }
variable "redis_tier" { type = string }
variable "redis_memory_size_gb" { type = number }
variable "labels" { type = map(string) }
