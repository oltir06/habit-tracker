/**
 * Cache TTL (Time To Live) configuration
 * Different data types get different cache durations
 */

const TTL = {
    // Frequently changing data - shorter TTL
    HABITS_LIST: 300,        // 5 minutes
    HABIT_SINGLE: 600,       // 10 minutes

    // Analytics data - medium TTL
    STATS: 300,              // 5 minutes
    STREAK: 300,             // 5 minutes
    CHECKINS: 600,           // 10 minutes

    // Rarely changing data - longer TTL
    USER_PROFILE: 1800,      // 30 minutes

    // Real-time data - very short TTL
    HEALTH_CHECK: 30,        // 30 seconds

    // System data - long TTL
    SYSTEM_CONFIG: 3600      // 1 hour
};

/**
 * Get TTL for a cache key type
 * @param {string} keyType - One of the TTL constant names
 * @returns {number} TTL in seconds
 */
const getTTL = (keyType) => {
    return TTL[keyType] || 300; // Default 5 minutes
};

/**
 * Calculate dynamic TTL based on data characteristics
 * More records = longer cache (less frequent individual updates)
 * Fewer records = shorter cache (user likely still setting up)
 */
const calculateDynamicTTL = (dataType, recordCount) => {
    if (dataType === 'habits' && recordCount > 10) {
        return 600; // 10 minutes for users with many habits
    }

    if (dataType === 'habits' && recordCount < 5) {
        return 180; // 3 minutes for users with few habits
    }

    return getTTL('HABITS_LIST');
};

module.exports = {
    TTL,
    getTTL,
    calculateDynamicTTL
};
