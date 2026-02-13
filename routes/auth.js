const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const db = require('../db/db');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const {
    generateAccessToken,
    generateRefreshToken,
    saveRefreshToken,
    verifyRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens
} = require('../utils/tokens');

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

// POST /auth/register - Register new user
router.post('/register', registerValidation, async (req, res) => {
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

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();

        // Save refresh token
        await saveRefreshToken(user.id, refreshToken);

        logger.info('User registered', { userId: user.id, email: user.email });

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                created_at: user.created_at
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error('Registration error', { error: error.message });
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /auth/login - Login user
router.post('/login', loginValidation, async (req, res) => {
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

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();

        // Save refresh token
        await saveRefreshToken(user.id, refreshToken);

        logger.info('User logged in', { userId: user.id, email: user.email });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                created_at: user.created_at
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
        // Verify refresh token
        const verification = await verifyRefreshToken(refreshToken);

        if (!verification.valid) {
            return res.status(401).json({ error: verification.error });
        }

        // Generate new access token
        const accessToken = generateAccessToken(verification.userId);

        logger.info('Token refreshed', { userId: verification.userId });

        res.json({ accessToken });

    } catch (error) {
        logger.error('Token refresh error', { error: error.message });
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// POST /auth/logout - Logout (revoke refresh token)
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    try {
        const revoked = await revokeRefreshToken(refreshToken);

        if (!revoked) {
            return res.status(404).json({ error: 'Token not found' });
        }

        logger.info('User logged out');

        res.json({ message: 'Logged out successfully' });

    } catch (error) {
        logger.error('Logout error', { error: error.message });
        res.status(500).json({ error: 'Logout failed' });
    }
});

// POST /auth/logout-all - Logout from all devices
router.post('/logout-all', authenticate, async (req, res) => {
    try {
        await revokeAllUserTokens(req.userId);

        logger.info('User logged out from all devices', { userId: req.userId });

        res.json({ message: 'Logged out from all devices successfully' });

    } catch (error) {
        logger.error('Logout all error', { error: error.message });
        res.status(500).json({ error: 'Logout failed' });
    }
});

// GET /auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, name, created_at FROM users WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        logger.error('Get user error', { error: error.message });
        res.status(500).json({ error: 'Failed to get user' });
    }
});

module.exports = router;
