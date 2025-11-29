// // Load local .env for local development (Vercel will provide envs in production)
// require('dotenv').config({ path: __dirname + '/.env' });



// // 1. Import the tools
// const express = require('express');
// const cors = require('cors');
// const nodemailer = require('nodemailer');
// const fs = require('fs');
// const path = require('path'); 

// // 2. Create the app
// const app = express();

// // --- CONFIGURATION ---
// const ADMIN_EMAIL = 'shreyashmahagaon@gmail.com'; 
// const WEBSITE_URL = 'https://eduwise-six.vercel.app'; // <-- Use your live URL

// // ROLE_EXEMPT: comma-separated env var (server-only). Always include ADMIN_EMAIL
// // and a fallback 'shreyashmahagaon@gmail.com' so those accounts can access both portals.
// const ROLE_EXEMPT = (() => {
// 	try {
// 		const raw = (process.env.ROLE_EXEMPT || '');
// 		const fromEnv = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
// 		const set = new Set(fromEnv);
// 		if (ADMIN_EMAIL) set.add(ADMIN_EMAIL.toLowerCase());
// 		// ensure these two accounts are always exempt from portal restrictions
// 		set.add('shreyashmahagaon@gmail.com');
// 		set.add('admin@test.com');
// 		return Array.from(set);
// 	} catch (e) {
// 		return [ (ADMIN_EMAIL || '').toLowerCase(), 'shreyashmahagaon@gmail.com' ].filter(Boolean);
// 	}
// })();

// // 3. --- Load database from file ---
// const dbPath = path.join(__dirname, 'database.json');
// let mockUserDatabase = JSON.parse(fs.readFileSync(dbPath));
// console.log('Database loaded from file.');

// // This temporarily holds users during the signup process
// const tempUserDatabase = {};

// // --- Supabase client (server-side) ---
// const { createClient } = require('@supabase/supabase-js');
// const SUPABASE_URL = process.env.SUPABASE_URL;
// const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// let supabase = null;
// if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
// 	supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
// 	console.log('Supabase client initialized.');
// } else {
// 	console.warn('Supabase env vars missing. Falling back to local JSON database.');
// }

// // Helper: get user by email (Supabase first, fallback to in-memory/file)
// async function getUserByEmail(email) {
// 	if (!email) return null;
// 	const lookup = email.toString().toLowerCase();
// 	if (supabase) {
// 		// query using lower-cased email for consistent matching
// 		const { data, error } = await supabase.from('users').select('*').eq('email', lookup).limit(1);
// 		if (error) {
// 			console.error('Supabase error fetching user:', error.message || error);
// 		}
// 		if (data && data.length) return data[0];
// 	}
// 	// fallback to file-based mock (case-insensitive key match)
// 	const foundKey = Object.keys(mockUserDatabase).find(k => k.toLowerCase() === lookup);
// 	if (foundKey) return mockUserDatabase[foundKey];
// 	return null;
// }

// async function upsertUser(record) {
// 	if (supabase) {
// 		const { data, error } = await supabase.from('users').upsert([record]);
// 		if (error) {
// 			console.error('Supabase upsert error:', error.message || error);
// 			throw error;
// 		}
// 		return data;
// 	}
// 	// fallback: write to in-memory object
// 	const email = (record.email || '').toString().toLowerCase();
// 	mockUserDatabase[email] = mockUserDatabase[email] || {};
// 	// map fields from snake_case to the in-memory structure
// 	mockUserDatabase[email].password = record.password || mockUserDatabase[email].password;
// 	mockUserDatabase[email].fullName = record.full_name || mockUserDatabase[email].fullName;
// 	mockUserDatabase[email].userType = record.user_type || mockUserDatabase[email].userType;
// 	mockUserDatabase[email].schoolId = record.school_id || mockUserDatabase[email].schoolId;
// 	mockUserDatabase[email].phoneNumber = record.phone_number || mockUserDatabase[email].phoneNumber;
// 	mockUserDatabase[email].grades = record.grades || mockUserDatabase[email].grades || {};
// 	mockUserDatabase[email].interviewReport = record.interview_report || mockUserDatabase[email].interviewReport || '';
// 	mockUserDatabase[email].approved = record.approved === true;
// 	return mockUserDatabase[email];
// }

// // 4. Create the Email Transporter
// const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 587,
//     secure: false,
//     auth: {
//         user: 'shreyashmahagaon@gmail.com',
//         // --- FIX 1: SECURITY (Password from Vercel) ---
//         pass: process.env.MAIL_PASSWORD 
//     }
// });

// // 5. Add the "middleware"
// app.use(cors());
// app.use(express.json());
// app.use(express.static(path.join(__dirname, '..'))); // Serves HTML/CSS from root
// app.use((req, res, next) => {
//     if (req.originalUrl.endsWith('.html')) {
//         res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
//     }
//     next();
// });

// // 6. Test Route
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '..', 'index.html'));
// });

// // --- UPDATED LOGIN ROUTE ---
// app.post('/api/login', (req, res) => {
// 	(async () => {
// 		console.log('Login attempt received!');
// 		const { username, password } = req.body;
// 		// The frontend should send which portal the user tried to log in from
// 		// e.g. { userType: 'student' } or { userType: 'teacher' }
// 		const requestedUserType = (req.body.userType || req.body.user_type || null);
// 		try {
// 			const user = await getUserByEmail(username);
// 			if (user && user.password === password) {
// 				// support multiple field namings
// 				const storedUserType = (user.user_type || user.userType || user.usertype || null);
// 				const approved = (typeof user.approved !== 'undefined') ? user.approved : false;

// 				// Role-exempt accounts (can access both portals)
// 				const normalizedEmail = (username || '').toString().toLowerCase();

