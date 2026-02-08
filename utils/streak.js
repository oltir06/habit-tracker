/**
 * Calculate streak info from check-in data
 * @param {Array} habitCheckIns - Array of check-in objects with date property
 * @returns {Object} - { currentStreak, longestStreak }
 */
const calculateStreak = (habitCheckIns) => {
    if (!habitCheckIns || habitCheckIns.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    const today = new Date().toISOString().split('T')[0];
    let currentStreak = 0;
    let checkDate = new Date(today);

    // Calculate current streak
    const todayCheckIn = habitCheckIns.find(c => c.date === today);

    if (todayCheckIn) {
        currentStreak = 1;
        checkDate.setDate(checkDate.getDate() - 1); // Move to yesterday

        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const hasCheckIn = habitCheckIns.find(c => c.date === dateStr);

            if (hasCheckIn) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let currentRun = 0;

    const sortedCheckIns = [...habitCheckIns].sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedCheckIns.length > 0) {
        currentRun = 1;
        longestStreak = 1;

        for (let i = 1; i < sortedCheckIns.length; i++) {
            const prevDate = new Date(sortedCheckIns[i - 1].date);
            const currDate = new Date(sortedCheckIns[i].date);

            const diffTime = Math.abs(currDate - prevDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                currentRun++;
            } else if (diffDays > 1) {
                currentRun = 1;
            }

            longestStreak = Math.max(longestStreak, currentRun);
        }
    }

    return { currentStreak, longestStreak };
};

module.exports = { calculateStreak };
