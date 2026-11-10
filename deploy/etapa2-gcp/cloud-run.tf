# =============================================================================
# Carta — Cloud Run Configuration
# =============================================================================

# Service Account for Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "carta-api-${var.environment}"
  display_name = "Carta API Service Account (${var.environment})"
}

# Grant Cloud Run SA access to Cloud SQL
resource "google_project_iam_member" "cloud_run_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Grant Cloud Run SA access to Secret Manager
resource "google_project_iam_member" "cloud_run_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "carta_api" {
  name     = "${var.cloud_run_service_name}-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    containers {
      image = var.cloud_run_image

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      # Environment variables
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql+asyncpg://${var.db_user}:${var.db_password}@${google_sql_database_instance.carta.private_ip_address}:5432/${var.db_name}"
      }

      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.carta.host}:${google_redis_instance.carta.port}"
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.app_secret_key.secret_id
            version = "latest"
          }
        }
      }

      # Health check
      startup_probe {
        http_get {
          path = "/api/v1/health"
          port = 8000
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/api/v1/health"
          port = 8000
        }
        period_seconds    = 30
        failure_threshold = 3
      }

      ports {
        container_port = 8000
      }
    }
  }

  labels = var.labels

  depends_on = [
    google_project_service.apis,
    google_sql_database_instance.carta,
    google_redis_instance.carta,
  ]
}

# Allow unauthenticated access (public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.carta_api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# App Secret Key in Secret Manager
resource "google_secret_manager_secret" "app_secret_key" {
  secret_id = "carta-secret-key-${var.environment}"

  replication {
    auto {}
  }

  labels = var.labels

  depends_on = [google_project_service.apis]
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "cloud_run_url" {
  value       = google_cloud_run_v2_service.carta_api.uri
  description = "URL of the Cloud Run service"
}

output "cloud_run_service_account" {
  value = google_service_account.cloud_run.email
}