// 				// If frontend specified a portal (student/teacher), enforce it for non-exempt users.
// 				// Support storedUserType values like 'student', 'teacher', 'both', or comma-separated 'student,teacher'.
// 				const requestedNorm = requestedUserType ? requestedUserType.toString().toLowerCase() : null;
// 				let storedTypes = [];
// 				if (storedUserType) {
// 					storedTypes = storedUserType.toString().toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
// 				}
// 				// treat 'both' as both student and teacher
// 				if (storedTypes.includes('both')) {
// 					storedTypes = ['student', 'teacher'];
// 				}

// 				if (requestedNorm && storedTypes.length && !storedTypes.includes(requestedNorm)) {
// 					if (!ROLE_EXEMPT.includes(normalizedEmail)) {
// 						return res.json({ success: false, message: `This account is registered as '${storedUserType}'. Please use the ${storedUserType} login.` });
// 					}
// 				}

// 				if (storedUserType === 'teacher' && approved !== true) {
// 					return res.json({ success: false, message: 'Your teacher account is pending admin approval. Please wait for confirmation.' });
// 				}

// 				// Optionally return the user's type so frontend can validate/redirect safely
// 				return res.json({ success: true, message: 'Login successful!', userType: storedUserType });
// 			} else {
// 				return res.json({ success: false, message: 'Invalid username or password' });
// 			}
// 		} catch (err) {
// 			console.error('Login error:', err);
// 			return res.json({ success: false, message: 'Internal Server Error' });
// 		}
// 	})();
// });
// // NOTE: The signup flow below defines `/api/create-user` and performs
// // validation + sets `user_type`. The earlier naive endpoint that inserted
// // raw request bodies caused users to be created without `user_type`, which
// // allowed role checks to be bypassed. That unsafe endpoint was removed.


// // --- GET USER PROFILE ROUTE ---
// app.post('/api/my-profile', (req, res) => {
// 	(async () => {
// 		console.log(`Profile request received for: ${req.body.email}`);
// 		const { email } = req.body;
// 		try {
// 			const user = await getUserByEmail(email);
// 			if (user) {
// 				// map to expected response
// 				res.json({
// 					success: true,
// 					fullName: user.full_name || user.fullName || 'Student',
// 					email: email,
// 					userType: user.user_type || user.userType,
// 					schoolId: user.school_id || user.schoolId,
// 					phoneNumber: user.phone_number || user.phoneNumber,
// 					grades: user.grades || {}
// 				});
// 			} else {
// 				res.json({ success: false, message: 'User not found.' });
// 			}
// 		} catch (err) {
// 			console.error('Profile error:', err);
// 			res.json({ success: false, message: 'Internal Server Error' });
// 		}
// 	})();
// });

// // --- GET ALL STUDENTS ---
// app.get('/api/get-all-students', (req, res) => {
// 	(async () => {
// 		try {
// 			if (supabase) {
// 				const { data, error } = await supabase.from('users').select('*').eq('user_type', 'student');
// 				if (error) {
// 					console.error('Supabase error fetching students:', error.message || error);
// 					// continue to fallback
// 				} else if (data && data.length) {
// 					const studentList = (data || []).map(s => ({ id: s.school_id || s.schoolId, email: s.email, name: s.full_name || s.fullName, grades: s.grades || {}, interviewReport: s.interview_report || s.interviewReport || '' }));
// 					console.log('Fallback studentList count:', studentList.length);
// 					return res.json({ success: true, students: studentList });
// 				}
// 				// if supabase returned no rows, fall through to fallback below
// 			} 
// 			{
// 				// fallback: read the JSON file directly to avoid any in-memory mutations
// 				try {
// 					const raw = fs.readFileSync(dbPath, 'utf8');
// 					const allUsersFile = JSON.parse(raw);
// 					const studentList = [];
// 					for (const email in allUsersFile) {
// 						const u = allUsersFile[email] || {};
// 						const userType = u.user_type || u.userType || u.usertype || u.usertype;
// 						if (userType === 'student') {
// 							const id = u.school_id || u.schoolId || u.schoolid || null;
// 							const name = u.full_name || u.fullName || u.fullname || '';
// 							const grades = u.grades || {};
// 							const interviewReport = u.interview_report || u.interviewReport || u.interviewreport || '';
// 							studentList.push({ id, email, name, grades, interviewReport });
// 						}
// 					}
// 					return res.json({ success: true, students: studentList });
// 				} catch (err) {
// 					console.error('Fallback read database.json failed:', err);
// 					return res.json({ success: true, students: [] });
// 				}
// 			}
// 		} catch (err) {
// 			console.error('Error fetching students:', err);
// 			res.json({ success: false, message: 'Internal Server Error' });
// 		}
// 	})();
// });

// // --- GET ALL USERS (generic) ---
// app.get('/api/users', (req, res) => {
// 	(async () => {
// 		try {
// 			if (supabase) {
// 				const { data, error } = await supabase.from('users').select('*');
// 				if (error) {
// 					console.error('Supabase error fetching users:', error.message || error);
// 					return res.status(500).json({ success: false, message: 'Failed to fetch users' });
// 				}
// 				return res.json({ success: true, users: data });
// 			} else {
// 				// fallback to local mock database
// 				const users = Object.keys(mockUserDatabase).map(email => {
// 					const u = mockUserDatabase[email];
// 					return Object.assign({ email }, u);
// 				});
// 				return res.json({ success: true, users });
// 			}
// 		} catch (err) {
// 			console.error('Error fetching users:', err);
// 			res.status(500).json({ success: false, message: 'Internal Server Error' });
// 		}
// 	})();
// });

