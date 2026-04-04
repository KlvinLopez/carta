# =============================================================================
# Carta — Cloud SQL (PostgreSQL) Configuration
# =============================================================================

resource "google_sql_database_instance" "carta" {
  name                = "carta-postgres-${var.environment}"
  database_version    = var.db_version
  region              = var.region
  deletion_protection = var.environment == "prod" ? true : false

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = var.environment == "prod" ? 20 : 10
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled                        = var.environment == "prod" ? true : false
      start_time                     = "03:00"
      point_in_time_recovery_enabled = var.environment == "prod" ? true : false

      backup_retention_settings {
        retained_backups = var.environment == "prod" ? 7 : 1
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }

    database_flags {
      name  = "max_connections"
      value = var.environment == "prod" ? "200" : "50"
    }

    user_labels = var.labels
  }

  depends_on = [
    google_service_networking_connection.private_vpc,
    google_project_service.apis,
  ]
}

# Database
resource "google_sql_database" "carta_db" {
  name     = var.db_name
  instance = google_sql_database_instance.carta.name
}

# User
resource "google_sql_user" "carta_user" {
  name     = var.db_user
  instance = google_sql_database_instance.carta.name
  password = var.db_password
}

# Store password in Secret Manager
resource "google_secret_manager_secret" "db_password" {
  secret_id = "carta-db-password-${var.environment}"

  replication {
    auto {}
  }

  labels = var.labels

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "db_connection_name" {
  value       = google_sql_database_instance.carta.connection_name
  description = "Cloud SQL connection name for Cloud Run"
}

output "db_private_ip" {
  value       = google_sql_database_instance.carta.private_ip_address
  description = "Private IP of Cloud SQL instance"
}

output "database_url" {
  value       = "postgresql://${var.db_user}:${var.db_password}@${google_sql_database_instance.carta.private_ip_address}:5432/${var.db_name}"
  sensitive   = true
  description = "Full DATABASE_URL for application"
}
