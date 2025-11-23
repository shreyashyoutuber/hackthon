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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
	auth: { persistSession: false }
});

async function seed() {
	const dbPath = path.join(__dirname, '..', 'database.json');
	if (!fs.existsSync(dbPath)) {
		console.error('database.json not found at', dbPath);
		process.exit(1);
	}

	const raw = fs.readFileSync(dbPath, 'utf8');
	const db = JSON.parse(raw);

	for (const email of Object.keys(db)) {
		const user = db[email];

		// Map local JSON keys to Supabase column names (snake_case)
		const record = {
			email,
			password: user.password || null,
			full_name: user.fullName || null,
			user_type: user.userType || null,
			school_id: user.schoolId || null,
			phone_number: user.phoneNumber || null,
			grades: user.grades || null,
			interview_report: user.interviewReport || '',
			approved: user.approved === true
		};

		try {
			const { data, error } = await supabase.from('users').upsert([record]);
			if (error) {
				console.error('Failed to upsert', email, error.message || error);
			} else {
				console.log('Upserted', email);
			}
		} catch (err) {
			console.error('Error upserting', email, err.message || err);
		}
	}

	console.log('Seeding complete');
	process.exit(0);
}

seed().catch((err) => {
	console.error('Seeder failed:', err);
	process.exit(1);
});
