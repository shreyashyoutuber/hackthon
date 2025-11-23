-- Create `temp_users` table for signup verification flow
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.temp_users (
  email text PRIMARY KEY,
  full_name text,
  school_id text,
  user_type text,
  phone_number text,
  code text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookup by verification status
CREATE INDEX IF NOT EXISTS idx_temp_users_verified ON public.temp_users (verified);
