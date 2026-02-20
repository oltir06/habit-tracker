const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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
const { getAuthUrl, getGoogleUser } = require('../utils/googleOAuth');

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

// GET /auth/google - Initiate Google OAuth flow
router.get('/google', (req, res) => {
    try {
        const authUrl = getAuthUrl();

        // For API, return the URL (client will redirect)
        res.json({ authUrl });

    } catch (error) {
        logger.error('Google OAuth initiation error', { error: error.message });
        res.status(500).json({ error: 'Failed to initiate Google login' });
    }
});

// GET /auth/google/callback - Handle Google OAuth callback
router.get('/google/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
    }

    try {
        // Get user info from Google
        const googleUser = await getGoogleUser(code);

        // Check if user exists by google_id
        let userResult = await db.query(
            'SELECT id, email, name FROM users WHERE google_id = $1',
            [googleUser.googleId]
        );

        let user;

        if (userResult.rows.length > 0) {
            // Existing user - login
            user = userResult.rows[0];
            logger.info('Google user logged in', { userId: user.id, email: user.email });

        } else {
            // New user - check if email already exists
            const emailCheck = await db.query(
                'SELECT id FROM users WHERE email = $1',
                [googleUser.email]
            );

            if (emailCheck.rows.length > 0) {
                // Email exists but no google_id - link accounts
                await db.query(
                    'UPDATE users SET google_id = $1 WHERE email = $2',
                    [googleUser.googleId, googleUser.email]
                );

                user = emailCheck.rows[0];
                logger.info('Google account linked to existing user', {
                    userId: user.id,
                    email: googleUser.email
                });

            } else {
                // Create new user
                const result = await db.query(
                    'INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3) RETURNING id, email, name',
                    [googleUser.email, googleUser.name, googleUser.googleId]
                );

                user = result.rows[0];
                logger.info('New user created via Google OAuth', {
                    userId: user.id,
                    email: user.email
                });
            }
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();
        await saveRefreshToken(user.id, refreshToken);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            accessToken,
            refreshToken
        });

    } catch (error) {
        logger.error('Google OAuth callback error', { error: error.message });
        res.status(500).json({ error: 'Google authentication failed' });
    }
});

module.exports = router;
