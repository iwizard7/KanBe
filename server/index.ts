import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import net from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Function to check if port is available
  function checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }

  // Function to find available port starting from preferred port
  async function findAvailablePort(startPort: number): Promise<number> {
    const maxPort = 5100; // Maximum port to try
    let port = startPort;

    while (port <= maxPort) {
      if (await checkPortAvailable(port)) {
        return port;
      }
      port++;
    }

    throw new Error(`No available ports found in range ${startPort}-${maxPort}`);
  }

  // Use PORT from environment, default to 5005 for both development and production
  // This serves both the API and the client
  const preferredPort = parseInt(process.env.PORT || '5005', 10);

  try {
    const port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    const serverInstance = server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });

    // Handle server errors
    serverInstance.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is already in use. Trying next available port...`);
        // If still getting address in use, try to find another port
        findAvailablePort(port + 1).then((newPort) => {
          serverInstance.close();
          const newServerInstance = server.listen({
            port: newPort,
            host: "0.0.0.0",
            reusePort: true,
          }, () => {
            log(`serving on port ${newPort}`);
          });
        }).catch((err) => {
          log(`Error finding available port: ${err}`);
          process.exit(1);
        });
      } else {
        log(`Server error: ${error}`);
        process.exit(1);
      }
    });

  } catch (error) {
    log(`Error finding available port: ${error}`);
    process.exit(1);
  }
})();
