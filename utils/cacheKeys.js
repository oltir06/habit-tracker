/**
 * Cache key generator
 * Centralized key naming for consistency
 */

const PREFIXES = {
    USER: 'user',
    HABIT: 'habit',
    CHECKIN: 'checkin',
    STREAK: 'streak',
    STATS: 'stats',
    SESSION: 'session'
};

/**
 * Generate cache keys with consistent naming
 */
const keys = {
    // User keys
    userHabits: (userId) => `${PREFIXES.USER}:${userId}:habits`,
    userHabitsStats: (userId) => `${PREFIXES.USER}:${userId}:habits:stats`,
    userProfile: (userId) => `${PREFIXES.USER}:${userId}:profile`,

    // Habit keys
    habitDetails: (userId, habitId) => `${PREFIXES.HABIT}:${habitId}:user:${userId}`,
    habitStats: (userId, habitId) => `${PREFIXES.STATS}:user:${userId}:habit:${habitId}`,
    habitStreak: (userId, habitId) => `${PREFIXES.STREAK}:user:${userId}:habit:${habitId}`,
    habitCheckins: (userId, habitId) => `${PREFIXES.CHECKIN}:user:${userId}:habit:${habitId}`,

    // Pattern matchers for deletion
    allUserKeys: (userId) => `*:user:${userId}:*`,
    allHabitKeys: (userId, habitId) => `*:user:${userId}:habit:${habitId}*`
};

module.exports = keys;
