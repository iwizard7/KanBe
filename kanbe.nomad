job "kanbe" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 1

    constraint {
      attribute = "${node.unique.name}"
      value     = "sandbox" # ЗАМЕНИТЕ на имя вашей ноды из 'nomad node status'
    }

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
        image = "sha256:0cff5d3eb3907a9f1497582d4f97ed3042388318d73d9b4cb94cac3c61dbf6d8"
        ports = ["http"]
        force_pull = false
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
