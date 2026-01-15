#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');

// Get the target directory from npm init
const initCwd = process.env.INIT_CWD || process.cwd();

// Parse command line arguments
// argv[0] = node, argv[1] = script path, argv[2+] = user args
const args = process.argv.slice(2);
let defaultProjectName = 'node-app';
let baseDir = initCwd;
let useCurrentDir = false;

// Check if first arg is "." (use current directory)
if (args[0] === '.') {
  useCurrentDir = true;
  baseDir = process.cwd();
  defaultProjectName = args[1] || path.basename(baseDir) || 'node-app';
} else if (args[0]) {
  // First arg is project name
  defaultProjectName = args[0];
  // Second arg could be path
  if (args[1]) {
    if (args[1] === '.') {
      useCurrentDir = true;
      baseDir = process.cwd();
    } else {
      baseDir = path.resolve(initCwd, args[1]);
    }
  }
}

async function init() {
  console.log('\nInitializing Node.js application...\n');

  // Prompt for project details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultProjectName,
      validate: (input) => {
        if (!input.trim()) {
          return 'Project name cannot be empty';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: 'A Node.js application'
    },
    {
      type: 'input',
      name: 'version',
      message: 'Version:',
      default: '1.0.0'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author:',
      default: ''
    },
    {
      type: 'input',
      name: 'license',
      message: 'License:',
      default: 'ISC'
    },
    {
      type: 'list',
      name: 'database',
      message: 'Database:',
      choices: [
        { name: 'None', value: 'none' },
        { name: 'MongoDB', value: 'mongodb' },
        { name: 'PostgreSQL', value: 'postgresql' },
        { name: 'MySQL', value: 'mysql' },
        { name: 'SQLite', value: 'sqlite' }
      ],
      default: 'none'
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['npm', 'yarn', 'pnpm'],
      default: 'npm'
    },
    {
      type: 'confirm',
      name: 'installDeps',
      message: 'Install dependencies?',
      default: true
    }
  ]);

  const { projectName: name, description, version, author, license, database, packageManager, installDeps } = answers;
  
  // Determine project directory
  // If useCurrentDir is true (user passed "."), use baseDir directly
  // Otherwise, create a folder with the project name in baseDir
  const projectDir = useCurrentDir ? baseDir : path.join(baseDir, name);
  await fs.ensureDir(projectDir);

  // Create directory structure similar to vuebot-api
  const configsDir = path.join(projectDir, 'configs');
  const controllersDir = path.join(projectDir, 'controllers');
  const middlewaresDir = path.join(projectDir, 'middlewares');
  const modelsDir = path.join(projectDir, 'models');
  const routesDir = path.join(projectDir, 'routes');
  const scriptsDir = path.join(projectDir, 'scripts');
  const utilsDir = path.join(projectDir, 'utils');
  const uploadsDir = path.join(projectDir, 'uploads');

  await fs.ensureDir(configsDir);
  await fs.ensureDir(controllersDir);
  await fs.ensureDir(middlewaresDir);
  await fs.ensureDir(modelsDir);
  await fs.ensureDir(routesDir);
  await fs.ensureDir(scriptsDir);
  await fs.ensureDir(utilsDir);
  await fs.ensureDir(uploadsDir);

  // Create package.json with database-specific dependencies
  const baseDependencies = {
    'dotenv': '^16.0.0',
    'express': '^4.18.0',
    'cors': '^2.8.5',
    'bcrypt': '^5.1.0',
    'jsonwebtoken': '^9.0.0',
    'cookie-parser': '^1.4.6',
    '@vuedapt/logger': '^1.0.0'
  };

  const databaseDependencies = {
    'mongodb': { 'mongoose': '^8.0.0' },
    'postgresql': { 'pg': '^8.11.0' },
    'mysql': { 'mysql2': '^3.6.0' },
    'sqlite': { 'better-sqlite3': '^9.0.0' },
    'none': {}
  };

  const packageJson = {
    name: name.toLowerCase().replace(/\s+/g, '-'),
    version,
    description,
    main: 'index.js',
    type: 'module',
    scripts: {
      start: 'node index.js',
      dev: 'nodemon index.js',
      'seed:user': 'node scripts/seed-user.js',
      test: 'echo "Error: no test specified" && exit 1'
    },
    keywords: [],
    author: author || '',
    license,
    dependencies: {
      ...baseDependencies,
      ...databaseDependencies[database]
    },
    devDependencies: {
      'nodemon': '^2.0.0'
    }
  };

  try {
    await fs.writeJson(path.join(projectDir, 'package.json'), packageJson, { spaces: 2 });
  } catch (error) {
    throw new Error(`Failed to create package.json: ${error.message}`);
  }

  // Create index.js (main entry point)
  const dbImport = database !== 'none' ? `import connectToDatabase from './configs/database.js';` : '';
  const dbConnection = database !== 'none' ? `\n  // Connect to database\n  const DB_URI = process.env.${database === 'mongodb' ? 'MONGODB_URI' : database === 'postgresql' ? 'DATABASE_URL' : database === 'mysql' ? 'DB_CONNECTION_STRING' : 'DB_PATH'};\n  if (DB_URI) {\n    await connectToDatabase(DB_URI);\n  }` : '';
  
  const indexJs = `// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';

const result = dotenv.config();

if (result.error) {
  console.warn('Warning: Error loading .env:', result.error.message);
} else {
  console.log('Loaded environment variables from .env');
}

// Now import other modules
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import logger from '@vuedapt/logger';
${dbImport}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging middleware
app.use(logger.middleware());

// Routes
import authRoutes from './routes/auth.route.js';
app.use('/api/auth', authRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, async () => {
  logger.info(\`Server is running on port \${PORT}\`);
  logger.info(\`Running in \${process.env.NODE_ENV || 'development'} environment\`);${dbConnection}
});
`;

  await fs.writeFile(path.join(projectDir, 'index.js'), indexJs);

  // Create configs/database.js based on selected database
  let databaseJs = '';
  
  if (database === 'mongodb') {
    databaseJs = `// MongoDB configuration

import mongoose from 'mongoose';
import logger from '@vuedapt/logger';

const connectToDatabase = async (MONGODB_URI) => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB database successfully.');
  } catch (error) {
    logger.error('Failed to connect to MongoDB database:', error);
    process.exit(1);
  }
};

export default connectToDatabase;
`;
  } else if (database === 'postgresql') {
    databaseJs = `// PostgreSQL configuration

import pkg from 'pg';
const { Pool } = pkg;
import logger from '@vuedapt/logger';

let pool;

const connectToDatabase = async (connectionString) => {
  try {
    pool = new Pool({
      connectionString: connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Connected to PostgreSQL database successfully.');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    process.exit(1);
  }
};

export { pool };
export default connectToDatabase;
`;
  } else if (database === 'mysql') {
    databaseJs = `// MySQL configuration

import mysql from 'mysql2/promise';
import logger from '@vuedapt/logger';

let connection;

const connectToDatabase = async (connectionConfig) => {
  try {
    connection = await mysql.createConnection({
      host: connectionConfig.host || process.env.DB_HOST,
      user: connectionConfig.user || process.env.DB_USER,
      password: connectionConfig.password || process.env.DB_PASSWORD,
      database: connectionConfig.database || process.env.DB_NAME,
    });
    
    logger.info('Connected to MySQL database successfully.');
  } catch (error) {
    logger.error('Failed to connect to MySQL database:', error);
    process.exit(1);
  }
};

export { connection };
export default connectToDatabase;
`;
  } else if (database === 'sqlite') {
    databaseJs = `// SQLite configuration

import Database from 'better-sqlite3';
import logger from '@vuedapt/logger';

let db;

const connectToDatabase = async (dbPath) => {
  try {
    db = new Database(dbPath || process.env.DB_PATH || './database.sqlite');
    logger.info('Connected to SQLite database successfully.');
  } catch (error) {
    logger.error('Failed to connect to SQLite database:', error);
    process.exit(1);
  }
};

export { db };
export default connectToDatabase;
`;
  } else {
    databaseJs = `// Database configuration

import logger from '@vuedapt/logger';

// No database selected
// Add your database connection logic here when ready

const connectToDatabase = async (connectionString) => {
  try {
    // Add your database connection logic here
    logger.info('Database connection not configured.');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
};

export default connectToDatabase;
`;
  }

  await fs.writeFile(path.join(configsDir, 'database.js'), databaseJs);

  // Create controllers/auth.controller.js
  const authControllerJs = `// Authentication controller

import User from '../models/user.model.js';
import { generateUserToken } from '../utils/jwt.js';
import logger from '@vuedapt/logger';

/**
 * User registration
 */
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name: name || email.split('@')[0]
    });

    // Generate JWT token
    const token = generateUserToken(user.id, user.email);

    // Set token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };

    res.cookie('token', token, cookieOptions);

    logger.info(\`User registered successfully: \${user.email}\`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
};

/**
 * User login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateUserToken(user.id, user.email);

    // Set token in HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };

    res.cookie('token', token, cookieOptions);

    logger.info(\`User logged in successfully: \${user.email}\`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
};

/**
 * User logout
 */
export const logout = async (req, res) => {
  try {
    res.clearCookie('token', { path: '/' });
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Logout failed'
    });
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get user'
    });
  }
};
`;

  await fs.writeFile(path.join(controllersDir, 'auth.controller.js'), authControllerJs);

  // Create middlewares/auth.middleware.js
  const authMiddlewareJs = `// Authentication middleware

import { verifyToken } from '../utils/jwt.js';
import logger from '@vuedapt/logger';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Try to get token from cookie first, then fall back to Authorization header
    let token = req.cookies?.token;

    // Fallback to Authorization header if no cookie
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing'
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};
`;

  await fs.writeFile(path.join(middlewaresDir, 'auth.middleware.js'), authMiddlewareJs);

  // Create models/user.model.js based on selected database
  let userModelJs = '';
  
  if (database === 'mongodb') {
    userModelJs = `// User Mongoose model

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email
userSchema.statics.findByEmail = async function(email) {
  return await this.findOne({ email: email.toLowerCase() });
};

export default mongoose.model('User', userSchema);
`;
  } else if (database === 'postgresql') {
    userModelJs = `// User PostgreSQL model
// Using pg library - you can also use an ORM like Sequelize or TypeORM

import { pool } from '../configs/database.js';
import bcrypt from 'bcrypt';

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.createdAt = data.created_at;
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email.toLowerCase()]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const query = 'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [data.email.toLowerCase(), hashedPassword, data.name]);
    return new User(result.rows[0]);
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}

export default User;
`;
  } else if (database === 'mysql') {
    userModelJs = `// User MySQL model
// Using mysql2 library - you can also use an ORM like Sequelize or TypeORM

import { connection } from '../configs/database.js';
import bcrypt from 'bcrypt';

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.createdAt = data.created_at;
  }

  static async findById(id) {
    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] ? new User(rows[0]) : null;
  }

  static async findByEmail(email) {
    const [rows] = await connection.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    return rows[0] ? new User(rows[0]) : null;
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [result] = await connection.execute(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [data.email.toLowerCase(), hashedPassword, data.name]
    );
    return await this.findById(result.insertId);
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}

export default User;
`;
  } else if (database === 'sqlite') {
    userModelJs = `// User SQLite model
// Using better-sqlite3 library

import { db } from '../configs/database.js';
import bcrypt from 'bcrypt';

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.createdAt = data.created_at;
  }

  static findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id);
    return row ? new User(row) : null;
  }

  static findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email.toLowerCase());
    return row ? new User(row) : null;
  }

  static async create(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const stmt = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)');
    const result = stmt.run(data.email.toLowerCase(), hashedPassword, data.name);
    return await this.findById(result.lastInsertRowid);
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}

export default User;
`;
  } else {
    userModelJs = `// User model

// No database selected
// Add your database model here when ready
import bcrypt from 'bcrypt';

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.createdAt = data.createdAt;
  }

  static async findById(id) {
    // Your find logic here
    return null;
  }

  static async findByEmail(email) {
    // Your find logic here
    return null;
  }

  static async create(data) {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // Your create logic here
    return null;
  }

  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
}

export default User;
`;
  }

  await fs.writeFile(path.join(modelsDir, 'user.model.js'), userModelJs);

  // Create routes/auth.route.js
  const authRouteJs = `// Authentication routes

import express from 'express';
const router = express.Router();
import { register, login, logout, getCurrentUser } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
`;

  await fs.writeFile(path.join(routesDir, 'auth.route.js'), authRouteJs);


  // Create utils/jwt.js
  const jwtJs = `// JWT utility

import jwt from 'jsonwebtoken';
import logger from '@vuedapt/logger';

// Lazy getter for JWT_SECRET - checks when functions are called, not at module load
const getJWTSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Please set JWT_SECRET in your environment variables.');
  }
  return secret;
};

const getJWTExpiresIn = () => {
  return process.env.JWT_EXPIRES_IN || '7d';
};

/**
 * Generate JWT token for user
 */
export const generateUserToken = (userId, email) => {
  try {
    const payload = {
      id: userId,
      email: email,
      role: 'user'
    };

    const token = jwt.sign(payload, getJWTSecret(), {
      expiresIn: getJWTExpiresIn()
    });

    return token;
  } catch (error) {
    logger.error('Error generating token:', error);
    throw error;
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, getJWTSecret());
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};
`;

  await fs.writeFile(path.join(utilsDir, 'jwt.js'), jwtJs);

  // Create scripts/seed-user.js
  let seedUserJs = '';
  
  if (database !== 'none') {
    const dbConnectionCode = database === 'mongodb' 
      ? `const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      logger.error('MONGODB_URI is not set in .env file');
      process.exit(1);
    }
    await connectToDatabase(MONGODB_URI);`
      : database === 'postgresql'
      ? `const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      logger.error('DATABASE_URL is not set in .env file');
      process.exit(1);
    }
    await connectToDatabase(DATABASE_URL);`
      : database === 'mysql'
      ? `await connectToDatabase({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });`
      : `const DB_PATH = process.env.DB_PATH || './database.sqlite';
    await connectToDatabase(DB_PATH);`;

    seedUserJs = `// Seed user script
// Run with: npm run seed:user

import dotenv from 'dotenv';
dotenv.config();

import User from '../models/user.model.js';
import connectToDatabase from '../configs/database.js';
import logger from '@vuedapt/logger';

const seedUser = async () => {
  try {
    // Connect to database
    ${dbConnectionCode}

    // Check if user already exists
    const existingUser = await User.findByEmail('admin@example.com');
    if (existingUser) {
      logger.info('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User'
    });

    logger.info('Admin user created successfully:');
    logger.info('Email: ' + adminUser.email);
    logger.info('Password: admin123');
    logger.info('Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding user:', error);
    process.exit(1);
  }
};

seedUser();
`;

    await fs.writeFile(path.join(scriptsDir, 'seed-user.js'), seedUserJs);
  }

  // Create .gitkeep for uploads directory
  await fs.writeFile(path.join(uploadsDir, '.gitkeep'), '');

  // Create README.md
  const readme = `# ${name}

${description}

## Project Structure

\`\`\`
${name}/
├── configs/               # Configuration files
│   └── database.js
├── controllers/            # Request handlers
│   └── auth.controller.js
├── middlewares/           # Express middlewares
│   └── auth.middleware.js
├── models/                # Data models
│   └── user.model.js
├── routes/                # Route definitions
│   └── auth.route.js
├── scripts/               # Utility scripts
├── uploads/               # Upload directory
├── utils/                 # Utility functions
│   └── jwt.js
├── .env.example           # Environment variables example
├── .gitignore
├── index.js               # Entry point
├── package.json
└── README.md
\`\`\`

## Installation

\`\`\`bash
${packageManager === 'npm' ? 'npm install' : packageManager === 'yarn' ? 'yarn install' : 'pnpm install'}
\`\`\`

## Usage

\`\`\`bash
${packageManager === 'npm' ? 'npm start' : packageManager === 'yarn' ? 'yarn start' : 'pnpm start'}
\`\`\`

## Development

\`\`\`bash
${packageManager === 'npm' ? 'npm run dev' : packageManager === 'yarn' ? 'yarn dev' : 'pnpm dev'}
\`\`\`

## Seeding Data

Seed an admin user to get started:

\`\`\`bash
${packageManager === 'npm' ? 'npm run seed:user' : packageManager === 'yarn' ? 'yarn seed:user' : 'pnpm seed:user'}
\`\`\`

This will create an admin user with:
- Email: admin@example.com
- Password: admin123

**Important:** Change the password after first login!

## Configuration

Copy \`.env.example\` to \`.env\` and update with your configuration values.

## Project Structure Overview

- **configs/**: Database and application configuration files
- **controllers/**: Handle HTTP requests and responses
- **middlewares/**: Express middleware functions
- **models/**: Data models (database schemas)
- **routes/**: API route definitions
- **scripts/**: Utility and setup scripts
- **uploads/**: File upload storage
- **utils/**: Helper functions and utilities
`;

  await fs.writeFile(path.join(projectDir, 'README.md'), readme);

  // Create .gitignore
  const gitignore = `# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Build outputs
dist/
build/
*.tsbuildinfo

# Uploads
uploads/*
!uploads/.gitkeep
`;

  await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);

  // Create .env.example with database-specific variables
  let envExample = `# Environment variables
# Copy this file to .env and update with your values

NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d
`;

  if (database === 'mongodb') {
    envExample += `\n# MongoDB
MONGODB_URI=mongodb://localhost:27017/${name.toLowerCase().replace(/\s+/g, '-')}
`;
  } else if (database === 'postgresql') {
    envExample += `\n# PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/${name.toLowerCase().replace(/\s+/g, '-')}
`;
  } else if (database === 'mysql') {
    envExample += `\n# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=${name.toLowerCase().replace(/\s+/g, '-')}
DB_CONNECTION_STRING=mysql://root:password@localhost:3306/${name.toLowerCase().replace(/\s+/g, '-')}
`;
  } else if (database === 'sqlite') {
    envExample += `\n# SQLite
DB_PATH=./database.sqlite
`;
  }

  await fs.writeFile(path.join(projectDir, '.env.example'), envExample);

  console.log('\nProject initialized successfully!');
  console.log(`Project created at: ${projectDir}\n`);

  // Install dependencies if requested
  if (installDeps) {
    console.log('Installing dependencies...\n');
    try {
      const installCmd = packageManager === 'npm' ? 'npm install' : 
                        packageManager === 'yarn' ? 'yarn install' : 
                        'pnpm install';
      execSync(installCmd, { 
        cwd: projectDir, 
        stdio: 'inherit' 
      });
      console.log('\nDependencies installed!\n');
    } catch (error) {
      console.error('\nError installing dependencies:', error.message);
      console.log('You can install them manually later.\n');
    }
  }

  console.log('Your Node.js application is ready!\n');
  console.log('Next steps:');
  if (!useCurrentDir) {
    console.log(`  cd ${name}`);
  }
  if (!installDeps) {
    console.log(`  ${packageManager} install`);
  }
  console.log(`  ${packageManager} start\n`);
}

// Handle errors
init().catch((error) => {
  console.error('Error initializing project:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});
