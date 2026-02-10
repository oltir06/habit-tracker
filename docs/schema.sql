-- Habit Tracker Database Schema
-- PostgreSQL 14+

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'build',
  frequency VARCHAR(50) DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index on type for filtering
CREATE INDEX IF NOT EXISTS idx_habits_type ON habits(type);

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_checkins_habit_id ON check_ins(habit_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON check_ins(date);
CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON check_ins(habit_id, date);

-- Comments
COMMENT ON TABLE habits IS 'Stores user habits to track';
COMMENT ON TABLE check_ins IS 'Records daily completions of habits';
COMMENT ON COLUMN habits.type IS 'Either "build" (good habit) or "break" (bad habit)';
COMMENT ON COLUMN habits.frequency IS 'How often the habit should be done (e.g., daily, weekly)';