// // Debug route: inspect mockUserDatabase key shapes and user type fields
// app.get('/api/debug-user-types', (req, res) => {
// 	try {
// 		const debug = Object.keys(mockUserDatabase).map(email => {
// 			const u = mockUserDatabase[email] || {};
// 			return {
// 				email,
// 				keys: Object.keys(u),
// 				userType: u.userType || null,
// 				usertype: u.usertype || null,
// 				user_type: u.user_type || null
// 			};
// 		});
// 		res.json({ success: true, debug });
// 	} catch (err) {
// 		res.status(500).json({ success: false, error: err.message });
// 	}
// });

// // --- UPDATE STUDENT DATA ---
// app.post('/api/update-student-data', (req, res) => {
// 	(async () => {
// 		const { email, newGrades, newInterviewReport } = req.body;
// 		try {
// 			if (supabase) {
// 				const { data, error } = await supabase.from('users').update({ grades: newGrades, interview_report: newInterviewReport }).eq('email', email);
// 				if (error) {
// 					console.error('Supabase update error:', error.message || error);
// 					return res.json({ success: false, message: 'Update failed' });
// 				}
// 				return res.json({ success: true, message: 'Student updated successfully!' });
// 			} else {
// 				if (mockUserDatabase[email]) {
// 					mockUserDatabase[email].grades = newGrades;
// 					mockUserDatabase[email].interviewReport = newInterviewReport;
// 					console.log("WARNING: Data updated in memory, but not saved to file (read-only file system).");
// 					return res.json({ success: true, message: 'Student updated successfully!' });
// 				}
// 				return res.json({ success: false, message: 'Student not found.' });
// 			}
// 		} catch (err) {
// 			console.error('Update student error:', err);
// 			res.json({ success: false, message: 'Internal Server Error' });
// 		}
// 	})();
// });

// // --- TEACHER ADD STUDENT ROUTE ---
// app.post('/api/teacher-add-student', (req, res) => {
// 	(async () => {
// 		const { email, fullName, schoolId, phoneNumber, password } = req.body;
// 		try {
// 			if (supabase) {
// 				const record = {
// 					email,
// 					password,
// 					full_name: fullName,
// 					user_type: 'student',
// 					school_id: schoolId,
// 					phone_number: phoneNumber,
// 					grades: {},
// 					interview_report: '',
// 					approved: true
// 				};
// 				const { data, error } = await supabase.from('users').insert([record]);
// 				if (error) {
// 					console.error('Supabase insert error:', error.message || error);
// 					return res.json({ success: false, message: 'Failed to create student.' });
// 				}
// 				return res.json({ success: true, message: 'New student created successfully!' });
// 			} else {
// 				if (mockUserDatabase[email]) return res.json({ success: false, message: 'This email is already registered.' });
// 				mockUserDatabase[email] = { password: password, fullName: fullName, schoolId: schoolId, userType: "student", phoneNumber: phoneNumber, grades: {}, interviewReport: "" };
// 				console.log("WARNING: Data updated in memory, but not saved to file (read-only file system).");
// 				return res.json({ success: true, message: 'New student created successfully!' });
// 			}
// 		} catch (err) {
// 			console.error('Teacher add student error:', err);
// 			res.json({ success: false, message: 'Internal Server Error' });
// 		}
// 	})();
// });

// // --- HELPER: Save Database ---
// // ⚠️ THIS FUNCTION WILL NOT WORK ON VERCEL'S READ-ONLY FILE SYSTEM
// function saveDatabase() {
//     try {
//         // fs.writeFileSync('database.json', JSON.stringify(mockUserDatabase, null, 2)); // <-- THIS LINE IS THE PROBLEM
//         console.log('Database save skipped (read-only file system).');
//     } catch (error) {
//         console.error('Failed to save database:', error);
//     }
// }

// // =========================================
// // === SIGNUP FLOW (MODIFIED FOR ADMIN) ===
// // =========================================

// // STEP 1: Send Verification
// app.post('/api/send-verification', async (req, res) => {
// 	const { email, fullName, schoolId, userType, phoneNumber, skipEmail } = req.body;
// 	const key = (email || '').toString().toLowerCase();
// 	try {
// 		// check existing user in supabase or fallback
// 		const existing = await getUserByEmail(email);
// 		if (existing) return res.json({ success: false, message: 'This email is already registered.' });
// 	} catch (e) {
// 		console.error('Error checking existing user for verification:', e && e.message ? e.message : e);
// 	}

// 	const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
// 	tempUserDatabase[key] = { fullName, schoolId, userType, phoneNumber, code: verificationCode, verified: false };
// 	console.log(`Temp user stored for ${key}. Code: ${verificationCode}`);
// 	console.log('Temp DB keys now:', Object.keys(tempUserDatabase));

// 	if (skipEmail) {
// 		tempUserDatabase[key].verified = true;
// 		return res.json({ success: true, message: 'Skipping email.', code: verificationCode });
// 	}

// 	const mailOptions = {
// 		from: 'shreyashmahagaon@gmail.com',
// 		to: email,
// 		subject: 'Verify Your EDUWISE Account',
// 		html: `Hi ${fullName},<br><br>Your verification code is: <h2>${verificationCode}</h2>`
// 	};
// 	try {
// 		await transporter.sendMail(mailOptions);
// 		return res.json({ success: true, message: 'Verification email sent.' });
// 	} catch (error) {
// 		console.error('Error sending email:', error);
// 		return res.json({ success: false, message: 'Error sending verification email.' });
// 	}
// });

// // STEP 2: Verify Code
// app.post('/api/verify-code', (req, res) => {
// 	const { email, code } = req.body;
// 	const key = (email || '').toString().toLowerCase();
// 	const tempUser = tempUserDatabase[key];
// 	console.log(`Verifying code for ${key}. Code entered: ${code}`);
// 	console.log('Current temp database keys:', Object.keys(tempUserDatabase));

// 	if (!tempUser) return res.json({ success: false, message: 'Error. Try again.' });

