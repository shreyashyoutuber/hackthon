const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function importFromFile() {
  const filePath = path.join(__dirname, '..', 'temp_users.json');
  if (!fs.existsSync(filePath)) {
    console.error('temp_users.json not found at', filePath);
    console.error('Create a JSON file with temp users or run the import with a valid file.');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const db = JSON.parse(raw);
  const rows = [];
  for (const email of Object.keys(db)) {
    const u = db[email];
    rows.push({
      email,
      full_name: u.fullName || u.full_name || null,
      school_id: u.schoolId || u.school_id || null,
      user_type: u.userType || u.user_type || null,
      phone_number: u.phoneNumber || u.phone_number || null,
      code: u.code || null,
      verified: !!u.verified
    });
  }

  console.log('Importing', rows.length, 'temp users...');
  const { data, error } = await supabase.from('temp_users').upsert(rows);
  if (error) {
    console.error('Import failed:', error.message || error);
    process.exit(1);
  }
  console.log('Import complete.');
}

async function promoteVerified() {
  console.log('Fetching verified temp users...');
  const { data: verifiedRows, error: fetchError } = await supabase.from('temp_users').select('*').eq('verified', true);
  if (fetchError) {
    console.error('Failed to fetch verified temp users:', fetchError.message || fetchError);
    process.exit(1);
  }
  if (!verifiedRows || verifiedRows.length === 0) {
    console.log('No verified temp users to promote.');
    return;
  }

  const usersToUpsert = verifiedRows.map(r => ({
    email: r.email,
    password: null,
    full_name: r.full_name || null,
    user_type: r.user_type || null,
    school_id: r.school_id || null,
    phone_number: r.phone_number || null,
    grades: {},
    interview_report: '',
    approved: (r.user_type === 'student')
  }));

  console.log('Promoting', usersToUpsert.length, 'users into `users` table...');
  const { data: upserted, error: upsertError } = await supabase.from('users').upsert(usersToUpsert);
  if (upsertError) {
    console.error('Failed to upsert users:', upsertError.message || upsertError);
    process.exit(1);
  }

  const emails = verifiedRows.map(r => r.email);
  const { data: delData, error: delErr } = await supabase.from('temp_users').delete().in('email', emails);
  if (delErr) {
    console.error('Warning: failed to remove promoted temp users from temp_users:', delErr.message || delErr);
  } else {
    console.log('Removed promoted temp users from temp_users table.');
  }

  console.log('Promotion complete.');
}

async function main() {
  const mode = process.argv[2];
  if (!mode) {
    console.log('Usage: node migrate-temp-users.js <import|promote>');
    process.exit(0);
  }

  if (mode === 'import') {
    await importFromFile();
  } else if (mode === 'promote') {
    await promoteVerified();
  } else {
    console.log('Unknown mode:', mode);
    console.log('Usage: node migrate-temp-users.js <import|promote>');
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
