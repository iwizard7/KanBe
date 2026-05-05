job "kanbe" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 1

    # Persistent storage using the host volume 'data' configured on the server
    volume "kanbe-storage" {
      type      = "host"
      read_only = false
      source    = "data"
    }

    network {
      port "http" {
        to = 3000
      }
    }

    service {
      name = "kanbe"
      port = "http"
      
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.kanbe.rule=Host(`kanbe.local`)", # Change to your domain if needed
      ]

      check {
        type     = "http"
        path     = "/api/check-auth"
        interval = "10s"
        timeout  = "2s"
      }
    }

    task "server" {
      driver = "docker"

      config {
        image = "iwizard7/kanbe:latest" # You can build and push this to Docker Hub
        ports = ["http"]
      }

      volume_mount {
        volume      = "kanbe-storage"
        destination = "/app/data"
      }

      # Environment variables can be passed directly or via a template
      env {
        PORT           = "3000"
        NODE_ENV       = "production"
        # SESSION_SECRET is ideally handled via template from Consul or Vault
        SESSION_SECRET = "kanban-secret-default" 
      }

      resources {
        cpu    = 200 # 200 MHz
        memory = 256 # 256 MB
      }
    }
  }
}
