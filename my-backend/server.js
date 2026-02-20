

// Load local .env for local development (Vercel will provide envs in production)
// NOTE: For local testing, ensure you have .env with:
// MONGODB_URI, MAIL_PASSWORD
require('dotenv').config({ path: __dirname + '/.env' });

// 1. Import the tools
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

// 2. Create the app
const app = express();

// --- CONFIGURATION ---
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shreyashmahagaon@gmail.com';
const WEBSITE_URL = process.env.WEBSITE_URL || 'https://eduwise1.vercel.app'; // default to your frontend domain

// Allowed origins for CORS (comma separated list). Include localhost for local testing.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || `${WEBSITE_URL},http://localhost:3000,http://127.0.0.1:3000`).split(',').map(s => s.trim()).filter(Boolean);

// ROLE_EXEMPT: comma-separated env var (server-only). Always include ADMIN_EMAIL
// and a fallback 'shreyashmahagaon@gmail.com' so those accounts can access both portals.
const ROLE_EXEMPT = (() => {
    try {
        const raw = (process.env.ROLE_EXEMPT || '');
        const fromEnv = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        const set = new Set(fromEnv);
        if (ADMIN_EMAIL) set.add(ADMIN_EMAIL.toLowerCase());
        set.add('shreyashmahagaon@gmail.com');
        set.add('admin@test.com');
        return Array.from(set);
    } catch (e) {
        return [(ADMIN_EMAIL || '').toLowerCase(), 'shreyashmahagaon@gmail.com'].filter(Boolean);
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

// --- MongoDB Configuration ---
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI && MONGODB_URI !== 'your_mongodb_connection_string_here') {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Successfully connected to MongoDB.'))
        .catch(err => console.error('CRITICAL ERROR: Could not connect to MongoDB:', err));
} else {
    console.error('CRITICAL ERROR: MONGODB_URI environment variable missing or placeholder used. Database will not work.');
}

// Helper: get user by email using Mongoose
async function getUserByEmail(email) {
    if (!email) return null;
    const lookup = email.toString().trim().toLowerCase();
    try {
        return await User.findOne({ email: lookup });
    } catch (error) {
        console.error('MongoDB error fetching user:', error);
        return null;
    }
}

// Helper: insert or update user using Mongoose
async function upsertUser(record) {
    const emailKey = (record.email || '').toString().trim().toLowerCase();
    try {
        // Map any snake_case fields to the record if they aren't already set correctly
        const update = {
            email: emailKey,
            password: record.password,
            full_name: record.full_name || record.fullName,
            user_type: record.user_type || record.userType,
            school_id: record.school_id || record.schoolId,
            phone_number: record.phone_number || record.phoneNumber,
            grades: record.grades || {},
            interview_report: record.interview_report || record.interviewReport || '',
            approved: typeof record.approved !== 'undefined' ? !!record.approved : false
        };

        const options = { upsert: true, new: true, runValidators: true };
        const result = await User.findOneAndUpdate({ email: emailKey }, update, options);
        console.log('MongoDB upsert successful for:', emailKey);
        return result;
    } catch (error) {
        console.error('MongoDB upsert error:', error);
        throw error;
    }
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
// Configure CORS to allow only configured origins (helps when frontend is hosted separately)
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (e.g., curl, mobile apps)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        console.warn('Blocked CORS request from origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    }
}));
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
            const students = await User.find({ user_type: 'student' });
            const studentList = students.map(s => ({
                id: s.school_id,
                email: s.email,
                name: s.full_name,
                grades: Object.fromEntries(s.grades || new Map()),
                interviewReport: s.interview_report || ''
            }));
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
        try {
            const users = await User.find({});
            return res.json({ success: true, users });
        } catch (err) {
            console.error('Error fetching users:', err);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    })();
});

