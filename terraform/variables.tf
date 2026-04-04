# =============================================================================
# Carta — Terraform Variables
# =============================================================================

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# -----------------------------------------------------------------------------
# Cloud SQL (PostgreSQL)
# -----------------------------------------------------------------------------

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro" # Cheapest for dev, use db-custom-2-7680 for prod
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "carta_db"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "carta"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

# -----------------------------------------------------------------------------
# Cloud Run
# -----------------------------------------------------------------------------

variable "cloud_run_service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "carta-api"
}

variable "cloud_run_image" {
  description = "Docker image for Cloud Run"
  type        = string
  default     = "gcr.io/PROJECT_ID/carta-api:latest"
}

variable "cloud_run_cpu" {
  description = "CPU allocation for Cloud Run"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run"
  type        = string
  default     = "512Mi"
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0 # Scale to zero for dev
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 3
}

# -----------------------------------------------------------------------------
# Redis (Memorystore)
# -----------------------------------------------------------------------------

variable "redis_tier" {
  description = "Memorystore Redis tier (BASIC or STANDARD_HA)"
  type        = string
  default     = "BASIC" # STANDARD_HA for prod
}

variable "redis_memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "REDIS_7_0"
}

# -----------------------------------------------------------------------------
# Networking
# -----------------------------------------------------------------------------

variable "vpc_name" {
  description = "VPC network name"
  type        = string
  default     = "carta-vpc"
}

# -----------------------------------------------------------------------------
# Domain & SSL
# -----------------------------------------------------------------------------

variable "domain" {
  description = "Custom domain for the API (optional)"
  type        = string
  default     = ""
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default = {
    app     = "carta"
    managed = "terraform"
  }
}
