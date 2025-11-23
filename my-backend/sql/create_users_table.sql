-- Create `users` table for Supabase/Postgres
-- Run this in the Supabase SQL editor (or with psql) to create the table

CREATE TABLE IF NOT EXISTS public.users (
  email text PRIMARY KEY,
  password text,
  full_name text,
  user_type text,
  school_id text,
  phone_number text,
  grades jsonb,
  interview_report text,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Example upsert (insert or update) by email
-- Replace the JSON/values as needed and run in SQL editor
--
-- INSERT INTO public.users (email, password, full_name, user_type, school_id, phone_number, grades, interview_report, approved)
-- VALUES (
--   'student@example.com',
--   'password123',
--   'Student Name',
--   'student',
--   '2400030189',
--   '0123456789',
--   '{"math": {"score": "88%", "grade": "B+"}}'::jsonb,
--   'Good student',
--   true
-- )
-- ON CONFLICT (email) DO UPDATE SET
--   password = EXCLUDED.password,
--   full_name = EXCLUDED.full_name,
--   user_type = EXCLUDED.user_type,
--   school_id = EXCLUDED.school_id,
--   phone_number = EXCLUDED.phone_number,
--   grades = EXCLUDED.grades,
--   interview_report = EXCLUDED.interview_report,
--   approved = EXCLUDED.approved,
--   updated_at = now();
