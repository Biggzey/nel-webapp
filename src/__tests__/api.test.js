import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock PrismaClient
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  character: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  chatMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Create a test app
const app = express();
app.use(express.json());

// Mock routes
app.post('/api/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await mockPrisma.user.create({
      data: { email, username, password: hashedPassword },
    });
    const token = jwt.sign({ userId: user.id }, 'test-secret');
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await mockPrisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, 'test-secret');
    res.json({ token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

describe('Authentication Endpoints', () => {
  const testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'TestPassword123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/signup', () => {
    it('should create a new user', async () => {
      mockPrisma.user.create.mockResolvedValueOnce({
        id: 1,
        ...testUser,
        password: await bcrypt.hash(testUser.password, 10),
      });

      const response = await request(app)
        .post('/api/signup')
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should not allow duplicate email', async () => {
      mockPrisma.user.create.mockRejectedValueOnce(new Error('Duplicate email'));

      const response = await request(app)
        .post('/api/signup')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/login', () => {
    it('should authenticate a valid user', async () => {
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 1,
        ...testUser,
        password: hashedPassword,
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 