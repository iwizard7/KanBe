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
        static = 3000
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
        image = "sha256:815c769de1e239705acbd852efbc1205937212b87943bfe12f9d8c585b07c251"
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
        # INITIAL_PASSWORD is used to set the password on first run if config.json is missing
        INITIAL_PASSWORD = "admin"
      }

      resources {
        cpu    = 200 # 200 MHz
        memory = 256 # 256 MB
      }
    }
  }
}
