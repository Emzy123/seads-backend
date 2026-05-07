-- Supabase migration: add Firebase and FCM support to users table
ALTER TABLE users ADD COLUMN firebase_uid TEXT UNIQUE;
ALTER TABLE users ADD COLUMN fcm_token TEXT;
