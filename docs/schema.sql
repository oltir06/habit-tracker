-- Habit Tracker Database Schema
-- PostgreSQL 14+

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Refresh Tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'build',
  frequency VARCHAR(50) DEFAULT 'daily',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index on type and user for filtering
CREATE INDEX IF NOT EXISTS idx_habits_type ON habits(type);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

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
COMMENT ON TABLE users IS 'Stores registered users for authentication';
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for active sessions';
COMMENT ON TABLE habits IS 'Stores user habits to track';
COMMENT ON TABLE check_ins IS 'Records daily completions of habits';
COMMENT ON COLUMN habits.type IS 'Either "build" (good habit) or "break" (bad habit)';
COMMENT ON COLUMN habits.frequency IS 'How often the habit should be done (e.g., daily, weekly)';