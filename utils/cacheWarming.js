const cache = require('./cache');
const db = require('../db/db');
const { calculateStreak } = require('./streak');
const logger = require('./logger');

/**
 * Warm cache for a specific user
 * Pre-loads habits list and streak data
 */
const warmUserCache = async (userId) => {
    try {
        logger.info('Warming cache for user', { userId });

        // Warm habits list
        const habitsResult = await db.query(
            'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        await cache.set(`user:${userId}:habits`, habitsResult.rows, 300);

        // Warm streak data for each habit
        for (const habit of habitsResult.rows) {
            const checkInsResult = await db.query(
                "SELECT to_char(date, 'YYYY-MM-DD') as date FROM check_ins WHERE habit_id = $1 ORDER BY date DESC",
                [habit.id]
            );

            const streakInfo = calculateStreak(checkInsResult.rows);
            await cache.set(
                `streak:user:${userId}:habit:${habit.id}`,
                { habitId: habit.id, ...streakInfo },
                300
            );
        }

        logger.info('Cache warmed successfully', { userId, habitCount: habitsResult.rows.length });
        return true;
    } catch (error) {
        logger.error('Cache warming error', { userId, error: error.message });
        return false;
    }
};

/**
 * Warm cache for all recently active users
 * Finds users with check-ins in the last 24 hours
 */
const warmAllActiveUsersCache = async () => {
    try {
        const activeUsers = await db.query(`
      SELECT DISTINCT h.user_id 
      FROM habits h
      INNER JOIN check_ins ci ON h.id = ci.habit_id
      WHERE ci.created_at > NOW() - INTERVAL '24 hours'
    `);

        logger.info('Warming cache for active users', { count: activeUsers.rows.length });

        for (const { user_id } of activeUsers.rows) {
            await warmUserCache(user_id);
        }

        return activeUsers.rows.length;
    } catch (error) {
        logger.error('Bulk cache warming error', { error: error.message });
        return 0;
    }
};

module.exports = {
    warmUserCache,
    warmAllActiveUsersCache
};
