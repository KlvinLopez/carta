# =============================================================================
# Carta — PROD Environment
# =============================================================================

project_id  = "carta-prod-XXXXXX"  # Replace with your GCP project ID
region      = "us-central1"
environment = "prod"

# Cloud SQL — Production grade
db_tier     = "db-custom-2-7680"  # 2 vCPU, 7.5GB RAM
db_name     = "carta_db"
db_user     = "carta"
db_password = "CHANGE_ME_IN_SECRET_MANAGER"

# Cloud Run — Always on, auto-scale
cloud_run_service_name = "carta-api"
cloud_run_cpu          = "2"
cloud_run_memory       = "1Gi"
cloud_run_min_instances = 1   # Always warm
cloud_run_max_instances = 10

# Redis — High Availability
redis_tier           = "STANDARD_HA"
redis_memory_size_gb = 2

labels = {
  app         = "carta"
  environment = "prod"
  managed     = "terraform"
}
