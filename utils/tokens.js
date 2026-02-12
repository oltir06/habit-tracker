const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/db');
const logger = require('./logger');

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token (long-lived, random string)
 */
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Save refresh token to database
 */
const saveRefreshToken = async (userId, token) => {
  try {
    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    const daysToExpire = parseInt(process.env.JWT_REFRESH_EXPIRES_IN?.replace('d', '')) || 7;
    expiresAt.setDate(expiresAt.getDate() + daysToExpire);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    return true;
  } catch (error) {
    logger.error('Failed to save refresh token', { error: error.message });
    return false;
  }
};

/**
 * Verify refresh token exists and is valid
 */
const verifyRefreshToken = async (token) => {
  try {
    const result = await db.query(
      'SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid refresh token' };
    }

    const { user_id, expires_at } = result.rows[0];

    // Check if expired
    if (new Date(expires_at) < new Date()) {
      // Delete expired token
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
      return { valid: false, error: 'Refresh token expired' };
    }

    return { valid: true, userId: user_id };

  } catch (error) {
    logger.error('Failed to verify refresh token', { error: error.message });
    return { valid: false, error: 'Token verification failed' };
  }
};

/**
 * Revoke refresh token (logout)
 */
const revokeRefreshToken = async (token) => {
  try {
    const result = await db.query(
      'DELETE FROM refresh_tokens WHERE token = $1 RETURNING id',
      [token]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Failed to revoke refresh token', { error: error.message });
    return false;
  }
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
const revokeAllUserTokens = async (userId) => {
  try {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    return true;
  } catch (error) {
    logger.error('Failed to revoke all user tokens', { error: error.message });
    return false;
  }
};

/**
 * Clean up expired tokens (run periodically)
 */
const cleanupExpiredTokens = async () => {
  try {
    const result = await db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING id'
    );
    
    if (result.rows.length > 0) {
      logger.info('Cleaned up expired tokens', { count: result.rows.length });
    }
    
    return result.rows.length;
  } catch (error) {
    logger.error('Failed to cleanup expired tokens', { error: error.message });
    return 0;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens
};
