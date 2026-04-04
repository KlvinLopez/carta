# =============================================================================
# Carta — Main Terraform Configuration
# =============================================================================
# Infrastructure as Code for Google Cloud Platform
#
# Usage:
#   cd terraform/environments/dev
#   terraform init
#   terraform plan
#   terraform apply
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  # Remote state backend — configure per environment
  # backend "gcs" {
  #   bucket = "carta-terraform-state"
  #   prefix = "terraform/state"
  # }
}

# -----------------------------------------------------------------------------
# Provider Configuration
# -----------------------------------------------------------------------------

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# -----------------------------------------------------------------------------
# Enable Required APIs
# -----------------------------------------------------------------------------

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",           # Cloud Run
    "sqladmin.googleapis.com",      # Cloud SQL Admin
    "redis.googleapis.com",         # Memorystore Redis
    "vpcaccess.googleapis.com",     # Serverless VPC Access
    "secretmanager.googleapis.com", # Secret Manager
    "cloudbuild.googleapis.com",    # Cloud Build
    "artifactregistry.googleapis.com", # Artifact Registry
    "compute.googleapis.com",       # Compute Engine (networking)
    "servicenetworking.googleapis.com", # Service Networking
  ])

  project = var.project_id
  service = each.key

  disable_dependent_services = false
  disable_on_destroy         = false
}

# -----------------------------------------------------------------------------
# VPC Network
# -----------------------------------------------------------------------------

resource "google_compute_network" "vpc" {
  name                    = "${var.vpc_name}-${var.environment}"
  auto_create_subnetworks = false
  project                 = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "carta-subnet-${var.environment}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true
}

# Private Services Access (for Cloud SQL)
resource "google_compute_global_address" "private_ip_range" {
  name          = "carta-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# Serverless VPC Connector (Cloud Run → Cloud SQL / Redis)
resource "google_vpc_access_connector" "connector" {
  name          = "carta-vpc-connector-${var.environment}"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.apis]
}

# -----------------------------------------------------------------------------
# Artifact Registry (Docker images)
# -----------------------------------------------------------------------------

resource "google_artifact_registry_repository" "carta" {
  location      = var.region
  repository_id = "carta-${var.environment}"
  description   = "Docker images for Carta API"
  format        = "DOCKER"

  labels = var.labels

  depends_on = [google_project_service.apis]
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  value = google_compute_network.vpc.id
}

output "vpc_connector_id" {
  value = google_vpc_access_connector.connector.id
}

output "artifact_registry_url" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.carta.repository_id}"
}
