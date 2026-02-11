const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const logger = require('../utils/logger');

// Validation rules
const registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().isLength({ min: 1 }).withMessage('Name is required')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Helper function to generate JWT token
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
};

// POST /auth/register - Register new user
router.post('/register', registerValidation, async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    try {
        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await db.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
            [email, passwordHash, name]
        );

        const user = result.rows[0];

        // Generate access token
        const accessToken = generateAccessToken(user.id);

        logger.info('User registered', { userId: user.id, email: user.email });

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                created_at: user.created_at
            },
            accessToken
        });

    } catch (error) {
        logger.error('Registration error', { error: error.message });
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /auth/login - Login user
router.post('/login', loginValidation, async (req, res) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // Find user by email
        const result = await db.query(
            'SELECT id, email, password_hash, name, created_at FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate access token
        const accessToken = generateAccessToken(user.id);

        logger.info('User logged in', { userId: user.id, email: user.email });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                created_at: user.created_at
            },
            accessToken
        });

    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /auth/me - Get current user (requires authentication - we'll add middleware Tuesday)
router.get('/me', async (req, res) => {
    // Placeholder for auth middleware
});

module.exports = router;
