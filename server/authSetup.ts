import session from "express-session";
import type { Express } from "express";
import { passport } from "./auth";

export function setupAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
}

export const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  console.error(`[AUTH ERROR] 401 Unauthorized - IP: ${req.ip}, URL: ${req.originalUrl}, User-Agent: ${req.get('User-Agent')}`);
  res.status(401).json({ message: "Unauthorized" });
};