// --- UPDATE STUDENT DATA ---
app.post('/api/update-student-data', (req, res) => {
    (async () => {
        const { email, newGrades, newInterviewReport } = req.body;
        try {
            const result = await User.findOneAndUpdate(
                { email: email.toLowerCase() },
                { grades: newGrades, interview_report: newInterviewReport },
                { new: true }
            );

            if (!result) {
                return res.json({ success: false, message: 'User not found' });
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
        console.log('teacher-add-student called. body:', { email, fullName, schoolId, phoneNumber });

        try {
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
                approved: true
            };

            await upsertUser(record);
            return res.json({ success: true, message: 'New student created successfully!' });

        } catch (err) {
            console.error('Teacher add student error:', err);
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
        // Check existing user in MongoDB
        const existing = await getUserByEmail(email);
        if (existing) return res.json({ success: false, message: 'This email is already registered.' });
    } catch (e) {
        console.error('Error checking existing user for verification:', e);
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
        const foundKey = Object.keys(tempUserDatabase).find(k => k.toLowerCase() === key || k.replace(/\s+/g, '').toLowerCase() === key.replace(/\s+/g, '').toLowerCase());
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
        const foundKey = Object.keys(tempUserDatabase).find(k => k.toLowerCase() === key || k.replace(/\s+/g, '').toLowerCase() === key.replace(/\s+/g, '').toLowerCase());
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
        try { delete tempUserDatabase[actualKey]; } catch (e) { }
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
        const result = await upsertUser(record);
        console.log('Create user: upsert result:', JSON.stringify(result));
    } catch (err) {
        console.error('Create user error (detailed):', err && err.message ? err.message : err);
        return res.json({ success: false, message: 'Failed to create user. Please try again.', error: err && err.message ? err.message : String(err) });
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

        try { delete tempUserDatabase[actualKey]; } catch (e) { }
        return res.json({ success: true, userType: 'teacher', message: 'Account created! Please wait for admin approval.' });
    } else {
        try { delete tempUserDatabase[actualKey]; } catch (e) { }
        return res.json({ success: true, userType: 'student', message: 'Account created successfully!' });
    }
});

// *** NEW ROUTE: ADMIN APPROVAL CLICK ***
app.get('/api/approve-teacher', async (req, res) => {
    const emailToApprove = (req.query.email || '').toLowerCase();

    try {
        const result = await User.findOneAndUpdate(
            { email: emailToApprove, user_type: 'teacher' },
            { approved: true },
            { new: true }
        );

        if (!result) {
            return res.send('<h1>Error</h1><p>Teacher not found or already approved.</p>');
        }

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
    } catch (err) {
        console.error('Approve teacher route error:', err);
        res.send('<h1>Error</h1><p>Internal Server Error during approval process.</p>');
    }
});

// --- Health check route ---
app.get('/api/health', (req, res) => {
    return res.status(200).json({ success: true, message: 'OK' });
});

// --- Seed demo data endpoint (dev only) ---
app.post('/api/seed-demo', async (req, res) => {
    try {
        const seedData = [
            {
                email: "demo.student1@example.com",
                password: "Temp1234",
                full_name: "Demo Student One",
                user_type: "student",
                school_id: "DS-001",
                phone_number: "9990001111",
                grades: { math: { score: "91", grade: "A" }, programming: { score: "87", grade: "B+" } },
                interview_report: "Strong candidate for technical roles.",
                approved: true
            },
            {
                email: "demo.student2@example.com",
                password: "Temp1234",
                full_name: "Demo Student Two",
                user_type: "student",
                school_id: "DS-002",
                phone_number: "9990002222",
                grades: { math: { score: "72", grade: "C" }, programming: { score: "68", grade: "D+" } },
                interview_report: "Needs improvement in programming fundamentals.",
                approved: true
            }
        ];

        for (const user of seedData) {
            await upsertUser(user);
        }

        return res.json({ success: true, message: 'Demo students seeded in MongoDB.' });
    } catch (err) {
        console.error('seed-demo error:', err);
        return res.status(500).json({ success: false, message: 'Failed to seed demo data', error: String(err) });
    }
});


// --- VERCEL DEPLOYMENT ---
// This runs the server *only* when you are testing locally
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`\n--- SERVER IS RUNNING FOR LOCAL TESTING ---`);
        console.log(`--- http://localhost:${PORT} ---`);
        console.log('WEBSITE_URL:', WEBSITE_URL);
        console.log('ALLOWED_ORIGINS:', ALLOWED_ORIGINS);
    });
}

// 7. Export the app for Vercel
module.exports = app;