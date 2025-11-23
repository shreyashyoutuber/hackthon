// // 1. Import the tools
// const express = require('express');
// const cors = require('cors');
// const nodemailer = require('nodemailer');
// const fs = require('fs');
// const path = require('path'); 

// // 2. Create the app
// const app = express();

// // 3. --- Load database from file ---
// const dbPath = path.join(__dirname, 'database.json');
// let mockUserDatabase = JSON.parse(fs.readFileSync(dbPath));
// console.log('Database loaded from file.');

// // This temporarily holds users during the signup process
// const tempUserDatabase = {};

// // 4. Create the Email Transporter
// const transporter = nodemailer.createTransport({
//     host: 'smtp.gmail.com',
//     port: 587,
//     secure: false,
//     auth: {
//         user: 'shreyashmahagaon@gmail.com',
//         // Reads the password from Vercel Environment Variables
//         pass: process.env.MAIL_PASSWORD 
//     }
// });

// // 5. Add the "middleware"
// app.use(cors());
// app.use(express.json());

// // --- THIS SERVES YOUR HTML/CSS FILES ---
// app.use(express.static(path.join(__dirname, '..')));

// // --- THIS STOPS THE BROWSER FROM CACHING OLD FILES ---
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

// // --- API ROUTES ---

// app.post('/api/login', (req, res) => {
//     console.log('Login attempt received!');
//     const { username, password } = req.body;
//     const user = mockUserDatabase[username];

//     if (user && user.password === password) {
//         res.json({ success: true, message: 'Login successful!' });
//     } else {
//         res.json({ success: false, message: 'Invalid username or password' });
//     }
// });

// app.post('/api/my-profile', (req, res) => {
//     console.log(`Profile request received for: ${req.body.email}`);
//     const { email } = req.body;
//     const user = mockUserDatabase[email];

//     if (user) {
//         res.json({
//             success: true,
//             fullName: user.fullName,
//             email: email,
//             userType: user.userType,
//             schoolId: user.schoolId,
//             phoneNumber: user.phoneNumber,
//             grades: user.grades
//         });
//     } else {
//         res.json({ success: false, message: 'User not found.' });
//     }
// });

// app.get('/api/get-all-students', (req, res) => {
//     console.log('Request received for all students');
//     
//     const allUsers = mockUserDatabase;
//     const studentList = [];

//     for (const email in allUsers) {
//         if (allUsers[email].userType === 'student') {
//             const student = allUsers[email];
//             studentList.push({
//                 id: student.schoolId, 
//                 email: email, 
//                 name: student.fullName,
//                 grades: student.grades || {},
//                 interviewReport: student.interviewReport || ''
//             });
//         }
//     }
//     
//     res.json({ success: true, students: studentList });
// });

// app.post('/api/update-student-data', (req, res) => {
//     const { email, newGrades, newInterviewReport } = req.body;
//     console.log(`Updating data for: ${email}`);

//     if (mockUserDatabase[email]) {
//         mockUserDatabase[email].grades = newGrades;
//         mockUserDatabase[email].interviewReport = newInterviewReport;

//         // ⚠️ Vercel cannot save files, so this is commented out
//         // fs.writeFileSync(dbPath, JSON.stringify(mockUserDatabase, null, 2));

//         console.log('Update successful (in memory only).');
//         res.json({ success: true, message: 'Student updated in memory (cannot save to file on Vercel).' });
//     } else {
//         res.json({ success: false, message: 'Student not found.' });
//     }
// });

// app.post('/api/teacher-add-student', (req, res) => {
//     console.log('Teacher is adding a new student...');
//     
//     const { email, fullName, schoolId, phoneNumber, password } = req.body;

//     if (mockUserDatabase[email]) {
//         return res.json({ success: false, message: 'This email is already registered.' });
//     }

//     mockUserDatabase[email] = {
//         password: password, 
//         fullName: fullName,
//         schoolId: schoolId,
//         userType: "student", 
//         phoneNumber: phoneNumber,
//         grades: {}, 
//         interviewReport: "" 
//     };

//     // ⚠️ Vercel cannot save files, so this is commented out
//     // fs.writeFileSync(dbPath, JSON.stringify(mockUserDatabase, null, 2));

//     console.log('New student added (in memory only).');
//     res.json({ success: true, message: 'New student created in memory (cannot save to file on Vercel).' });
// });

// app.post('/api/send-verification', async (req, res) => {
//     console.log('Verification attempt received!');
//     
//     const { email, fullName, schoolId, userType, phoneNumber, skipEmail } = req.body;

//     if (mockUserDatabase[email]) {
//         return res.json({ success: false, message: 'This email is already registered.' });
//     }

