-- Add email column to users table for email/password authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Make phone column optional (nullable)
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
