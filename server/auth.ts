import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { 
  checkLoginRateLimit, 
  recordFailedLoginAttempt, 
  resetLoginAttempts
} from "./services/rate-limiter";
import { 
  generateVerificationToken, 
  verifyToken as verifyTokenService, 
  useToken,
  generatePasswordResetToken 
} from "./services/token";
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail 
} from "./services/email";

declare global {
  namespace Express {
    interface User extends Omit<User, "password"> {}
  }
}

const scryptAsync = promisify(scrypt);

// Session secret
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';

// Password hashing salt length
const SALT_LENGTH = 16;

/**
 * Hash a password with scrypt and salt
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a supplied password with a stored hashed password
 */
export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Setup authentication middleware and routes
 */
export function setupAuth(app: Express) {
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: storage.sessionStore,
  };

  // Set up session middleware
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        if (!passwordValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Do not return the password
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Serialization and deserialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Do not return the password
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      done(error);
    }
  });

  // Register route
  app.post("/api/register", async (req, res) => {
    try {
      // Check if username is taken
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email is taken
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create user
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      
      // Generate email verification token
      const verificationToken = await generateVerificationToken(user.id);
      
      // Send verification email
      await sendVerificationEmail(user.email, user.name, verificationToken);
      
      // Do not return the password
      const { password: _, ...userWithoutPassword } = user;
      
      // Log user in automatically after registration
      req.login(userWithoutPassword, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login route with rate limiting
  app.post("/api/login", async (req, res, next) => {
    try {
      // Get client IP (handle proxy forwarding)
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Check if this IP is rate limited
      const { blocked, message } = await checkLoginRateLimit(ip);
      if (blocked) {
        return res.status(429).json({ message });
      }
      
      // Authenticate user
      passport.authenticate('local', async (err, user, info) => {
        if (err) {
          return next(err);
        }
        
        if (!user) {
          // Record failed attempt for rate limiting
          await recordFailedLoginAttempt(ip);
          return res.status(401).json({ message: info?.message || "Authentication failed" });
        }
        
        // Reset rate limit on successful login
        await resetLoginAttempts(ip);
        
        // Log in the user
        req.login(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          return res.json(user);
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Email verification route
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid token" });
      }
      
      const { valid, userId } = await verifyTokenService(token, 'verification');
      
      if (!valid || !userId) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Mark token as used
      await useToken(token);
      
      // Verify the user's email
      const user = await storage.verifyUserEmail(userId);
      
      // Respond with success
      res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Email verification failed" });
    }
  });

  // Forgot password route
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Don't reveal if email exists or not (security)
      if (!user) {
        return res.status(200).json({ message: "If the email exists, a password reset link has been sent" });
      }
      
      // Generate password reset token
      const resetToken = await generatePasswordResetToken(user.id);
      
      // Send password reset email
      await sendPasswordResetEmail(user.email, resetToken);
      
      // Respond with success
      res.status(200).json({ message: "If the email exists, a password reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Password reset request failed" });
    }
  });

  // Reset password route
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Verify token
      const { valid, userId } = await verifyTokenService(token, 'password-reset');
      
      if (!valid || !userId) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Mark token as used
      await useToken(token);
      
      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      // Update user's password
      const user = await storage.updateUser(userId, { password: hashedPassword });
      
      // Respond with success
      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });
}

/**
 * Middleware to ensure a user is authenticated
 */
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}