//     const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

//     tempUserDatabase[email] = {
//         fullName: fullName,
//         schoolId: schoolId,
//         userType: userType,
//         phoneNumber: phoneNumber,
//         code: verificationCode,
//         verified: false 
//     };
//     console.log('Temporary user stored:', tempUserDatabase[email]);
//     
//     if (skipEmail) {
//         console.log(`Email sending skipped for ${email} (teacher-added student).`);
//         tempUserDatabase[email].verified = true;
//         res.json({ success: true, message: 'User stored, skipping email.', code: verificationCode });
//     } else {
//         
//         const mailOptions = {
//             from: 'shreyashmahagaon@gmail.com',
//             to: email,
//             subject: 'Verify Your EDUWISE Account',
//             html: `
//                 Hi ${fullName},<br><br>
//                 Welcome to EDUWISE! To secure your account, please verify your email address by using the code below.<br><br>
//                 Your verification code is:<br>
//   _             <h2 style="font-size: 28px; letter-spacing: 2px; margin: 10px 0;">${verificationCode}</h2>
//                 This code is valid for the next 10 minutes.<br><br>
//                 If you didn't create an account with EDUWISE, please ignore this email.<br><br>
//                 Best,<br>
//                 The EDUWISE Team
//             `
//         };

//         try {
//           
//             await transporter.sendMail(mailOptions);
//             console.log('Verification email sent to:', email);
//             res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
//         } catch (error) {
//             console.error('Error sending email:', error);
//             res.json({ success: false, message: 'Error sending verification email.' });
//         }
//     }
// });

// app.post('/api/verify-code', (req, res) => {
//     console.log('Verify code attempt received!');
//     const { email, code } = req.body;
//     const tempUser = tempUserDatabase[email];

//     if (!tempUser) {
//         return res.json({ success: false, message: 'An error occurred. Please try signing up again.' });
//     }

//     if (code === 'INSTANT_VERIFY_BY_TEACHER' && tempUser.verified === true) {
//          console.log(`User ${email} was pre-verified by teacher.`);
//          return res.json({ success: true, message: 'Email pre-verified. Please set your password.' });
//     }
//     
//     if (tempUser.code === code) {
//       tempUserDatabase[email].verified = true;
//         console.log(`User ${email} has been verified.`);
//         res.json({ success: true, message: 'Email verified successfully! Please set your password.' });
//     } else {
//         res.json({ success: false, message: 'Invalid verification code. Please try again.' });
//     }
// });

// app.post('/api/create-user', (req, res) => {
//     console.log('Create user attempt received!');
//     const { email, password } = req.body;
//     const tempUser = tempUserDatabase[email];

//     if (!tempUser || !tempUser.verified) {
//         return res.json({ success: false, message: 'You must verify your email before setting a password.'});
//   }

//     mockUserDatabase[email] = {
//         password: password,
//         fullName: tempUser.fullName,
//         schoolId: tempUser.schoolId,
//         userType: tempUser.userType,
//         phoneNumber: tempUser.phoneNumber,
//         grades: {},
//         interviewReport: ""
//     };

//     // ⚠️ Vercel cannot save files, so this is commented out
//   // fs.writeFileSync(dbPath, JSON.stringify(mockUserDatabase, null, 2));

//     delete tempUserDatabase[email]; 

//     console.log(`New user created: ${email} (in memory only)`);
//     res.json({ success: true, message: 'Account created successfully! Redirecting to login...' });
// });


// // --- THIS IS THE NEW BLOCK ---
// // It runs the server *only* when you are testing locally
// // Vercel will ignore this block and use 'module.exports'
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
require('dotenv').config({ path: __dirname + '/.env' });



// 1. Import the tools
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path'); 

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
		// ensure these two accounts are always exempt from portal restrictions
		set.add('shreyashmahagaon@gmail.com');
		set.add('admin@test.com');
		return Array.from(set);
	} catch (e) {
		return [ (ADMIN_EMAIL || '').toLowerCase(), 'shreyashmahagaon@gmail.com' ].filter(Boolean);
	}
})();

// 3. --- Load database from file ---
const dbPath = path.join(__dirname, 'database.json');
let mockUserDatabase = JSON.parse(fs.readFileSync(dbPath));
console.log('Database loaded from file.');

// This temporarily holds users during the signup process
const tempUserDatabase = {};

// --- Supabase client (server-side) ---
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
	supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
	console.log('Supabase client initialized.');
} else {
	console.warn('Supabase env vars missing. Falling back to local JSON database.');
}