// 	if ((code === 'INSTANT_VERIFY_BY_TEACHER' && tempUser.verified === true) || tempUser.code === code) {
// 		tempUserDatabase[key].verified = true;
// 		return res.json({ success: true, message: 'Email verified!' });
// 	}
// 	return res.json({ success: false, message: 'Invalid code.' });
// });

// // STEP 3: Create User
// app.post('/api/create-user', async (req, res) => {
//     console.log('Create user attempt received!');
//     const { email, password } = req.body;
// 	const tempUser = tempUserDatabase[email];
// 	if (!tempUser || !tempUser.verified) {
// 		console.warn('Create user blocked: tempUser missing or not verified for', email);
// 		return res.json({ success: false, message: 'Verification required.' });
// 	}

// 	// Ensure user_type is set; default to 'student' when missing
// 	const userType = (tempUser.userType || tempUser.user_type || 'student').toString().toLowerCase();
// 	const isApproved = (userType === 'student');
// 	const record = {
// 		email: (email || '').toString().toLowerCase(),
// 		password: password,
// 		full_name: tempUser.fullName || tempUser.full_name || '',
// 		user_type: userType,
// 		school_id: tempUser.schoolId || tempUser.school_id || null,
// 		phone_number: tempUser.phoneNumber || tempUser.phone_number || null,
// 		grades: {},
// 		interview_report: "",
// 		approved: isApproved
// 	};

// 	try {
// 		await upsertUser(record);
// 		if (supabase) console.log('Upserted user into Supabase:', email);
// 		else console.log('User stored in memory (no Supabase):', email);
// 	} catch (err) {
// 		console.error('Create user error (detailed):', err && err.message ? err.message : err);
// 		// Return a slightly more informative message for debugging (safe for dev). In production, avoid leaking DB internals.
// 		return res.json({ success: false, message: 'Failed to create user.', error: (err && err.message) || String(err) });
// 	}

// 	if (tempUser.userType === 'teacher') {
//         console.log(`Sending approval request to admin for ${email}`);
//         const approvalLink = `${WEBSITE_URL}/api/approve-teacher?email=${encodeURIComponent(email)}`; // Use live URL and encode email

//         const adminMailOptions = {
//             from: ADMIN_EMAIL,
//             to: ADMIN_EMAIL,
//             subject: 'ACTION REQUIRED: New Teacher Approval Request',
//             html: `<h3>New Teacher Registration</h3>
//                    <p><strong>Name:</strong> ${tempUser.fullName}</p>
//                    <p><strong>Email:</strong> ${email}</p>
//                    <p><a href="${approvalLink}">APPROVE TEACHER</a></p>`
//         };

//         try {
//             await transporter.sendMail(adminMailOptions);
//             console.log('Admin notified about teacher approval request.');
//         } catch (error) {
//             console.error('Failed to send admin notification:', error);
//         }

// 		delete tempUserDatabase[email]; 
// 		return res.json({ success: true, userType: 'teacher', message: 'Account created! Please wait for admin approval.' });
//     } else {
// 		delete tempUserDatabase[email]; 
// 		return res.json({ success: true, userType: 'student', message: 'Account created successfully!' });
//     }
// });

// // *** NEW ROUTE: ADMIN APPROVAL CLICK ***
// app.get('/api/approve-teacher', async (req, res) => {
// 	const emailToApprove = req.query.email;
// 	if (mockUserDatabase[emailToApprove]) {
// 		// mark approved in memory (note: won't persist on read-only deployments)
// 		mockUserDatabase[emailToApprove].approved = true;
// 		// saveDatabase(); // <-- Not used on read-only deployments
// 		console.log("WARNING: Data updated in memory, but not saved to file (read-only file system).");

// 		try {
// 			await transporter.sendMail({
// 				from: ADMIN_EMAIL,
// 				to: emailToApprove,
// 				subject: 'Your EDUWISE Teacher Account is Approved!',
// 				html: `<h3>Welcome aboard!</h3>
// 					   <p>Your account has been approved. You can now <a href="${WEBSITE_URL}/login.html">log in here</a>.</p>`
// 			});
// 		} catch (e) {
// 			console.error("Could not send approval notification email:", e);
// 		}

// 		res.send(`<div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
// 					<h1 style="color: #4CAF50;">Success!</h1>
// 					<p>Teacher <strong>${emailToApprove}</strong> has been approved.</p>
// 					<a href="${WEBSITE_URL}/login.html">Go to Login</a>
// 				  </div>`);
// 	} else {
// 		res.send('<h1>Error</h1><p>User not found.</p>');
// 	}
// });


// // --- FIX 2: VERCEL DEPLOYMENT ---
// // This runs the server *only* when you are testing locally
// if (process.env.NODE_ENV !== 'production') {
//     const PORT = 3000;
//     app.listen(PORT, () => {
//         console.log(`\n--- SERVER IS RUNNING FOR LOCAL TESTING ---`);
//         console.log(`--- http://localhost:${PORT} ---`);
//     });
// }

// // 7. Export the app for Vercel
// module.exports = app;






















// Load local .env for local development (Vercel will provide envs in production)
// NOTE: For local testing, ensure you have .env with:
// SUPABASE_URL, SUPABASE_SERVICE_KEY, MAIL_PASSWORD
require('dotenv').config({ path: __dirname + '/.env' });

// 1. Import the tools
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
// const fs = require('fs'); // Removed: No longer needed for file database
// const path = require('path'); // Removed: No longer needed for file database

// 2. Create the app
const app = express();

// --- CONFIGURATION ---
const ADMIN_EMAIL = 'shreyashmahagaon@gmail.com'; 
const WEBSITE_URL = 'https://eduwise-six.vercel.app'; // <-- Use your live URL

