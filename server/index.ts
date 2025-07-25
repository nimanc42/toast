import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";
import { initializeScheduledJobs } from "./services/scheduled-jobs";
import { initializeVoiceCatalogue } from "./services/voice-catalogue";

// Check for Supabase credentials
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = process.env;
if (!VITE_SUPABASE_URL || !VITE_SUPABASE_ANON_KEY) {
  console.warn('[auth] Supabase credentials missing → social login disabled');
}

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: 'Too many authentication attempts, please try again later.'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the public directory
app.use('/audio', express.static(path.join(process.cwd(), 'public', 'audio')));
app.use('/voice-samples', express.static(path.join(process.cwd(), 'public', 'voice-samples')));

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
  try {
    // Check database connection first
    log('Checking database connection...');
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      log('Failed to connect to the database. Make sure DATABASE_URL is set correctly.');
      process.exit(1);
    }
    
    log('Database connection established successfully');
    
    // Initialize voice catalogue
    log('Initializing voice catalogue...');
    try {
      initializeVoiceCatalogue();
      log('Voice catalogue initialized');
    } catch (error) {
      log(`Warning: Voice catalogue initialization failed: ${error}`);
    }
    
    // Initialize scheduled jobs after confirming database connection
    log('Initializing scheduled jobs...');
    try {
      initializeScheduledJobs();
      log('Scheduled toast generation service initialized');
    } catch (error) {
      log(`Warning: Scheduled jobs initialization failed: ${error}`);
    }
    
    log('Registering routes...');
    
    // Health check endpoint
    app.get("/health", (_, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });
    
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error for debugging
      console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${status}: ${message}`);
      console.error(err.stack);

      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    log(`Server error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();
