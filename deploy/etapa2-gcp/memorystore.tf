# =============================================================================
# Carta — Cloud Memorystore (Redis) Configuration
# =============================================================================

resource "google_redis_instance" "carta" {
  name               = "carta-redis-${var.environment}"
  tier               = var.redis_tier
  memory_size_gb     = var.redis_memory_size_gb
  region             = var.region
  redis_version      = var.redis_version
  authorized_network = google_compute_network.vpc.id

  display_name = "Carta Redis (${var.environment})"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
    notify-keyspace-events = "Ex" # For session expiration events
  }

  labels = var.labels

  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.private_vpc,
  ]
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "redis_host" {
  value       = google_redis_instance.carta.host
  description = "Redis host IP"
}

output "redis_port" {
  value       = google_redis_instance.carta.port
  description = "Redis port"
}

output "redis_url" {
  value       = "redis://${google_redis_instance.carta.host}:${google_redis_instance.carta.port}"
  description = "Full Redis URL for application"
}
