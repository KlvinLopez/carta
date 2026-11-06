# =============================================================================
# Carta — Terraform Global Outputs
# =============================================================================

output "summary" {
  value = <<-EOT

  ╔══════════════════════════════════════════════════════════════╗
  ║              Carta Infrastructure — ${var.environment}               ║
  ╠══════════════════════════════════════════════════════════════╣
  ║                                                              ║
  ║  API URL:     ${google_cloud_run_v2_service.carta_api.uri}
  ║  DB Instance: ${google_sql_database_instance.carta.connection_name}
  ║  Redis Host:  ${google_redis_instance.carta.host}:${google_redis_instance.carta.port}
  ║  Registry:    ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.carta.repository_id}
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝

  EOT
  description = "Summary of deployed infrastructure"
}