// ROLE_EXEMPT: comma-separated env var (server-only). Always include ADMIN_EMAIL
// and a fallback 'shreyashmahagaon@gmail.com' so those accounts can access both portals.
const ROLE_EXEMPT = (() => {
    try {
        const raw = (process.env.ROLE_EXEMPT || '');
        const fromEnv = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const set = new Set(fromEnv);
        if (ADMIN_EMAIL) set.add(ADMIN_EMAIL.toLowerCase());
        set.add('shreyashmahagaon@gmail.com');        curl http://localhost:3000/api/get-all-students
        set.add('admin@test.com');
        return Array.from(set);
    } catch (e) {
        return [ (ADMIN_EMAIL || '').toLowerCase(), 'shreyashmahagaon@gmail.com' ].filter(Boolean);
    }
})();

// This temporarily holds users during the signup process (in-memory, okay for transient data)
const tempUserDatabase = {};

// OTP settings
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || '300', 10); // default 5 minutes
const OTP_CLEANUP_INTERVAL_SECONDS = parseInt(process.env.OTP_CLEANUP_INTERVAL_SECONDS || '60', 10);

function cleanupExpiredTempUsers() {
    try {
        const now = Date.now();
        const keys = Object.keys(tempUserDatabase);
        for (const k of keys) {
            const t = tempUserDatabase[k];
            if (t && t.expiresAt && now > t.expiresAt) {
                console.log('cleanup: removing expired temp user for', k);
                delete tempUserDatabase[k];
            }
        }
    } catch (e) {
        console.error('cleanupExpiredTempUsers error:', e);
    }
}

// Periodic cleanup in dev and prod; lightweight operation
setInterval(cleanupExpiredTempUsers, Math.max(10, OTP_CLEANUP_INTERVAL_SECONDS) * 1000);

// --- Supabase client (server-side) ---
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    console.log('Supabase client initialized.');
} else {
    // CRITICAL: Exit or log severe error if Supabase is missing, as file system fallbacks were removed.
    console.error('CRITICAL ERROR: Supabase environment variables missing. Server will not persist data.');
    // In a real production app, you might crash the process here: process.exit(1);
}

// Helper: local fallback DB when Supabase is not configured
const fs = require('fs');
const dbPath = __dirname + '/database.json';
let mockUserDatabase = {};
try {
    if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, 'utf8');
        mockUserDatabase = JSON.parse(raw || '{}');
        console.log('Local mock database loaded.');
    } else {
        mockUserDatabase = {};
    }
} catch (e) {
    console.warn('Could not load local database.json, starting with empty DB:', e && e.message ? e.message : e);
    mockUserDatabase = {};
}

// Helper: get user by email (Supabase first, fallback to local JSON)
async function getUserByEmail(email) {
    if (!email) return null;
    const lookup = email.toString().trim().toLowerCase();

    if (supabase) {
        const { data, error } = await supabase.from('users').select('*').eq('email', lookup).limit(1);
        if (error) {
            console.error('Supabase error fetching user:', error.message || error);
            // fall through to local lookup
        } else if (data && data.length) {
            return data[0];
        }
    }

    // fallback to file-based mock (case-insensitive key match)
    const foundKey = Object.keys(mockUserDatabase).find(k => k.toLowerCase() === lookup);
    if (foundKey) return mockUserDatabase[foundKey];
    return null;
}

// Helper: insert or update user (Supabase first, fallback to local JSON)
async function upsertUser(record) {
    const emailKey = (record.email || '').toString().trim().toLowerCase();
    if (supabase) {
        const { data, error } = await supabase.from('users').upsert([record]).select();
        if (error) {
            console.error('Supabase upsert error:', error.message || error);
            throw error;
        }
        return data;
    }

    // Fallback: write to local in-memory object and persist to file if possible
    mockUserDatabase[emailKey] = mockUserDatabase[emailKey] || {};
    mockUserDatabase[emailKey].password = record.password || mockUserDatabase[emailKey].password;
    mockUserDatabase[emailKey].full_name = record.full_name || mockUserDatabase[emailKey].full_name || record.fullName;
    mockUserDatabase[emailKey].user_type = record.user_type || mockUserDatabase[emailKey].user_type || record.userType;
    mockUserDatabase[emailKey].school_id = record.school_id || mockUserDatabase[emailKey].school_id || record.schoolId;
    mockUserDatabase[emailKey].phone_number = record.phone_number || mockUserDatabase[emailKey].phone_number || record.phoneNumber;
    mockUserDatabase[emailKey].grades = record.grades || mockUserDatabase[emailKey].grades || {};
    mockUserDatabase[emailKey].interview_report = record.interview_report || mockUserDatabase[emailKey].interview_report || '';
    mockUserDatabase[emailKey].approved = !!record.approved;

    try {
        fs.writeFileSync(dbPath, JSON.stringify(mockUserDatabase, null, 2), 'utf8');
        console.log('Local database.json updated.');
    } catch (e) {
        console.warn('Could not persist to database.json (read-only?), in-memory updated only:', e && e.message ? e.message : e);
    }

    return mockUserDatabase[emailKey];
}

// 4. Create the Email Transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'shreyashmahagaon@gmail.com',
        // --- FIX 1: SECURITY (Password from Vercel) ---
        pass: process.env.MAIL_PASSWORD 
    }
});