// Helper: get user by email (Supabase first, fallback to in-memory/file)
async function getUserByEmail(email) {
	if (!email) return null;
	const lookup = email.toString().toLowerCase();
	if (supabase) {
		// query using lower-cased email for consistent matching
		const { data, error } = await supabase.from('users').select('*').eq('email', lookup).limit(1);
		if (error) {
			console.error('Supabase error fetching user:', error.message || error);
		}
		if (data && data.length) return data[0];
	}
	// fallback to file-based mock (case-insensitive key match)
	const foundKey = Object.keys(mockUserDatabase).find(k => k.toLowerCase() === lookup);
	if (foundKey) return mockUserDatabase[foundKey];
	return null;
}

async function upsertUser(record) {
	if (supabase) {
		const { data, error } = await supabase.from('users').upsert([record]);
		if (error) {
			console.error('Supabase upsert error:', error.message || error);
			throw error;
		}
		return data;
	}
	// fallback: write to in-memory object
	const email = (record.email || '').toString().toLowerCase();
	mockUserDatabase[email] = mockUserDatabase[email] || {};
	// map fields from snake_case to the in-memory structure
	mockUserDatabase[email].password = record.password || mockUserDatabase[email].password;
	mockUserDatabase[email].fullName = record.full_name || mockUserDatabase[email].fullName;
	mockUserDatabase[email].userType = record.user_type || mockUserDatabase[email].userType;
	mockUserDatabase[email].schoolId = record.school_id || mockUserDatabase[email].schoolId;
	mockUserDatabase[email].phoneNumber = record.phone_number || mockUserDatabase[email].phoneNumber;
	mockUserDatabase[email].grades = record.grades || mockUserDatabase[email].grades || {};
	mockUserDatabase[email].interviewReport = record.interview_report || mockUserDatabase[email].interviewReport || '';
	mockUserDatabase[email].approved = record.approved === true;
	return mockUserDatabase[email];
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
		console.log('Login attempt received!');
		const { username, password } = req.body;
		// The frontend should send which portal the user tried to log in from
		// e.g. { userType: 'student' } or { userType: 'teacher' }
		const requestedUserType = (req.body.userType || req.body.user_type || null);
		try {
			const user = await getUserByEmail(username);
			if (user && user.password === password) {
				// support multiple field namings
				const storedUserType = (user.user_type || user.userType || user.usertype || null);
				const approved = (typeof user.approved !== 'undefined') ? user.approved : false;

				// Role-exempt accounts (can access both portals)
				const normalizedEmail = (username || '').toString().toLowerCase();

				// If frontend specified a portal (student/teacher), enforce it for non-exempt users.
				// Support storedUserType values like 'student', 'teacher', 'both', or comma-separated 'student,teacher'.
				const requestedNorm = requestedUserType ? requestedUserType.toString().toLowerCase() : null;
				let storedTypes = [];
				if (storedUserType) {
					storedTypes = storedUserType.toString().toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
				}
				// treat 'both' as both student and teacher
				if (storedTypes.includes('both')) {
					storedTypes = ['student', 'teacher'];
				}

				if (requestedNorm && storedTypes.length && !storedTypes.includes(requestedNorm)) {
					if (!ROLE_EXEMPT.includes(normalizedEmail)) {
						return res.json({ success: false, message: `This account is registered as '${storedUserType}'. Please use the ${storedUserType} login.` });
					}
				}

				if (storedUserType === 'teacher' && approved !== true) {
					return res.json({ success: false, message: 'Your teacher account is pending admin approval. Please wait for confirmation.' });
				}

				// Optionally return the user's type so frontend can validate/redirect safely
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
// NOTE: The signup flow below defines `/api/create-user` and performs
// validation + sets `user_type`. The earlier naive endpoint that inserted
// raw request bodies caused users to be created without `user_type`, which
// allowed role checks to be bypassed. That unsafe endpoint was removed.


// --- GET USER PROFILE ROUTE ---
app.post('/api/my-profile', (req, res) => {
	(async () => {
		console.log(`Profile request received for: ${req.body.email}`);
		const { email } = req.body;
		try {
			const user = await getUserByEmail(email);
			if (user) {
				// map to expected response
				res.json({
					success: true,
					fullName: user.full_name || user.fullName || 'Student',
					email: email,
					userType: user.user_type || user.userType,
					schoolId: user.school_id || user.schoolId,
					phoneNumber: user.phone_number || user.phoneNumber,
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
					// continue to fallback
				} else if (data && data.length) {
					const studentList = (data || []).map(s => ({ id: s.school_id || s.schoolId, email: s.email, name: s.full_name || s.fullName, grades: s.grades || {}, interviewReport: s.interview_report || s.interviewReport || '' }));
					console.log('Fallback studentList count:', studentList.length);
					return res.json({ success: true, students: studentList });
				}
				// if supabase returned no rows, fall through to fallback below
			} 
			{
				// fallback: read the JSON file directly to avoid any in-memory mutations
				try {
					const raw = fs.readFileSync(dbPath, 'utf8');
					const allUsersFile = JSON.parse(raw);
					const studentList = [];
					for (const email in allUsersFile) {
						const u = allUsersFile[email] || {};
						const userType = u.user_type || u.userType || u.usertype || u.usertype;
						if (userType === 'student') {
							const id = u.school_id || u.schoolId || u.schoolid || null;
							const name = u.full_name || u.fullName || u.fullname || '';
							const grades = u.grades || {};
							const interviewReport = u.interview_report || u.interviewReport || u.interviewreport || '';
							studentList.push({ id, email, name, grades, interviewReport });
						}
					}
					return res.json({ success: true, students: studentList });
				} catch (err) {
					console.error('Fallback read database.json failed:', err);
					return res.json({ success: true, students: [] });
				}
			}
		} catch (err) {
			console.error('Error fetching students:', err);
			res.json({ success: false, message: 'Internal Server Error' });
		}
	})();
});

// --- GET ALL USERS (generic) ---
app.get('/api/users', (req, res) => {
	(async () => {
		try {
			if (supabase) {
				const { data, error } = await supabase.from('users').select('*');
				if (error) {
					console.error('Supabase error fetching users:', error.message || error);
					return res.status(500).json({ success: false, message: 'Failed to fetch users' });
				}
				return res.json({ success: true, users: data });
			} else {
				// fallback to local mock database
				const users = Object.keys(mockUserDatabase).map(email => {
					const u = mockUserDatabase[email];
					return Object.assign({ email }, u);
				});
				return res.json({ success: true, users });
			}
		} catch (err) {
			console.error('Error fetching users:', err);
			res.status(500).json({ success: false, message: 'Internal Server Error' });
		}
	})();
});

// Debug route: inspect mockUserDatabase key shapes and user type fields
app.get('/api/debug-user-types', (req, res) => {
	try {
		const debug = Object.keys(mockUserDatabase).map(email => {
			const u = mockUserDatabase[email] || {};
			return {
				email,
				keys: Object.keys(u),
				userType: u.userType || null,
				usertype: u.usertype || null,
				user_type: u.user_type || null
			};
		});
		res.json({ success: true, debug });
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
});

// --- UPDATE STUDENT DATA ---
app.post('/api/update-student-data', (req, res) => {
	(async () => {
		const { email, newGrades, newInterviewReport } = req.body;
		try {
			if (supabase) {
				const { data, error } = await supabase.from('users').update({ grades: newGrades, interview_report: newInterviewReport }).eq('email', email);
				if (error) {
					console.error('Supabase update error:', error.message || error);
					return res.json({ success: false, message: 'Update failed' });
				}
				return res.json({ success: true, message: 'Student updated successfully!' });
			} else {
				if (mockUserDatabase[email]) {
					mockUserDatabase[email].grades = newGrades;
					mockUserDatabase[email].interviewReport = newInterviewReport;
					console.log("WARNING: Data updated in memory, but not saved to file (read-only file system).");
					return res.json({ success: true, message: 'Student updated successfully!' });
				}
				return res.json({ success: false, message: 'Student not found.' });
			}
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
		try {
			if (supabase) {
				const record = {
					email,
					password,
					full_name: fullName,
					user_type: 'student',
					school_id: schoolId,
					phone_number: phoneNumber,
					grades: {},
					interview_report: '',
					approved: true
				};
				const { data, error } = await supabase.from('users').insert([record]);
				if (error) {
					console.error('Supabase insert error:', error.message || error);
					return res.json({ success: false, message: 'Failed to create student.' });
				}
				return res.json({ success: true, message: 'New student created successfully!' });
			} else {
				if (mockUserDatabase[email]) return res.json({ success: false, message: 'This email is already registered.' });
				mockUserDatabase[email] = { password: password, fullName: fullName, schoolId: schoolId, userType: "student", phoneNumber: phoneNumber, grades: {}, interviewReport: "" };
				console.log("WARNING: Data updated in memory, but not saved to file (read-only file system).");
				return res.json({ success: true, message: 'New student created successfully!' });
			}
		} catch (err) {
			console.error('Teacher add student error:', err);
			res.json({ success: false, message: 'Internal Server Error' });
		}
	})();
});

// --- HELPER: Save Database ---
// ⚠️ THIS FUNCTION WILL NOT WORK ON VERCEL'S READ-ONLY FILE SYSTEM
function saveDatabase() {
    try {
        // fs.writeFileSync('database.json', JSON.stringify(mockUserDatabase, null, 2)); // <-- THIS LINE IS THE PROBLEM
        console.log('Database save skipped (read-only file system).');
    } catch (error) {
        console.error('Failed to save database:', error);
    }
}

// =========================================
// === SIGNUP FLOW (MODIFIED FOR ADMIN) ===
// =========================================

// STEP 1: Send Verification
app.post('/api/send-verification', async (req, res) => {
    const { email, fullName, schoolId, userType, phoneNumber, skipEmail } = req.body;
    if (mockUserDatabase[email]) {
        return res.json({ success: false, message: 'This email is already registered.' });
  _ }
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    tempUserDatabase[email] = { fullName, schoolId, userType, phoneNumber, code: verificationCode, verified: false };
    console.log(`Temp user stored for ${email}. Code: ${verificationCode}`); // Log for debugging

	if (skipEmail) {
        tempUserDatabase[email].verified = true;
        res.json({ success: true, message: 'Skipping email.', code: verificationCode });
    } else {
        const mailOptions = {
            from: 'shreyashmahagaon@gmail.com',
            to: email,
            subject: 'Verify Your EDUWISE Account',
            html: `Hi ${fullName},<br><br>Your verification code is: <h2>${verificationCode}</h2>`
        };
		try {
			await transporter.sendMail(mailOptions);
			res.json({ success: true, message: 'Verification email sent.' });
		} catch (error) {
			console.error("Error sending email:", error); // Log the actual error
			res.json({ success: false, message: 'Error sending verification email.' });
		}
    }
});

// STEP 2: Verify Code
app.post('/api/verify-code', (req, res) => {
    const { email, code } = req.body;
    const tempUser = tempUserDatabase[email];
    console.log(`Verifying code for ${email}. Code entered: ${code}`); // Log for debugging
    console.log("Current temp database:", tempUserDatabase); // Log for debugging

    if (!tempUser) return res.json({ success: false, message: 'Error. Try again.' });

    if ((code === 'INSTANT_VERIFY_BY_TEACHER' && tempUser.verified === true) || tempUser.code === code) {
        tempUserDatabase[email].verified = true;
        res.json({ success: true, message: 'Email verified!' });
    } else {
        res.json({ success: false, message: 'Invalid code.' });
    }
});

// STEP 3: Create User
app.post('/api/create-user', async (req, res) => {
    console.log('Create user attempt received!');
    const { email, password } = req.body;
    const tempUser = tempUserDatabase[email];
    if (!tempUser || !tempUser.verified) {
        return res.json({ success: false, message: 'Verification required.' });
    }

    const isApproved = (tempUser.userType === 'student');
	const record = {
		email,
		password: password,
		full_name: tempUser.fullName,
		user_type: tempUser.userType,
		school_id: tempUser.schoolId,
		phone_number: tempUser.phoneNumber,
		grades: {},
		interview_report: "",
		approved: isApproved
	};

	try {
		if (supabase) {
			await upsertUser(record);
			console.log('Upserted user into Supabase:', email);
		} else {
			// fallback to in-memory
			await upsertUser(record);
			console.log("WARNING: Data updated in memory, but not saved to file (read-only file system).", email);
		}
	} catch (err) {
		console.error('Create user error:', err);
		return res.json({ success: false, message: 'Failed to create user.' });
	}

	if (tempUser.userType === 'teacher') {
        console.log(`Sending approval request to admin for ${email}`);
        const approvalLink = `${WEBSITE_URL}/api/approve-teacher?email=${encodeURIComponent(email)}`; // Use live URL and encode email

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

		delete tempUserDatabase[email]; 
		return res.json({ success: true, userType: 'teacher', message: 'Account created! Please wait for admin approval.' });
    } else {
		delete tempUserDatabase[email]; 
		return res.json({ success: true, userType: 'student', message: 'Account created successfully!' });
    }
});

// *** NEW ROUTE: ADMIN APPROVAL CLICK ***
app.get('/api/approve-teacher', async (req, res) => {
	const emailToApprove = req.query.email;
	if (mockUserDatabase[emailToApprove]) {
		// mark approved in memory (note: won't persist on read-only deployments)
		mockUserDatabase[emailToApprove].approved = true;
		// saveDatabase(); // <-- Not used on read-only deployments
		console.log("WARNING: Data updated in memory, but not saved to file (read-only file system).");

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
		res.send('<h1>Error</h1><p>User not found.</p>');
	}
});


// --- FIX 2: VERCEL DEPLOYMENT ---
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