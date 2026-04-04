# =============================================================================
# Carta — DEV Environment
# =============================================================================

project_id  = "carta-dev-XXXXXX"  # Replace with your GCP project ID
region      = "us-central1"
environment = "dev"

# Cloud SQL — Minimal for dev
db_tier     = "db-f1-micro"
db_name     = "carta_db"
db_user     = "carta"
db_password = "CHANGE_ME_IN_SECRET_MANAGER"

# Cloud Run — Scale to zero
cloud_run_service_name = "carta-api"
cloud_run_cpu          = "1"
cloud_run_memory       = "512Mi"
cloud_run_min_instances = 0
cloud_run_max_instances = 2

# Redis — Basic tier
redis_tier           = "BASIC"
redis_memory_size_gb = 1

labels = {
  app         = "carta"
  environment = "dev"
  managed     = "terraform"
}
