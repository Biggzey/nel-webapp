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

// Wrap server startup in try-catch
try {
  const app = express();

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

  // Remove manual CORS headers since we're using the cors package
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });

  // Parse JSON bodies
  app.use(express.json());

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
    message: { error: "Too many attempts. Please wait 15 minutes before trying again." }
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 100 : 1000, // More lenient in development
    message: { error: "Too many API requests. Please try again later." }
  });

  // Apply rate limiting to specific endpoints
  app.use('/api/login', authLimiter);
  app.use('/api/signup', authLimiter);
  app.use('/api/', apiLimiter);

  // Remove CSRF protection for now
  // app.use(csrfProtection);

  // Serve static files in production with cache control
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(join(__dirname, "dist"), {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        // Cache HTML files for 1 hour
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
        // Cache other static assets for 1 year
        else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
  }

  // OpenAI client
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Global error handler
  app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    
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

  // — AUTH ROUTES —

  // Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

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
    const { email, username, password, confirmPassword } = req.body;
    
    // Check if all required fields are present
    if (!email || !username || !password || !confirmPassword) {
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
      // Check if username already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === email) {
          return res.status(400).json({ error: "Email already in use" });
        }
        return res.status(400).json({ error: "Username already taken" });
      }

      // Create user with their own Nelliel instance
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { 
          email, 
          username,
          passwordHash: hash,
          characters: {
            create: [{
              name: "Nelliel",
              personality: "Your custom AI companion.",
              avatar: "/nel-avatar.png",
              bookmarked: false,
              systemPrompt: "You are Nelliel, a helpful and friendly AI companion. You are knowledgeable, empathetic, and always eager to assist users with their questions and tasks.",
              customInstructions: "",
              status: "Ready to chat"
            }]
          }
        },
        include: {
          characters: true
        }
      });

      // Create user preferences with Nelliel as default character
      if (user.characters.length > 0) {
        await prisma.userPreference.create({
          data: {
            userId: user.id,
            selectedCharId: user.characters[0].id
          }
        });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ error: "Failed to create account" });
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
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ error: "Login identifier and password required" });
    }

    try {
      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { username: identifier }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
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
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      
      // Set cookie for additional security
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      res.json({ token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "An unexpected error occurred during login" });
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
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    res.json({ email: user.email, username: user.username });
  });

  // Update email
  app.put("/api/user", authMiddleware, async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    try {
      // Check if email is already in use by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          AND: [
            { email },
            { NOT: { id: req.user.id } }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: { email },
      });
      res.json({ email: updated.email });
    } catch (err) {
      console.error("Email update error:", err);
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  // Change password
  app.put("/api/user/password", authMiddleware, async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "All password fields are required" });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    // Validate password strength
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ 
        error: "New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number" 
      });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const valid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!valid) {
        return res.status(403).json({ error: "Current password is incorrect" });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: hash },
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Password change error:", err);
      res.status(500).json({ error: "Failed to change password" });
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
        where: { userId: req.user.id },
        orderBy: { createdAt: 'asc' }
      });
      res.json(characters);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  // Create a new character
  app.post("/api/characters", authMiddleware, async (req, res) => {
    try {
      const character = await prisma.character.create({
        data: {
          ...req.body,
          userId: req.user.id
        }
      });
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

      const character = await prisma.character.update({
        where: { id: characterId },
        data: req.body
      });
      res.json(character);
    } catch (error) {
      console.error("Error updating character:", error);
      res.status(500).json({ error: "Failed to update character" });
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
        where: { id: parseInt(userId) }
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
  app.get('/api/preferences', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      
      let preferences = await prisma.userPreference.findUnique({
        where: { userId }
      });

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await prisma.userPreference.create({
          data: {
            userId,
            selectedCharId: 1, // Default to first character
            chatTheme: 'default'
          }
        });
      }

      res.json(preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
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

  // Serve index.html for all other routes in production
  if (process.env.NODE_ENV === "production") {
    app.get("*", (req, res) => {
      res.sendFile(join(__dirname, "dist", "index.html"));
    });
  }

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

      // Delete all related data
      await prisma.$transaction([
        // Delete all chat messages for all user's characters
        prisma.chatMessage.deleteMany({
          where: {
            character: {
              userId: userId
            }
          }
        }),
        // Delete all characters
        prisma.character.deleteMany({
          where: {
            userId: userId
          }
        }),
        // Delete user preferences
        prisma.userPreference.deleteMany({
          where: {
            userId: userId
          }
        }),
        // Finally delete the user
        prisma.user.delete({
          where: {
            id: userId
          }
        })
      ]);

      res.json({ success: true });
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

  // Start server
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received. Closing HTTP server...');
    await prisma.$disconnect();
    process.exit(0);
  });

} catch (err) {
  console.error('Failed to start server:', err);
  process.exit(1);
}
