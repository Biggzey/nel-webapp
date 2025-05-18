// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import swaggerUi from 'swagger-ui-express';
import { specs } from './swagger.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import Mailjet from 'node-mailjet';

// Import monitoring dependencies
let expressWinston, responseTime, logger, metrics;
try {
  expressWinston = (await import('express-winston')).default;
  responseTime = (await import('response-time')).default;
  logger = (await import('./config/logging.js')).default;
  metrics = await import('./config/metrics.js');
} catch (err) {
  console.error('Warning: Monitoring dependencies not loaded:', err.message);
}

// Get directory name for ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env"
});

// Load JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in environment variables');
}

// Add process-level error handling at the very top
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', {
    error: err.message,
    stack: err.stack,
    name: err.name
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null
  });
});

// Force synchronous logging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
  process.stdout.write(JSON.stringify(Array.from(arguments)) + '\n');
};

console.error = function() {
  process.stderr.write(JSON.stringify(Array.from(arguments)) + '\n');
};

// Wrap server startup in try-catch
try {
  const app = express();

  // Configure trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', 1);

  // Configure CORS with more secure options
  const corsOptions = {
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200
  };

  // Apply CORS before any other middleware
  app.use(cors(corsOptions));

  // Add request logging before any middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    // Log request
    process.stdout.write(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'request',
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined
    }) + '\n');

    // Log response
    const originalEnd = res.end;
    res.end = function() {
      const duration = Date.now() - start;
      process.stdout.write(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'response',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: duration
      }) + '\n');
      originalEnd.apply(res, arguments);
    };

    next();
  });

  // Add error-catching middleware for JSON parsing
  app.use(express.json({
    limit: '10mb', // Increase payload size limit
    verify: (req, res, buf) => {
      if (!buf || buf.length === 0) return; // Only parse if not empty
      try {
        JSON.parse(buf);
      } catch (e) {
        console.error('JSON parsing error:', {
          error: e.message,
          body: buf.toString(),
          path: req.path,
          method: req.method
        });
        res.status(400).json({ error: 'Invalid JSON in request body' });
        throw e;
      }
    }
  }));

  app.use(express.urlencoded({ 
    extended: true,
    limit: '10mb' // Increase payload size limit
  }));

  // Add error-catching middleware
  app.use((err, req, res, next) => {
    console.error('Middleware error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body
    });
    
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    next(err);
  });

  // Initialize monitoring if dependencies are available
  if (expressWinston && responseTime && logger && metrics) {
    // Add response time header and track request duration
    app.use(responseTime((req, res, time) => {
      if (req.url !== '/metrics') {
        metrics.httpRequestDurationMicroseconds
          .labels(req.method, req.url, res.statusCode)
          .observe(time / 1000);
      }
    }));

    // Track total requests
    app.use((req, res, next) => {
      if (req.url !== '/metrics') {
        metrics.httpRequestsTotal.labels(req.method, req.url, res.statusCode).inc();
      }
      next();
    });

    // Track active connections
    app.use((req, res, next) => {
      metrics.activeConnections.inc();
      res.on('finish', () => {
        metrics.activeConnections.dec();
      });
      next();
    });

    // Add Winston request logging
    app.use(expressWinston.logger({
      winstonInstance: logger,
      meta: true,
      msg: 'HTTP {{req.method}} {{req.url}}',
      expressFormat: true,
      colorize: false,
    }));

    // Add Winston error logging
    app.use(expressWinston.errorLogger({
      winstonInstance: logger,
    }));

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', metrics.register.contentType);
        res.end(await metrics.register.metrics());
      } catch (err) {
        console.error('Error generating metrics:', err);
        res.status(500).end();
      }
    });
  } else {
    console.log('Monitoring dependencies not available - running without monitoring');
  }

  // Initialize Prisma client
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
  });

  // Add error handling for Prisma
  prisma.$on('error', (e) => {
    console.error('Database error:', e);
  });

  // Test database connection
  async function testDbConnection() {
    try {
      await prisma.$connect();
      console.log('Successfully connected to database');
      
      try {
        // Test queries
        const userCount = await prisma.user.count();
        console.log('Database connection test - User count:', userCount);

        const characterCount = await prisma.character.count();
        console.log('Database connection test - Character count:', characterCount);

        const userPrefCount = await prisma.userPreference.count();
        console.log('Database connection test - UserPreference count:', userPrefCount);

        // Test database schema
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        console.log('Available database tables:', tables);

      } catch (error) {
        if (error.code === 'P2021') {
          console.log('Database connected but tables not yet created - this is normal during first deployment');
        } else {
          console.error('Database schema test error:', {
            message: error.message,
            code: error.code,
            meta: error.meta
          });
          throw error;
        }
      }
    } catch (error) {
      console.error('Database connection error:', {
        error: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      });
      throw error; // Re-throw to prevent server start if DB is not available
    }
  }

  // Configure CSRF protection
  const csrfProtection = csrf({ cookie: true });

  // Enhanced security headers configuration
  const helmetConfig = {
    contentSecurityPolicy: false, // Disable CSP in development
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  };

  // Add cookie parser before other middleware
  app.use(cookieParser());

  // Security headers
  app.use(helmet(helmetConfig));

  // Enable compression
  app.use(compression());

  // Logging
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // Rate limiting per endpoint
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 5 : 100, // More lenient in development
    message: { error: "Too many attempts. Please wait 15 minutes before trying again." },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true,
    handler: (req, res) => {
      console.log('Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        headers: req.headers
      });
      res.status(429).json({ error: "Too many attempts. Please wait 15 minutes before trying again." });
    }
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 100 : 1000, // More lenient in development
    message: { error: "Too many API requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true,
    handler: (req, res) => {
      console.log('API rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        headers: req.headers
      });
      res.status(429).json({ error: "Too many API requests. Please try again later." });
    }
  });

  // Apply rate limiting to specific endpoints
  app.use('/api/login', authLimiter);
  app.use('/api/signup', authLimiter);
  app.use('/api/', apiLimiter);

  // Swagger documentation - must be before static files
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

  // Production static file serving and client routing
  if (process.env.NODE_ENV === "production") {
    const distPath = join(__dirname, "dist");
    
    // First try to serve static files
    app.use(express.static(distPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));

    // For any requests that don't match static files or API routes,
    // send the index.html file for client-side routing
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
      } else {
        res.sendFile(join(distPath, 'index.html'));
      }
    });
  }

  // OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Global error handler:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: req.body
    });
    
    if (process.env.NODE_ENV === "production") {
      res.status(500).json({ error: "An unexpected error occurred" });
    } else {
      res.status(500).json({ error: err.message });
    }
  });

  // Validation helpers
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function isValidUsername(username) {
    // At least 3 characters, only letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }

  function isValidPassword(password) {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  }

  // Create email transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Generate verification token
  function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create Mailjet client
  let mailjet;
  try {
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      console.warn('Mailjet API credentials not found. Email functionality will be disabled.');
    } else {
      mailjet = new Mailjet({
        apiKey: process.env.MAILJET_API_KEY,
        apiSecret: process.env.MAILJET_SECRET_KEY
      });
    }
  } catch (error) {
    console.error('Failed to initialize Mailjet client:', error);
  }

  // Send verification email
  async function sendVerificationEmail(email, token) {
    try {
      // Verify Mailjet configuration
      if (!mailjet) {
        throw new Error('Mailjet client not initialized. Please check your environment variables.');
      }

      if (!process.env.SMTP_FROM || !process.env.FRONTEND_URL) {
        throw new Error('Missing required email configuration (SMTP_FROM or FRONTEND_URL)');
      }

      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      console.log('Sending verification email:', {
        to: email,
        from: process.env.SMTP_FROM
      });

      const data = {
        Messages: [
          {
            From: {
              Email: process.env.SMTP_FROM,
              Name: "NEL Webapp"
            },
            To: [
              {
                Email: email
              }
            ],
            Subject: "Verify your email address",
            HTMLPart: `
              <h1>Welcome to our platform!</h1>
              <p>Please click the link below to verify your email address:</p>
              <a href="${verificationUrl}">${verificationUrl}</a>
              <p>This link will expire in 24 hours.</p>
            `
          }
        ]
      };

      const result = await mailjet.post("send", { version: 'v3.1' }).request(data);

      console.log('Verification email sent successfully:', {
        messageId: result.body.Messages[0].To[0].MessageID,
        status: result.body.Messages[0].Status
      });

      return result;
    } catch (error) {
      console.error('Failed to send verification email:', {
        error: error.message,
        code: error.ErrorCode,
        statusCode: error.statusCode,
        stack: error.stack
      });
      throw error;
    }
  }

  // — AUTH ROUTES —

  /**
   * @swagger
   * /api/signup:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - username
   *               - password
   *               - confirmPassword
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               username:
   *                 type: string
   *                 minLength: 3
   *               password:
   *                 type: string
   *                 minLength: 8
   *               confirmPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: User successfully registered
   *       400:
   *         description: Invalid input data
   */
  app.post("/api/signup", async (req, res) => {
    console.log('Signup request received:', {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: { ...req.body, password: '[REDACTED]' }
    });

    const { email, username, password, confirmPassword } = req.body;
    
    // Check if all required fields are present
    if (!email || !username || !password || !confirmPassword) {
      console.log('Signup validation failed - missing fields:', {
        hasEmail: !!email,
        hasUsername: !!username,
        hasPassword: !!password,
        hasConfirmPassword: !!confirmPassword
      });
      return res.status(400).json({ error: "All fields are required" });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate username format
    if (!isValidUsername(username)) {
      return res.status(400).json({ 
        error: "Username must be at least 3 characters long and can only contain letters, numbers, and underscores" 
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ 
        error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number" 
      });
    }

    try {
      // Start a transaction
      const { user, nelliel } = await prisma.$transaction(async (tx) => {
        // Check if username or email already exists
        const existingUser = await tx.user.findFirst({
          where: {
            OR: [
              { email },
              { username }
            ]
          }
        });

        if (existingUser) {
          if (existingUser.email === email) {
            throw new Error("Email already in use");
          }
          throw new Error("Username already taken");
        }

        // Generate verification token
        const verificationToken = generateVerificationToken();
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with verification token
        const hash = await bcrypt.hash(password, 10);
        const user = await tx.user.create({
          data: { 
            email, 
            username,
            passwordHash: hash,
            verificationToken,
            verificationTokenExpires
          }
        });

        // Create Nelliel character
        const nelliel = await tx.character.create({
          data: {
            userId: user.id,
            name: "Nelliel",
            description: "Your friendly AI companion who is always ready to chat and help.",
            personality: "Your custom AI companion.",
            avatar: "/nel-avatar.png",
            fullImage: "/nel-avatar.png",
            systemPrompt: "You are Nelliel, a helpful and friendly AI companion. You are knowledgeable, empathetic, and always eager to assist users with their questions and tasks.",
            customInstructions: "",
            status: "Ready to chat",
            tags: ["AI", "Companion", "Helper"],
            alternateGreetings: ["Hello! How can I help you today?", "Hi there! What's on your mind?"],
            isPublic: false,
            reviewStatus: "private",
            order: 0
          }
        });

        // Create user preferences with Nelliel as default character
        await tx.userPreference.create({
          data: {
            userId: user.id,
            selectedCharId: nelliel.id
          }
        });

        return { user, nelliel };
      });

      // If we get here, the transaction was successful
      // Try to send verification email
      try {
        await sendVerificationEmail(email, user.verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail the signup if email fails, but log it
        // The user can request a new verification email later
      }

      console.log('User created successfully:', { id: user.id, email: user.email });
      
      return res.status(200).json({ 
        message: "User registered successfully. Please check your email to verify your account.",
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      // Ensure we always return a JSON response
      if (error.message === "Email already in use" || error.message === "Username already taken") {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: "An unexpected error occurred during signup" });
    }
  });

  /**
   * @swagger
   * /api/login:
   *   post:
   *     summary: Authenticate user and get token
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - identifier
   *               - password
   *             properties:
   *               identifier:
   *                 type: string
   *                 description: Email or username
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *       401:
   *         description: Invalid credentials
   */
  app.post("/api/login", async (req, res) => {
    console.log('Login request received:', {
      path: req.path,
      method: req.method,
      headers: req.headers,
      body: { ...req.body, password: '[REDACTED]' }
    });

    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      console.log('Login validation failed - missing fields:', {
        hasIdentifier: !!identifier,
        hasPassword: !!password
      });
      return res.status(400).json({ error: "Login identifier and password required" });
    }

    try {
      console.log('Login attempt:', { identifier }); // Log login attempt

      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier }
          ]
        }
      });

      console.log('User lookup result:', { 
        found: !!user,
        id: user?.id,
        email: user?.email,
        username: user?.username 
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.emailVerified) {
        return res.status(401).json({ 
          error: "Please verify your email before logging in",
          needsVerification: true
        });
      }

      // Check if user is blocked
      if (user.blocked) {
        if (user.blockedUntil && user.blockedUntil > new Date()) {
          return res.status(403).json({ 
            error: "Account blocked", 
            blockedUntil: user.blockedUntil 
          });
        } else {
          // If block duration has expired, unblock the user
          await prisma.user.update({
            where: { id: user.id },
            data: {
              blocked: false,
              blockedUntil: null
            }
          });
        }
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      console.log('Password validation:', { valid }); // Log password validation result

      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update lastLogin on successful login
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        });
      } catch (updateErr) {
        console.error("Error updating lastLogin:", {
          error: updateErr.message,
          code: updateErr.code,
          meta: updateErr.meta,
          userId: user.id
        });
        // Continue with login even if lastLogin update fails
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      console.log('Token generated successfully');
      
      // Set cookie for additional security
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({ token });
    } catch (err) {
      console.error("Login error details:", {
        error: err.message,
        stack: err.stack,
        code: err.code,
        meta: err.meta,
        body: req.body,
        name: err.name,
        cause: err.cause
      });
      
      // Send more detailed error in development
      if (process.env.NODE_ENV === 'development') {
        res.status(500).json({ 
          error: "An unexpected error occurred during login",
          details: err.message,
          code: err.code
        });
      } else {
        res.status(500).json({ error: "An unexpected error occurred during login" });
      }
    }
  });

  // Auth middleware
  function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Not authenticated" });
    const token = header.split(" ")[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.userId };
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  }

  // — PROFILE ROUTES —

  // Get current user email and username
  app.get("/api/user", authMiddleware, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ 
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          role: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log('Sending user data:', {
        ...user,
        avatar: user.avatar ? '[AVATAR_DATA]' : null
      });

      res.json(user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Update user profile (display name and avatar)
  app.put("/api/user/profile", authMiddleware, async (req, res) => {
    const { displayName, avatar } = req.body;
    try {
      console.log('Profile update request:', {
        userId: req.user.id,
        hasDisplayName: !!displayName,
        hasAvatar: !!avatar,
        displayNameLength: displayName?.length
      });

      // Validate avatar size if present
      if (avatar) {
        const base64Size = Buffer.from(avatar.split(',')[1], 'base64').length;
        const maxSize = 1024 * 1024; // 1MB
        if (base64Size > maxSize) {
          return res.status(413).json({ 
            error: "Avatar image too large. Maximum size is 1MB. Try using a smaller image or reducing its dimensions.",
            code: "IMAGE_TOO_LARGE"
          });
        }
      }

      // Validate display name if present
      if (displayName && displayName.length > 50) {
        return res.status(400).json({
          error: "Display name too long. Maximum length is 50 characters.",
          code: "NAME_TOO_LONG"
        });
      }

      // Get current user data
      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!currentUser) {
        return res.status(404).json({
          error: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Only update fields that were provided
      const updateData = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (avatar !== undefined) updateData.avatar = avatar;

      console.log('Updating user profile:', {
        userId: req.user.id,
        updateData: {
          ...updateData,
          avatar: updateData.avatar ? '[AVATAR_DATA]' : undefined
        }
      });

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true
        }
      });

      console.log('Profile updated successfully:', {
        userId: updated.id,
        displayName: updated.displayName,
        hasAvatar: !!updated.avatar
      });

      res.json({ 
        success: true,
        user: updated,
        message: "Profile updated successfully"
      });
    } catch (err) {
      console.error("Profile update error:", {
        error: err.message,
        stack: err.stack,
        code: err.code
      });
      res.status(500).json({ 
        error: "Failed to update profile. Please try again.",
        code: "UPDATE_FAILED",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Update password
  app.put("/api/user/password", authMiddleware, async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    try {
      // Validate password match
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ 
          error: "New passwords do not match",
          code: "PASSWORD_MISMATCH"
        });
      }

      // Validate password strength
      if (!isValidPassword(newPassword)) {
        return res.status(400).json({ 
          error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number",
          code: "INVALID_PASSWORD"
        });
      }

      // Get current user
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      
      // Verify old password
      const validPassword = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ 
          error: "Current password is incorrect",
          code: "INVALID_CURRENT_PASSWORD"
        });
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: newHash }
      });

      res.json({ 
        success: true,
        message: "Password updated successfully"
      });
    } catch (err) {
      console.error("Password update error:", err);
      res.status(500).json({ 
        error: "Failed to update password. Please try again.",
        code: "UPDATE_FAILED",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });

  // Get user role
  app.get("/api/user/role", authMiddleware, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true }
      });
      res.json({ role: user.role });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ error: "Failed to fetch user role" });
    }
  });

  // Get onboarding status for current user
  app.get("/api/user/onboarding", authMiddleware, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { hasSeenOnboarding: true }
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ hasSeenOnboarding: user.hasSeenOnboarding });
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  // Mark onboarding as complete for current user
  app.post("/api/user/onboarding", authMiddleware, async (req, res) => {
    try {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { hasSeenOnboarding: true }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating onboarding status:", error);
      res.status(500).json({ error: "Failed to update onboarding status" });
    }
  });

  // Reset onboarding for a user (admin only)
  app.post("/api/admin/users/:userId/reset-onboarding", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      await prisma.user.update({
        where: { id: parseInt(req.params.userId, 10) },
        data: { hasSeenOnboarding: false }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting onboarding status:", error);
      res.status(500).json({ error: "Failed to reset onboarding status" });
    }
  });

  // — CHAT ENDPOINTS —

  // Get chat messages for a character
  app.get("/api/chat/:characterId", authMiddleware, async (req, res) => {
    try {
      // First verify the character belongs to the user
      const character = await prisma.character.findFirst({
        where: {
          id: parseInt(req.params.characterId),
          userId: req.user.id
        }
      });

      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      const messages = await prisma.chatMessage.findMany({
        where: {
          characterId: parseInt(req.params.characterId),
          character: {
            userId: req.user.id
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Save a new message
  app.post("/api/chat/:characterId/message", authMiddleware, async (req, res) => {
    try {
      const { role, content, reactions = {} } = req.body;
      const characterId = parseInt(req.params.characterId);
      
      console.log('Saving message:', { 
        characterId, 
        userId: req.user.id,
        role, 
        content,
        reactions 
      });
      
      // Verify character belongs to user
      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          userId: req.user.id
        }
      });

      if (!character) {
        console.log('Character not found:', { characterId, userId: req.user.id });
        return res.status(404).json({ error: "Character not found" });
      }

      // Validate required fields
      if (!role || !content) {
        console.log('Missing required fields:', { role, content });
        return res.status(400).json({ error: "Role and content are required" });
      }

      // Create the message with proper relation
      const message = await prisma.chatMessage.create({
        data: {
          character: {
            connect: {
              id: characterId
            }
          },
          role,
          content,
          reactions
        }
      });
      
      console.log('Message saved successfully:', message);
      res.json(message);
    } catch (error) {
      console.error("Error saving chat message:", error);
      console.error("Request body:", req.body);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ 
        error: "Failed to save chat message", 
        details: error.message,
        body: req.body 
      });
    }
  });

  // Update a message (for editing or reactions)
  app.put("/api/chat/message/:messageId", authMiddleware, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { content, reactions } = req.body;

      // Verify message belongs to user's character
      const message = await prisma.chatMessage.findFirst({
        where: {
          id: messageId,
          character: {
            userId: req.user.id
          }
        }
      });

      if (!message) {
        return res.status(403).json({ error: "Not authorized to modify this message" });
      }

      const updated = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { content, reactions }
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating chat message:", error);
      res.status(500).json({ error: "Failed to update chat message" });
    }
  });

  // Delete a message
  app.delete("/api/chat/message/:messageId", authMiddleware, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      // Verify message belongs to user's character
      const message = await prisma.chatMessage.findFirst({
        where: {
          id: messageId,
          character: {
            userId: req.user.id
          }
        }
      });

      if (!message) {
        return res.status(403).json({ error: "Not authorized to delete this message" });
      }

      await prisma.chatMessage.delete({
        where: { id: messageId }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat message:", error);
      res.status(500).json({ error: "Failed to delete chat message" });
    }
  });

  // Clear all messages for a character
  app.delete("/api/chat/:characterId", authMiddleware, async (req, res) => {
    try {
      const characterId = parseInt(req.params.characterId);

      // Verify character belongs to user
      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          userId: req.user.id
        }
      });

      if (!character) {
        return res.status(403).json({ error: "Not authorized to access this character" });
      }

      await prisma.chatMessage.deleteMany({
        where: { characterId }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // Modify the existing chat completion endpoint to save assistant responses
  app.post("/api/chat", authMiddleware, async (req, res) => {
    const { model, messages, character } = req.body;
    
    try {
      // Construct the system message using character's configuration
      let systemMessage = character?.systemPrompt || "You are a helpful AI assistant.";
      
      // Add personality if provided
      if (character?.personality) {
        systemMessage += "\n\nPersonality:\n" + character.personality;
      }
      
      // Add backstory if provided
      if (character?.backstory) {
        systemMessage += "\n\nBackstory:\n" + character.backstory;
      }
      
      // Add custom instructions if provided
      if (character?.customInstructions) {
        systemMessage += "\n\nAdditional Instructions:\n" + character.customInstructions;
      }

      // Prepend the system message to the conversation
      const enhancedMessages = [
        { role: "system", content: systemMessage },
        ...messages
      ];

      const completion = await openai.chat.completions.create({ 
        model, 
        messages: enhancedMessages 
      });

      // Save the assistant's response to the database
      if (character?.id) {
        // Verify character belongs to user before saving
        const userCharacter = await prisma.character.findFirst({
          where: {
            id: parseInt(character.id),
            userId: req.user.id
          }
        });

        if (userCharacter) {
          await prisma.chatMessage.create({
            data: {
              character: {
                connect: {
                  id: parseInt(character.id)
                }
              },
              role: "assistant",
              content: completion.choices[0].message.content,
              reactions: {}
            }
          });
        }
      }

      res.json(completion);
    } catch (err) {
      console.error("Chat completion error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Generate AI response
  app.post("/api/chat/:characterId/generate", authMiddleware, async (req, res) => {
    try {
      const characterId = parseInt(req.params.characterId);
      const { model } = req.body;

      // Verify character belongs to user
      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          userId: req.user.id
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      });

      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      // Construct the system message using character's configuration
      let systemMessage = character.systemPrompt || "You are a helpful AI assistant.";
      
      // Add personality if provided
      if (character.personality) {
        systemMessage += "\n\nPersonality:\n" + character.personality;
      }
      
      // Add backstory if provided
      if (character.backstory) {
        systemMessage += "\n\nBackstory:\n" + character.backstory;
      }
      
      // Add custom instructions if provided
      if (character.customInstructions) {
        systemMessage += "\n\nAdditional Instructions:\n" + character.customInstructions;
      }

      // Create messages array for OpenAI
      const messages = [
        { role: "system", content: systemMessage },
        ...character.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Get completion from OpenAI
      const completion = await openai.chat.completions.create({ 
        model, 
        messages
      });

      // Save the assistant's response
      const savedMessage = await prisma.chatMessage.create({
        data: {
          character: {
            connect: {
              id: characterId
            }
          },
          role: "assistant",
          content: completion.choices[0].message.content,
          reactions: {}
        }
      });

      res.json(savedMessage);
    } catch (error) {
      console.error("Error generating chat response:", error);
      res.status(500).json({ error: "Failed to generate chat response" });
    }
  });

  // Regenerate an assistant message
  app.post("/api/chat/message/:messageId/regenerate", authMiddleware, async (req, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      // 1. Find the message and ensure it is an assistant message belonging to the user's character
      const message = await prisma.chatMessage.findFirst({
        where: {
          id: messageId,
          role: "assistant",
          character: {
            userId: req.user.id
          }
        },
        include: {
          character: true
        }
      });

      if (!message) {
        return res.status(404).json({ error: "Message not found or not authorized" });
      }

      // 2. Get all messages for this character, ordered by createdAt
      const allMessages = await prisma.chatMessage.findMany({
        where: {
          characterId: message.characterId
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      // 3. Find the index of the message to regenerate
      const msgIdx = allMessages.findIndex(m => m.id === messageId);
      if (msgIdx === -1) {
        return res.status(400).json({ error: "Message not found in conversation" });
      }

      // 4. Build the conversation up to the user message before this assistant message
      // Find the last user message before this assistant message
      let userMsgIdx = msgIdx - 1;
      while (userMsgIdx >= 0 && allMessages[userMsgIdx].role !== "user") {
        userMsgIdx--;
      }
      if (userMsgIdx < 0) {
        return res.status(400).json({ error: "No user message found before this assistant message" });
      }

      // Conversation up to and including the user message
      const convoUpToUser = allMessages.slice(0, userMsgIdx + 1);

      // 5. Build system prompt
      let systemMessage = message.character.systemPrompt || "You are a helpful AI assistant.";
      if (message.character.personality) {
        systemMessage += "\n\nPersonality:\n" + message.character.personality;
      }
      if (message.character.backstory) {
        systemMessage += "\n\nBackstory:\n" + message.character.backstory;
      }
      if (message.character.customInstructions) {
        systemMessage += "\n\nAdditional Instructions:\n" + message.character.customInstructions;
      }

      // 6. Prepare messages for OpenAI
      const openaiMessages = [
        { role: "system", content: systemMessage },
        ...convoUpToUser.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];

      // 7. Call OpenAI to regenerate the assistant's response
      const model = req.body.model || process.env.VITE_OPENAI_MODEL || "gpt-3.5-turbo";
      const completion = await openai.chat.completions.create({
        model,
        messages: openaiMessages
      });

      const newContent = completion.choices[0].message.content;

      // 8. Update the assistant message in the DB
      const updatedMsg = await prisma.chatMessage.update({
        where: { id: messageId },
        data: { content: newContent }
      });

      res.json(updatedMsg);
    } catch (error) {
      console.error("Error regenerating assistant message:", error);
      res.status(500).json({ error: "Failed to regenerate assistant message" });
    }
  });

  // — CHARACTER ENDPOINTS —

  /**
   * @swagger
   * /api/characters:
   *   get:
   *     summary: Get all characters for the current user
   *     tags: [Characters]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of characters
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                   name:
   *                     type: string
   *       401:
   *         description: Not authenticated
   */
  app.get("/api/characters", authMiddleware, async (req, res) => {
    try {
      const characters = await prisma.character.findMany({
        where: { userId: req.user.id, isPublic: false },
        orderBy: { order: 'asc' }
      });
      res.json(characters);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  // PATCH endpoint to update character order
  app.patch("/api/characters/order", authMiddleware, async (req, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ error: "orderedIds must be an array" });
      }
      // Fetch all character IDs for this user
      const userCharacters = await prisma.character.findMany({
        where: { userId: req.user.id },
        select: { id: true }
      });
      const userCharIds = userCharacters.map(c => c.id);
      // Only allow reordering of user's own characters
      if (!orderedIds.every(id => userCharIds.includes(id))) {
        return res.status(403).json({ error: "Invalid character IDs" });
      }
      // Update each character's order
      await Promise.all(
        orderedIds.map((id, idx) =>
          prisma.character.update({
            where: { id },
            data: { order: idx }
          })
        )
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating character order:", error);
      res.status(500).json({ error: "Failed to update character order" });
    }
  });

  // Create a new character
  app.post("/api/characters", authMiddleware, async (req, res) => {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate required fields
      const { name, avatar, isPublic } = req.body;
      if (!name || !avatar) {
        return res.status(400).json({ error: "Name and avatar are required" });
      }

      // Additional validation for public characters
      if (isPublic) {
        const { description, systemPrompt, personality } = req.body;
        if (!description || !systemPrompt || !personality) {
          return res.status(400).json({ error: "Description, system prompt, and personality are required for public characters" });
        }
      }

      // Create the character data
      const characterData = {
        ...req.body,
        avatar: req.body.avatar || '/assets/default-avatar.png',
        userId: req.user.id,
        isPublic: isPublic,
        reviewStatus: isPublic ? "pending" : "private"
      };

      // Remove any pendingSubmissionInfo and id from the character data
      delete characterData.pendingSubmissionInfo;
      delete characterData.id;

      // Create the character
      const character = await prisma.character.create({
        data: characterData
      });

      // If this is a public character, create a pending submission
      if (isPublic) {
        try {
          const pendingSubmission = await prisma.pendingCharacter.create({
            data: {
              ...characterData,
              userId: req.user.id,
              status: "pending"
            }
          });

          // Return both the character and pending submission info
          return res.json({
            ...character,
            pendingSubmissionInfo: pendingSubmission
          });
        } catch (pendingError) {
          console.error("Error creating pending submission:", pendingError);
          // Return the character even if pending submission fails
          return res.json(character);
        }
      }

      // Return just the character for private characters
      res.json(character);
    } catch (error) {
      console.error("Error creating character:", error);
      res.status(500).json({ error: "Failed to create character" });
    }
  });

  // Update a character
  app.put("/api/characters/:id", authMiddleware, async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      
      // Verify character belongs to user
      const existing = await prisma.character.findFirst({
        where: {
          id: characterId,
          userId: req.user.id
        }
      });

      if (!existing) {
        return res.status(403).json({ error: "Not authorized to modify this character" });
      }

      // Remove any fields that shouldn't be updated
      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.userId;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      delete updateData.isPublic;
      delete updateData.reviewStatus;
      delete updateData.pendingSubmissions;
      delete updateData.customInstructions; // Remove customInstructions as it's no longer in the schema

      // Update the character
      const character = await prisma.character.update({
        where: { id: characterId },
        data: updateData
      });

      res.json(character);
    } catch (error) {
      console.error("Error updating character:", error);
      console.error("Request body:", req.body);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ 
        error: "Failed to update character", 
        details: error.message,
        body: req.body 
      });
    }
  });

  // Delete a character
  app.delete("/api/characters/:id", authMiddleware, async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      
      // Verify character belongs to user
      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          userId: req.user.id
        }
      });

      if (!character) {
        return res.status(403).json({ error: "Not authorized to delete this character" });
      }

      await prisma.character.delete({
        where: { id: characterId }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting character:", error);
      res.status(500).json({ error: "Failed to delete character" });
    }
  });

  // — USER PREFERENCES ENDPOINTS —

  // Admin middleware to check if user is admin or super admin
  function adminMiddleware(req, res, next) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get the full user data to check role
    prisma.user.findUnique({
      where: { id: user.id }
    }).then(fullUser => {
      if (fullUser && (fullUser.role === 'SUPER_ADMIN' || fullUser.role === 'ADMIN' || fullUser.role === 'MODERATOR')) {
        req.userRole = fullUser.role; // Store the role for later use
        next();
      } else {
        res.status(403).json({ error: 'Unauthorized. Admin access required.' });
      }
    }).catch(error => {
      console.error('Error checking user role:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  // Update user role (admin only)
  app.patch('/api/admin/users/:userId/role', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const userRole = req.userRole; // Get the current user's role

      console.log('Role update request:', {
        targetUserId: userId,
        newRole: role,
        adminRole: userRole
      });

      // Define role hierarchy
      const roleHierarchy = {
        'SUPER_ADMIN': 4,
        'ADMIN': 3,
        'MODERATOR': 2,
        'USER': 1
      };

      // Validate role
      if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
        console.log('Invalid role requested:', role);
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          blocked: true,
          blockedUntil: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true
        }
      });

      console.log('Target user found:', targetUser);

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent modifying SUPER_ADMIN users unless by another SUPER_ADMIN
      if (targetUser.role === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
        console.log('Attempted to modify SUPER_ADMIN by non-SUPER_ADMIN');
        return res.status(403).json({ error: 'Cannot modify SUPER_ADMIN role' });
      }

      // Check if user has permission to change to this role
      const currentUserRank = roleHierarchy[userRole];
      const targetRoleRank = roleHierarchy[role];
      const targetUserRank = roleHierarchy[targetUser.role];

      console.log('Role hierarchy check:', {
        currentUserRank,
        targetRoleRank,
        targetUserRank
      });

      // Users can only modify roles below their rank
      if (targetRoleRank >= currentUserRank || targetUserRank >= currentUserRank) {
        console.log('Permission denied: Cannot modify roles at or above current rank');
        return res.status(403).json({ error: 'You can only modify roles below your rank' });
      }

      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { role }
      });

      console.log('User role updated successfully:', updatedUser);

      res.json({ message: 'Role updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  // Get user preferences
  app.get("/api/preferences", authMiddleware, async (req, res) => {
    try {
      // First verify the user still exists
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { preferences: true }
      });

      if (!user) {
        return res.status(401).json({ error: "User no longer exists" });
      }

      // If preferences don't exist, create default ones
      if (!user.preferences) {
        const preferences = await prisma.userPreference.create({
          data: {
            userId: req.user.id,
            theme: "light",
            notifications: true,
            // Add other default preferences as needed
          }
        });
        return res.json(preferences);
      }

      res.json(user.preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Update user preferences
  app.patch('/api/preferences', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { chatTheme, selectedCharId } = req.body;
      
      console.log('PATCH /api/preferences - Request received:', {
        userId,
        headers: req.headers,
        body: req.body,
        auth: req.user
      });

      const data = {};
      if (chatTheme !== undefined) data.chatTheme = chatTheme;
      if (selectedCharId !== undefined) data.selectedCharId = selectedCharId;

      console.log('PATCH /api/preferences - Prepared update data:', data);

      // First check if preferences exist
      let existingPrefs = await prisma.userPreference.findUnique({
        where: { userId }
      });

      console.log('PATCH /api/preferences - Existing preferences:', existingPrefs);

      const preferences = await prisma.userPreference.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          ...data,
          selectedCharId: selectedCharId || 1
        }
      });

      console.log('PATCH /api/preferences - Updated preferences:', preferences);
      res.json(preferences);
    } catch (error) {
      console.error('PATCH /api/preferences - Error:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ error: 'Failed to update preferences', details: error.message });
    }
  });

  // Endpoint to get CSRF token
  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // — ADMIN ENDPOINTS —

  // Get all users (admin only)
  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          blocked: true,
          blockedUntil: true,
          createdAt: true,
          updatedAt: true,
          avatar: true,
          _count: {
            select: {
              characters: true,
            }
          }
        }
      });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Delete user by ID (admin only)
  app.delete("/api/admin/users/:userId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Don't allow admin to delete themselves
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Cannot delete your own admin account" });
      }

      // Delete all related data in a transaction
      await prisma.$transaction(async (prisma) => {
        // Delete all chat messages for all user's characters
        await prisma.chatMessage.deleteMany({
          where: {
            character: {
              userId: userId
            }
          }
        });

        // Delete all characters
        await prisma.character.deleteMany({
          where: {
            userId: userId
          }
        });

        // Delete user preferences
        await prisma.userPreference.deleteMany({
          where: {
            userId: userId
          }
        });

        // Finally delete the user
        await prisma.user.delete({
          where: {
            id: userId
          }
        });
      });

      // Clear auth cookies for the deleted user
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      // Send success response with cache control headers
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }).json({ 
        success: true,
        message: "User and all associated data deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Delete all users except admin (admin only)
  app.delete("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const adminUser = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      // Delete all related data except admin's
      await prisma.$transaction([
        // Delete all chat messages except admin's
        prisma.chatMessage.deleteMany({
          where: {
            character: {
              userId: {
                not: req.user.id
              }
            }
          }
        }),
        // Delete all characters except admin's
        prisma.character.deleteMany({
          where: {
            userId: {
              not: req.user.id
            }
          }
        }),
        // Delete all preferences except admin's
        prisma.userPreference.deleteMany({
          where: {
            userId: {
              not: req.user.id
            }
          }
        }),
        // Delete all users except admin
        prisma.user.deleteMany({
          where: {
            id: {
              not: req.user.id
            }
          }
        })
      ]);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting users:", error);
      res.status(500).json({ error: "Failed to delete users" });
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:userId/reset-password", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { customPassword } = req.body;
      
      console.log('Password reset request:', {
        userId,
        hasCustomPassword: !!customPassword,
        requestBody: req.body
      });

      let newPassword;
      if (customPassword) {
        // Use the provided custom password
        newPassword = customPassword;
        console.log('Using custom password');
      } else {
        // Generate a temporary password
        newPassword = Math.random().toString(36).slice(-8);
        console.log('Generated temporary password');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log('Password hashed successfully');

      // Update user's password
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword }
      });
      console.log('User password updated:', {
        userId: updatedUser.id,
        passwordUpdated: !!updatedUser.passwordHash
      });

      // Only return the temporary password if one was generated
      res.json({ 
        success: true,
        ...(customPassword ? {} : { temporaryPassword: newPassword })
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        body: req.body
      });
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Block user (admin only)
  app.post("/api/admin/users/:userId/block", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { duration } = req.body;
      
      // Don't allow admin to block themselves
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Cannot block your own admin account" });
      }

      // Calculate block duration
      let blockedUntil;
      switch (duration) {
        case '1h':
          blockedUntil = new Date(Date.now() + 60 * 60 * 1000);
          break;
        case '24h':
          blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
          break;
        case '7d':
          blockedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'permanent':
          blockedUntil = new Date('2099-12-31');
          break;
        default:
          return res.status(400).json({ error: "Invalid duration" });
      }

      // Update user's blocked status
      await prisma.user.update({
        where: { id: userId },
        data: {
          blocked: true,
          blockedUntil
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  // Unblock user (admin only)
  app.post("/api/admin/users/:userId/unblock", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          blocked: false,
          blockedUntil: null
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // Cleanup duplicate Nelliel characters (admin only)
  app.post("/api/admin/cleanup-duplicates", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { userId } = req.query;
      // Build query for all users or a specific user
      const userFilter = userId ? { userId: parseInt(userId) } : {};
      // Find all Nelliel characters, grouped by user
      const nelliels = await prisma.character.findMany({
        where: {
          name: "Nelliel",
          ...userFilter
        },
        orderBy: { id: 'asc' }
      });
      // Group by userId
      const grouped = {};
      nelliels.forEach(c => {
        if (!grouped[c.userId]) grouped[c.userId] = [];
        grouped[c.userId].push(c);
      });
      let totalDeleted = 0;
      let hasDuplicates = false;
      for (const chars of Object.values(grouped)) {
        if (chars.length > 1) {
          hasDuplicates = true;
          // Keep the first (oldest), delete the rest
          const toDelete = chars.slice(1);
          for (const c of toDelete) {
            await prisma.character.delete({ where: { id: c.id } });
            totalDeleted++;
          }
        }
      }
      res.json({ 
        success: true, 
        totalDeleted,
        hasDuplicates,
        message: hasDuplicates ? 
          `Removed ${totalDeleted} duplicate Nelliel characters.` : 
          'No duplicate Nelliel characters found.'
      });
    } catch (error) {
      console.error("Error cleaning up Nelliel duplicates:", error);
      res.status(500).json({ error: "Failed to clean up duplicates" });
    }
  });

  // Get system-wide metrics (admin only)
  app.get("/api/admin/metrics", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Get total users
      const totalUsers = await prisma.user.count();
      
      // Get active users (users who have logged in within the last 24 hours)
      const activeUsers = await prisma.user.count({
        where: {
          lastLogin: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      // Get new users today
      const newUsersToday = await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      // Get total messages
      const totalMessages = await prisma.chatMessage.count();

      // Get messages today
      const messagesToday = await prisma.chatMessage.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      // Get total characters
      const totalCharacters = await prisma.character.count();

      // Get characters created today
      const charactersCreatedToday = await prisma.character.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      });

      // Get average messages per user
      const avgMessagesPerUser = totalUsers > 0 ? totalMessages / totalUsers : 0;

      // Get average characters per user
      const avgCharactersPerUser = totalUsers > 0 ? totalCharacters / totalUsers : 0;

      // Get recent activity (last 10 actions)
      const recentUserActivity = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          username: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      const recentMessageActivity = await prisma.chatMessage.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          characterId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });
      const recentActivity = [
        ...recentUserActivity.map(u => ({ type: 'user', description: 'User registered', timestamp: u.createdAt, username: u.username })),
        ...recentMessageActivity.map(m => ({ type: 'message', description: 'Message sent', timestamp: m.createdAt, characterId: m.characterId }))
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

      res.json({
        totalUsers,
        activeUsers,
        newUsersToday,
        totalMessages,
        messagesToday,
        avgMessagesPerUser,
        totalCharacters,
        charactersCreatedToday,
        avgCharactersPerUser,
        recentActivity
      });
    } catch (error) {
      console.error("Error fetching system metrics:", error);
      res.status(500).json({ error: "Failed to fetch system metrics" });
    }
  });

  // Get user-specific metrics (admin only)
  app.get("/api/admin/users/:userId/metrics", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Get user's total messages
      const totalMessages = await prisma.chatMessage.count({
        where: {
          character: {
            userId
          }
        }
      });

      // Get user's characters created
      const charactersCreated = await prisma.character.count({
        where: {
          userId
        }
      });

      // Get user's active sessions (characters with messages in last 24 hours)
      const activeSessions = await prisma.character.count({
        where: {
          userId,
          messages: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      });

      // Get user's recent activity (last 10 messages)
      const recentActivity = await prisma.chatMessage.findMany({
        where: {
          character: {
            userId
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          characterId: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      res.json({
        totalMessages,
        charactersCreated,
        activeSessions,
        recentActivity
      });
    } catch (error) {
      console.error("Error fetching user metrics:", error);
      res.status(500).json({ error: "Failed to fetch user metrics" });
    }
  });

  // Add or update this endpoint for admin user details
  app.get("/api/admin/users/:userId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          blocked: true,
          blockedUntil: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true
        }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error) {
      console.error('Error fetching admin user details:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  // Get explore characters (public, approved characters)
  app.get("/api/explore/characters", authMiddleware, async (req, res) => {
    try {
      const characters = await prisma.character.findMany({
        where: { 
          isPublic: true,
          reviewStatus: 'approved'
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(characters);
    } catch (error) {
      console.error("Error fetching explore characters:", error);
      res.status(500).json({ error: "Failed to fetch explore characters" });
    }
  });

  // Admin: Get pending characters
  app.get("/api/admin/pending-characters", authMiddleware, async (req, res) => {
    try {
      // Get the full user data to check role
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(user.role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const pendingCharacters = await prisma.pendingCharacter.findMany({
        where: {
          status: "pending"
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(pendingCharacters);
    } catch (error) {
      console.error("Error fetching pending characters:", error);
      res.status(500).json({ error: "Failed to fetch pending characters" });
    }
  });

  // Approve character (admin only)
  app.post("/api/admin/characters/:id/approve", authMiddleware, async (req, res) => {
    try {
      // Get the full user data to check role
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(user.role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const pendingId = parseInt(req.params.id);
      
      // Get the pending character
      const pendingCharacter = await prisma.pendingCharacter.findUnique({
        where: { id: pendingId },
        include: { user: true }
      });

      if (!pendingCharacter) {
        return res.status(404).json({ error: "Pending character not found" });
      }

      // Create a new public character from the pending one
      const publicCharacter = await prisma.character.create({
        data: {
          name: pendingCharacter.name,
          description: pendingCharacter.description,
          avatar: pendingCharacter.avatar,
          fullImage: pendingCharacter.fullImage,
          age: pendingCharacter.age,
          gender: pendingCharacter.gender,
          race: pendingCharacter.race,
          occupation: pendingCharacter.occupation,
          likes: pendingCharacter.likes,
          dislikes: pendingCharacter.dislikes,
          personality: pendingCharacter.personality,
          systemPrompt: pendingCharacter.systemPrompt,
          customInstructions: pendingCharacter.customInstructions,
          backstory: pendingCharacter.backstory,
          firstMessage: pendingCharacter.firstMessage,
          messageExample: pendingCharacter.messageExample,
          scenario: pendingCharacter.scenario,
          creatorNotes: pendingCharacter.creatorNotes,
          alternateGreetings: pendingCharacter.alternateGreetings,
          tags: pendingCharacter.tags,
          creator: pendingCharacter.creator,
          characterVersion: pendingCharacter.characterVersion,
          extensions: pendingCharacter.extensions,
          userId: pendingCharacter.userId,
          isPublic: true,
          reviewStatus: "approved"
        }
      });

      // Update the pending character status
      await prisma.pendingCharacter.update({
        where: { id: pendingId },
        data: { status: "approved" }
      });

      // Create notification for the user
      await prisma.notification.create({
        data: {
          userId: pendingCharacter.userId,
          type: "CHARACTER_APPROVED",
          title: "Character Approved",
          message: `Your character "${pendingCharacter.name}" has been approved and is now public!`,
          metadata: { characterId: publicCharacter.id }
        }
      });

      res.json(publicCharacter);
    } catch (error) {
      console.error("Error approving character:", error);
      res.status(500).json({ error: "Failed to approve character" });
    }
  });

  // Reject character (admin only)
  app.post("/api/admin/characters/:id/reject", authMiddleware, async (req, res) => {
    try {
      // Get the full user data to check role
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user || !['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(user.role)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const pendingId = parseInt(req.params.id);
      const { reason } = req.body;

      // Get the pending character
      const pendingCharacter = await prisma.pendingCharacter.findUnique({
        where: { id: pendingId }
      });

      if (!pendingCharacter) {
        return res.status(404).json({ error: "Pending character not found" });
      }

      // Update the pending character status
      await prisma.pendingCharacter.update({
        where: { id: pendingId },
        data: { 
          status: "rejected",
          rejectionReason: reason
        }
      });

      // If there's an original character, update its status
      if (pendingCharacter.originalCharacterId) {
        await prisma.character.update({
          where: { id: pendingCharacter.originalCharacterId },
          data: { reviewStatus: "rejected" }
        });
      }

      // Create notification for the user
      await prisma.notification.create({
        data: {
          userId: pendingCharacter.userId,
          type: "CHARACTER_REJECTED",
          title: "Character Rejected",
          message: `Your character "${pendingCharacter.name}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          metadata: { characterId: pendingCharacter.originalCharacterId }
        }
      });

      res.json({ message: "Character rejected successfully" });
    } catch (error) {
      console.error("Error rejecting character:", error);
      res.status(500).json({ error: "Failed to reject character" });
    }
  });

  // Add character to user's collection
  app.post("/api/explore/characters/:id/add", authMiddleware, async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      
      // Get the public character
      const publicCharacter = await prisma.character.findFirst({
        where: {
          id: characterId,
          isPublic: true,
          reviewStatus: 'approved'
        }
      });

      if (!publicCharacter) {
        return res.status(404).json({ error: "Character not found or not approved" });
      }

      // Create a copy for the user
      const newCharacter = await prisma.character.create({
        data: {
          ...publicCharacter,
          id: undefined, // Let the database generate a new ID
          userId: req.user.id,
          isPublic: false,
          reviewStatus: 'private'
        }
      });

      res.json(newCharacter);
    } catch (error) {
      console.error("Error adding character to collection:", error);
      res.status(500).json({ error: "Failed to add character to collection" });
    }
  });

  // Get user's notifications
  app.get("/api/notifications", authMiddleware, async (req, res) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      // Verify the notification belongs to the user
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: req.user.id
        }
      });

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
      });

      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/read-all", authMiddleware, async (req, res) => {
    try {
      await prisma.notification.updateMany({
        where: {
          userId: req.user.id,
          read: false
        },
        data: { read: true }
      });

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", authMiddleware, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      // Verify the notification belongs to the user
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId: req.user.id
        }
      });

      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      await prisma.notification.delete({
        where: { id: notificationId }
      });

      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Create notification
  app.post("/api/notifications", authMiddleware, async (req, res) => {
    try {
      const { type, title, message, metadata } = req.body;
      
      const notification = await prisma.notification.create({
        data: {
          userId: req.user.id,
          type,
          title,
          message,
          metadata: metadata || {},
          read: false
        }
      });

      res.json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Submit character for review
  app.post("/api/characters/:id/submit", authMiddleware, async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      
      // Get the character
      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          userId: req.user.id
        }
      });

      if (!character) {
        return res.status(404).json({ error: "Character not found" });
      }

      // Create a pending submission
      const pendingCharacter = await prisma.pendingCharacter.create({
        data: {
          name: character.name,
          description: character.description,
          avatar: character.avatar,
          fullImage: character.fullImage,
          age: character.age,
          gender: character.gender,
          race: character.race,
          occupation: character.occupation,
          likes: character.likes,
          dislikes: character.dislikes,
          personality: character.personality,
          systemPrompt: character.systemPrompt,
          customInstructions: character.customInstructions,
          backstory: character.backstory,
          firstMessage: character.firstMessage,
          messageExample: character.messageExample,
          scenario: character.scenario,
          creatorNotes: character.creatorNotes,
          alternateGreetings: character.alternateGreetings,
          tags: character.tags,
          creator: character.creator,
          characterVersion: character.characterVersion,
          extensions: character.extensions,
          userId: character.userId,
          originalCharacterId: character.id,
          status: "pending"
        }
      });

      // Update the original character's review status
      await prisma.character.update({
        where: { id: characterId },
        data: { reviewStatus: "pending" }
      });

      res.json(pendingCharacter);
    } catch (error) {
      console.error("Error submitting character for review:", error);
      res.status(500).json({ error: "Failed to submit character for review" });
    }
  });

  // Reject all pending characters (SUPER_ADMIN only)
  app.post("/api/admin/characters/reject-all", authMiddleware, async (req, res) => {
    try {
      // Get the full user data to check role
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (!user || user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get all pending characters
      const pendingCharacters = await prisma.pendingCharacter.findMany({
        where: { status: "pending" }
      });

      // Update all pending characters to rejected
      await prisma.pendingCharacter.updateMany({
        where: { status: "pending" },
        data: { 
          status: "rejected",
          rejectionReason: "Bulk rejected by admin"
        }
      });

      // Update all original characters to rejected
      await prisma.character.updateMany({
        where: { 
          reviewStatus: "pending",
          id: { in: pendingCharacters.map(pc => pc.originalCharacterId).filter(Boolean) }
        },
        data: { reviewStatus: "rejected" }
      });

      // Create notifications for all users
      await Promise.all(pendingCharacters.map(pc => 
        prisma.notification.create({
          data: {
            userId: pc.userId,
            type: "CHARACTER_REJECTED",
            title: "Character Rejected",
            message: `Your character "${pc.name}" has been rejected.`,
            metadata: { characterId: pc.originalCharacterId }
          }
        })
      ));

      res.json({ message: "All pending characters rejected successfully" });
    } catch (error) {
      console.error("Error rejecting all characters:", error);
      res.status(500).json({ error: "Failed to reject all characters" });
    }
  });

  // Add email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    try {
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          verificationTokenExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null
        }
      });

      res.json({ success: true, message: "Email verified successfully" });
    } catch (err) {
      console.error("Email verification error:", err);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Start server
  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Test DB connection after server starts
  testDbConnection().catch(err => {
    console.error('Database connection test failed:', err);
    // Don't exit the process, just log the error
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed');
    });
    await prisma.$disconnect();
    process.exit(0);
  });

} catch (err) {
  console.error('Failed to start server:', err && err.stack ? err.stack : err);
  process.exit(1);
}
