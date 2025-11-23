# Supabase: Create `users` table

Steps to create the `users` table and import data for this project.

1) Open your Supabase project dashboard.
2) Go to **SQL Editor** → **New query**.
3) Copy the contents of `create_users_table.sql` and run the query.

Notes:
- The table uses `email` as the primary key.
- `grades` is stored as `jsonb` so your existing JSON structure in `database.json` will map directly.

Importing data options
- Option A (recommended for small data): Use the seed script included in this repo.
  - Ensure `my-backend/.env` contains `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (service_role key).
  - From `my-backend` folder run:
    ```cmd
    npm install
    npm run seed
    ```

- Option B: Use Supabase SQL import/CSV upload in the dashboard for larger datasets.

Security
- Keep the **service_role** key private. Do NOT add it as a public environment variable.
- For client-side access use only the anon key (expose as `NEXT_PUBLIC_SUPABASE_ANON_KEY` if your app requires it).