// 5. Add the "middleware"
const path = require('path');
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serves HTML/CSS from root
app.use((req, res, next) => {
    if (req.originalUrl.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
});

// 6. Test Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// --- UPDATED LOGIN ROUTE ---
app.post('/api/login', (req, res) => {
    (async () => {
        if (!supabase) return res.json({ success: false, message: 'Server not configured for database access.' });

        console.log('Login attempt received!');
        const { username, password } = req.body;
        const requestedUserType = (req.body.userType || req.body.user_type || null);
        
        try {
            const user = await getUserByEmail(username);
            
            if (user && user.password === password) {
                const storedUserType = (user.user_type || user.userType || user.usertype || null);
                const approved = (typeof user.approved !== 'undefined') ? user.approved : false;

                const normalizedEmail = (username || '').toString().toLowerCase();

                const requestedNorm = requestedUserType ? requestedUserType.toString().toLowerCase() : null;
                let storedTypes = [];
                if (storedUserType) {
                    storedTypes = storedUserType.toString().toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
                }
                if (storedTypes.includes('both')) {
                    storedTypes = ['student', 'teacher'];
                }

                if (requestedNorm && storedTypes.length && !storedTypes.includes(requestedNorm)) {
                    if (!ROLE_EXEMPT.includes(normalizedEmail)) {
                        return res.json({ success: false, message: `This account is registered as '${storedUserType}'. Please use the ${storedUserType} portal.` });
                    }
                }

                if (storedUserType === 'teacher' && approved !== true) {
                    return res.json({ success: false, message: 'Your teacher account is pending admin approval. Please wait for confirmation.' });
                }

                return res.json({ success: true, message: 'Login successful!', userType: storedUserType });
            } else {
                return res.json({ success: false, message: 'Invalid username or password' });
            }
        } catch (err) {
            console.error('Login error:', err);
            return res.json({ success: false, message: 'Internal Server Error' });
        }
    })();
});

// --- GET USER PROFILE ROUTE ---
app.post('/api/my-profile', (req, res) => {
    (async () => {
        if (!supabase) return res.json({ success: false, message: 'Server not configured for database access.' });
        
        console.log(`Profile request received for: ${req.body.email}`);
        const { email } = req.body;
        
        try {
            const user = await getUserByEmail(email);
            if (user) {
                res.json({
                    success: true,
                    // Use database fields (snake_case)
                    fullName: user.full_name || 'Student', 
                    email: email,
                    userType: user.user_type,
                    schoolId: user.school_id,
                    phoneNumber: user.phone_number,
                    grades: user.grades || {}
                });
            } else {
                res.json({ success: false, message: 'User not found.' });
            }
        } catch (err) {
            console.error('Profile error:', err);
            res.json({ success: false, message: 'Internal Server Error' });
        }
    })();
});

// --- GET ALL STUDENTS ---
app.get('/api/get-all-students', (req, res) => {
    (async () => {
        try {
            if (supabase) {
                const { data, error } = await supabase.from('users').select('*').eq('user_type', 'student');
                if (error) {
                    console.error('Supabase error fetching students:', error.message || error);
                    return res.json({ success: false, message: 'Failed to fetch students from database.' });
                }
                const studentList = (data || []).map(s => ({ id: s.school_id, email: s.email, name: s.full_name, grades: s.grades || {}, interviewReport: s.interview_report || '' }));
                return res.json({ success: true, students: studentList });
            }

            // Local fallback: read students from mockUserDatabase (loaded from database.json)
            const studentList = [];
            for (const emailKey of Object.keys(mockUserDatabase)) {
                const u = mockUserDatabase[emailKey] || {};
                const userType = (u.user_type || u.userType || u.usertype || '').toString().toLowerCase();
                if (userType === 'student') {
                    const id = u.school_id || u.schoolId || u.schoolid || null;
                    const name = u.full_name || u.fullName || u.fullname || '';
                    const grades = u.grades || {};
                    const interviewReport = u.interview_report || u.interviewReport || u.interviewreport || '';
                    studentList.push({ id, email: emailKey, name, grades, interviewReport });
                }
            }
            return res.json({ success: true, students: studentList });

        } catch (err) {
            console.error('Error fetching students:', err);
            res.json({ success: false, message: 'Internal Server Error' });
        }
    })();
});

// --- GET ALL USERS (generic) ---
app.get('/api/users', (req, res) => {
    (async () => {
        if (!supabase) return res.json({ success: false, message: 'Server not configured for database access.' });
        
        try {
            const { data, error } = await supabase.from('users').select('*');
            
            if (error) {
                console.error('Supabase error fetching users:', error.message || error);
                return res.status(500).json({ success: false, message: 'Failed to fetch users' });
            }
            
            return res.json({ success: true, users: data });
            
        } catch (err) {
            console.error('Error fetching users:', err);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    })();
});

// --- UPDATE STUDENT DATA ---
app.post('/api/update-student-data', (req, res) => {
    (async () => {
        if (!supabase) return res.json({ success: false, message: 'Server not configured for database access.' });
        
        const { email, newGrades, newInterviewReport } = req.body;
        
        try {
            const { error } = await supabase.from('users')
                .update({ 
                    grades: newGrades, 
                    interview_report: newInterviewReport 
                })
                .eq('email', email);
            
            if (error) {
                console.error('Supabase update error:', error.message || error);
                return res.json({ success: false, message: 'Update failed' });
            }
            
            return res.json({ success: true, message: 'Student updated successfully!' });
            
        } catch (err) {
            console.error('Update student error:', err);
            res.json({ success: false, message: 'Internal Server Error' });
        }
    })();
});

// --- TEACHER ADD STUDENT ROUTE ---
app.post('/api/teacher-add-student', (req, res) => {
    (async () => {
        const { email, fullName, schoolId, phoneNumber, password } = req.body;
        console.log('teacher-add-student called. supabase configured:', !!supabase, 'body:', { email, fullName, schoolId, phoneNumber });

        try {
            // Check if user already exists (works with Supabase or local fallback)
            const existingUser = await getUserByEmail(email);
            if (existingUser) {
                return res.json({ success: false, message: 'This email is already registered.' });
            }

            const record = {
                email: (email || '').toString().trim().toLowerCase(),
                password: password || '',
                full_name: fullName || '',
                user_type: 'student',
                school_id: schoolId || null,
                phone_number: phoneNumber || null,
                grades: {},
                interview_report: '',
                approved: true // Students are approved immediately
            };

            if (supabase) {
                const { data, error } = await supabase.from('users').insert([record]);
                if (error) {
                    console.error('Supabase insert error:', error);
                    // Return detailed error in dev to help debugging
                    return res.json({ success: false, message: 'Failed to create student.', error: (error && (error.message || error.code || error.details)) || String(error) });
                }
                return res.json({ success: true, message: 'New student created successfully!' });
            } else {
                // Local fallback: write to mockUserDatabase and persist to database.json if possible
                const key = record.email;
                mockUserDatabase[key] = mockUserDatabase[key] || {};
                mockUserDatabase[key].password = record.password;
                mockUserDatabase[key].full_name = record.full_name;
                mockUserDatabase[key].user_type = record.user_type;
                mockUserDatabase[key].school_id = record.school_id;
                mockUserDatabase[key].phone_number = record.phone_number;
                mockUserDatabase[key].grades = {};
                mockUserDatabase[key].interview_report = '';
                mockUserDatabase[key].approved = true;

                try {
                    fs.writeFileSync(dbPath, JSON.stringify(mockUserDatabase, null, 2), 'utf8');
                    console.log('Local database.json updated with new student:', key);
                } catch (e) {
                    console.warn('Could not persist new student to database.json, in-memory only:', e && e.message ? e.message : e);
                }

                return res.json({ success: true, message: 'New student created successfully! (local fallback)' });
            }

        } catch (err) {
            console.error('Teacher add student error:', err && err.stack ? err.stack : err);
            return res.json({ success: false, message: 'Internal Server Error', error: (err && err.message) || String(err) });
        }
    })();
});

// =========================================
// === SIGNUP FLOW ===
// =========================================

// STEP 1: Send Verification
app.post('/api/send-verification', async (req, res) => {
    const { email, fullName, schoolId, userType, phoneNumber, skipEmail } = req.body;
    const key = (email || '').toString().trim().toLowerCase();

    try {
        if (!supabase) {
            console.warn('Supabase not configured. Cannot check for existing user. Proceeding with temporary storage.');
        } else {
             // Check existing user in Supabase
            const existing = await getUserByEmail(email);
            if (existing) return res.json({ success: false, message: 'This email is already registered.' });
        }
    } catch (e) {
        console.error('Error checking existing user for verification:', e && e.message ? e.message : e);
        // Treat DB error as user exists to prevent signup if DB is down
        return res.status(500).json({ success: false, message: 'Internal server error during user check.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Store in temp in-memory DB for signup flow (transient data) with expiry
    const now = Date.now();
    const expiresAt = now + OTP_TTL_SECONDS * 1000;
    tempUserDatabase[key] = { fullName, schoolId, userType, phoneNumber, code: verificationCode, verified: false, createdAt: now, expiresAt };
    console.log(`Temp user stored for ${key}. Code: ${verificationCode} (expires in ${OTP_TTL_SECONDS}s)`);

    if (skipEmail) {
        tempUserDatabase[key].verified = true;
        return res.json({ success: true, message: 'Skipping email.', code: verificationCode, expiresAt: tempUserDatabase[key].expiresAt });
    }

    const mailOptions = {
        from: ADMIN_EMAIL, // Use ADMIN_EMAIL for consistency
        to: email,
        subject: 'Verify Your EDUWISE Account',
        html: `Hi ${fullName},<br><br>Your verification code is: <h2>${verificationCode}</h2>`
    };
    try {
        await transporter.sendMail(mailOptions);
        return res.json({ success: true, message: 'Verification email sent.' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.json({ success: false, message: 'Error sending verification email.' });
    }
});

// STEP 2: Verify Code
app.post('/api/verify-code', (req, res) => {
    const { email, code } = req.body;
    const rawKey = (email || '').toString();
    const key = rawKey.trim().toLowerCase();

    console.log('verify-code called with:', { email: rawKey, code });
    console.log('Current tempUserDatabase keys:', Object.keys(tempUserDatabase));

    let tempUser = tempUserDatabase[key];

    // Fallback: try to find a matching key ignoring case/whitespace if direct lookup fails
    if (!tempUser) {
        const foundKey = Object.keys(tempUserDatabase).find(k => k.toLowerCase() === key || k.replace(/\s+/g,'').toLowerCase() === key.replace(/\s+/g,'').toLowerCase());
        if (foundKey) {
            console.log('verify-code: resolved fallback key ->', foundKey);
            tempUser = tempUserDatabase[foundKey];
        }
    }

    if (!tempUser) {
        console.warn('verify-code: no tempUser found for', key);
        return res.json({ success: false, message: 'Error. Try again.' });
    }

    if ((code === 'INSTANT_VERIFY_BY_TEACHER' && tempUser.verified === true) || tempUser.code === code) {
        // mark verified on the actual stored key (ensure we mutate the exact entry)
        const actualKey = Object.keys(tempUserDatabase).find(k => tempUserDatabase[k] === tempUser) || key;
        tempUserDatabase[actualKey].verified = true;
        console.log('verify-code: verified user for', actualKey);
        return res.json({ success: true, message: 'Email verified!' });
    }
    console.warn('verify-code: invalid code for', key, 'expected:', tempUser.code);
    return res.json({ success: false, message: 'Invalid code.' });
});

// Debug route to inspect tempUserDatabase
app.get('/api/debug-temp-users', (req, res) => {
    try {
        const debug = Object.keys(tempUserDatabase).map(k => ({ key: k, entry: tempUserDatabase[k] }));
        return res.json({ success: true, tempUsers: debug });
    } catch (e) {
        console.error('debug-temp-users error:', e);
        return res.status(500).json({ success: false, message: 'Failed to read temp users' });
    }
});

// STEP 3: Create User
app.post('/api/create-user', async (req, res) => {
    console.log('Create user attempt received!');
    const { email, password } = req.body;

    const rawKey = (email || '').toString();
    const key = rawKey.trim().toLowerCase();

    // Try direct lookup first
    let tempUser = tempUserDatabase[key];
    let actualKey = key;

    // Fallback: try to find a matching key ignoring case/whitespace if direct lookup fails
    if (!tempUser) {
        const foundKey = Object.keys(tempUserDatabase).find(k => k.toLowerCase() === key || k.replace(/\s+/g,'').toLowerCase() === key.replace(/\s+/g,'').toLowerCase());
        if (foundKey) {
            tempUser = tempUserDatabase[foundKey];
            actualKey = foundKey;
            console.log('create-user: resolved fallback temp key ->', foundKey);
        }
    }

    if (!tempUser) {
        console.warn('Create user blocked: tempUser missing for', email);
        return res.json({ success: false, message: 'Verification required. No pending verification found for this email.' });
    }

    // Check expiry if present
    if (tempUser.expiresAt && Date.now() > tempUser.expiresAt) {
        console.warn('Create user blocked: verification expired for', actualKey);
        // remove expired entry
        try { delete tempUserDatabase[actualKey]; } catch (e) {}
        return res.json({ success: false, message: 'Verification code expired. Please request a new verification code.' });
    }

    if (!tempUser.verified) {
        console.warn('Create user blocked: not verified for', actualKey);
        return res.json({ success: false, message: 'Verification required. Please verify the email before creating the account.' });
    }

    // Ensure user_type is set; default to 'student' when missing
    const userType = (tempUser.userType || 'student').toString().toLowerCase();
    // Students are approved automatically, Teachers require admin approval
    const isApproved = (userType === 'student'); 

    const record = {
        email: key,
        password: password,
        full_name: tempUser.fullName || '',
        user_type: userType,
        school_id: tempUser.schoolId || null,
        phone_number: tempUser.phoneNumber || null,
        grades: {},
        interview_report: "",
        approved: isApproved
    };

    try {
        // Use the helper which will prefer Supabase and fallback to local JSON
        const result = await upsertUser(record);
        console.log('Create user: upsert result:', Array.isArray(result) ? JSON.stringify(result[0]) : JSON.stringify(result));
    } catch (err) {
        console.error('Create user error (detailed):', err && err.message ? err.message : err);
        // In dev return the DB error to help debugging; remove in production
        return res.json({ success: false, message: 'Failed to create user.', error: err && err.message ? err.message : String(err) });
    }

    if (userType === 'teacher') {
        console.log(`Sending approval request to admin for ${email}`);
        const approvalLink = `${WEBSITE_URL}/api/approve-teacher?email=${encodeURIComponent(email)}`;

        const adminMailOptions = {
            from: ADMIN_EMAIL,
            to: ADMIN_EMAIL,
            subject: 'ACTION REQUIRED: New Teacher Approval Request',
            html: `<h3>New Teacher Registration</h3>
                    <p><strong>Name:</strong> ${tempUser.fullName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><a href="${approvalLink}">APPROVE TEACHER</a></p>`
        };

        try {
            await transporter.sendMail(adminMailOptions);
            console.log('Admin notified about teacher approval request.');
        } catch (error) {
            console.error('Failed to send admin notification:', error);
        }

        try { delete tempUserDatabase[actualKey]; } catch (e) {}
        return res.json({ success: true, userType: 'teacher', message: 'Account created! Please wait for admin approval.' });
    } else {
        try { delete tempUserDatabase[actualKey]; } catch (e) {}
        return res.json({ success: true, userType: 'student', message: 'Account created successfully!' });
    }
});

// *** NEW ROUTE: ADMIN APPROVAL CLICK ***
app.get('/api/approve-teacher', async (req, res) => {
    if (!supabase) {
        return res.send('<h1>Error</h1><p>Server not configured for database access.</p>');
    }
    
    const emailToApprove = (req.query.email || '').toLowerCase();
    
    try {
        const { data, error } = await supabase.from('users')
            .update({ approved: true })
            .eq('email', emailToApprove)
            .eq('user_type', 'teacher') // Ensure only teachers can be approved
            .select();

        if (error) {
            console.error('Supabase approval error:', error.message || error);
            return res.send('<h1>Error</h1><p>Database update failed.</p>');
        }

        if (data && data.length > 0) {
            console.log(`Teacher ${emailToApprove} approved.`);
            
            // Send approval notification email
            try {
                await transporter.sendMail({
                    from: ADMIN_EMAIL,
                    to: emailToApprove,
                    subject: 'Your EDUWISE Teacher Account is Approved!',
                    html: `<h3>Welcome aboard!</h3>
                           <p>Your account has been approved. You can now <a href="${WEBSITE_URL}/login.html">log in here</a>.</p>`
                });
            } catch (e) {
                console.error("Could not send approval notification email:", e);
            }

            res.send(`<div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                        <h1 style="color: #4CAF50;">Success!</h1>
                        <p>Teacher <strong>${emailToApprove}</strong> has been approved.</p>
                        <a href="${WEBSITE_URL}/login.html">Go to Login</a>
                      </div>`);
        } else {
            res.send('<h1>Error</h1><p>Teacher not found or already approved.</p>');
        }
    } catch (err) {
        console.error('Approve teacher route error:', err);
        res.send('<h1>Error</h1><p>Internal Server Error during approval process.</p>');
    }
});


// --- VERCEL DEPLOYMENT ---
// This runs the server *only* when you are testing locally
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`\n--- SERVER IS RUNNING FOR LOCAL TESTING ---`);
        console.log(`--- http://localhost:${PORT} ---`);
    });
}

// 7. Export the app for Vercel
module.exports = app;