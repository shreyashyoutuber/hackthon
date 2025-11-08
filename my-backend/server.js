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














// 1. Import the tools
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path'); 

// 2. Create the app
const app = express();
const PORT = 3000;

// --- CONFIGURATION ---
const ADMIN_EMAIL = 'shreyashmahagaon@gmail.com'; // The email that gets approval requests
// ---------------------

// 3. --- Load database from file ---
let mockUserDatabase = JSON.parse(fs.readFileSync('database.json'));
console.log('Database loaded from file.');

// This temporarily holds users during the signup process
const tempUserDatabase = {};

// 4. Create the Email Transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'shreyashmahagaon@gmail.com',
        pass: 'yhnjmglmgskzfjyl' 
    }
});

// 5. Add the "middleware"
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
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

// --- UPDATED LOGIN ROUTE (With Approval Check) ---
app.post('/api/login', (req, res) => {
    console.log('Login attempt received!');
    const { username, password } = req.body;
    const user = mockUserDatabase[username];

    if (user && user.password === password) {
        // *** NEW SECURITY CHECK ***
        if (user.userType === 'teacher' && user.approved !== true) {
             return res.json({ success: false, message: 'Your teacher account is pending admin approval. Please wait for confirmation.' });
        }

        res.json({ success: true, message: 'Login successful!' });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

// --- GET USER PROFILE ROUTE ---
app.post('/api/my-profile', (req, res) => {
    console.log(`Profile request received for: ${req.body.email}`);
    const { email } = req.body;
    const user = mockUserDatabase[email];

    if (user) {
        res.json({
            success: true,
            fullName: user.fullName,
            email: email,
            userType: user.userType,
            schoolId: user.schoolId,
            phoneNumber: user.phoneNumber,
            grades: user.grades
        });
    } else {
        res.json({ success: false, message: 'User not found.' });
    }
});

// --- GET ALL STUDENTS ---
app.get('/api/get-all-students', (req, res) => {
    console.log('Request received for all students');
    const allUsers = mockUserDatabase;
    const studentList = [];
    for (const email in allUsers) {
        if (allUsers[email].userType === 'student') {
            const student = allUsers[email];
            studentList.push({
                id: student.schoolId, 
                email: email, 
                name: student.fullName,
                grades: student.grades || {},
                interviewReport: student.interviewReport || ''
            });
        }
    }
    res.json({ success: true, students: studentList });
});

// --- UPDATE STUDENT DATA ---
app.post('/api/update-student-data', (req, res) => {
    const { email, newGrades, newInterviewReport } = req.body;
    if (mockUserDatabase[email]) {
        mockUserDatabase[email].grades = newGrades;
        mockUserDatabase[email].interviewReport = newInterviewReport;
        saveDatabase();
        res.json({ success: true, message: 'Student updated successfully!' });
    } else {
        res.json({ success: false, message: 'Student not found.' });
    }
});

// --- TEACHER ADD STUDENT ROUTE ---
app.post('/api/teacher-add-student', (req, res) => {
    const { email, fullName, schoolId, phoneNumber, password } = req.body;
    if (mockUserDatabase[email]) {
        return res.json({ success: false, message: 'This email is already registered.' });
    }
    mockUserDatabase[email] = {
        password: password, 
        fullName: fullName,
        schoolId: schoolId,
        userType: "student", 
        phoneNumber: phoneNumber,
        grades: {}, 
        interviewReport: "" 
    };
    saveDatabase();
    res.json({ success: true, message: 'New student created successfully!' });
});

// --- HELPER: Save Database ---
function saveDatabase() {
    try {
        fs.writeFileSync('database.json', JSON.stringify(mockUserDatabase, null, 2));
        console.log('Database saved to file.');
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
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    tempUserDatabase[email] = { fullName, schoolId, userType, phoneNumber, code: verificationCode, verified: false };

    if (skipEmail) {
        tempUserDatabase[email].verified = true;
        res.json({ success: true, message: 'Skipping email.', code: verificationCode });
    } else {
        const mailOptions = {
            from: 'shreyashmahagaon@gmail.com',
            to: email,
            subject: 'Verify Your EDUWISE Account',
            html: `
                Hi ${fullName},<br><br>
                Welcome to EDUWISE! To secure your account, please verify your email address by using the code below.<br><br>
                Your verification code is:<br>
                <h2 style="font-size: 28px; letter-spacing: 2px; margin: 10px 0;">${verificationCode}</h2>
                This code is valid for the next 10 minutes.<br><br>
                If you didn't create an account with EDUWISE, please ignore this email.<br><br>
                Best,<br>
                The EDUWISE Team
            `
        };
        try {
            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: 'Verification email sent.' });
        } catch (error) {
            res.json({ success: false, message: 'Error sending verification email.' });
        }
    }
});

// STEP 2: Verify Code
app.post('/api/verify-code', (req, res) => {
    const { email, code } = req.body;
    const tempUser = tempUserDatabase[email];
    if (!tempUser) return res.json({ success: false, message: 'Error. Try again.' });

    if ((code === 'INSTANT_VERIFY_BY_TEACHER' && tempUser.verified === true) || tempUser.code === code) {
        tempUserDatabase[email].verified = true;
        res.json({ success: true, message: 'Email verified!' });
    } else {
        res.json({ success: false, message: 'Invalid code.' });
    }
});

// STEP 3: Create User (*** ADMIN APPROVAL LOGIC ***)
app.post('/api/create-user', async (req, res) => {
    console.log('Create user attempt received!');
    const { email, password } = req.body;
    const tempUser = tempUserDatabase[email];

    if (!tempUser || !tempUser.verified) {
        return res.json({ success: false, message: 'Verification required.' });
    }

    const isApproved = (tempUser.userType === 'student');

    mockUserDatabase[email] = {
        password: password,
        fullName: tempUser.fullName,
        schoolId: tempUser.schoolId,
        userType: tempUser.userType,
        phoneNumber: tempUser.phoneNumber,
        grades: {},
        interviewReport: "",
        approved: isApproved // <-- Teachers are set to 'false'
    };
    saveDatabase();

    // *** IF TEACHER, SEND EMAIL TO ADMIN ***
    if (tempUser.userType === 'teacher') {
        console.log(`Sending approval request to admin for ${email}`);
        
        const approvalLink = `http://localhost:3000/api/approve-teacher?email=${email}`;

        const adminMailOptions = {
            from: 'shreyashmahagaon@gmail.com',
            to: ADMIN_EMAIL, // Sends to YOU
            subject: 'ACTION REQUIRED: New Teacher Approval Request',
            html: `
                <h3>New Teacher Registration</h3>
                <p><strong>Name:</strong> ${tempUser.fullName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>ID:</strong> ${tempUser.schoolId}</p>
                <p>Please click the link below to approve this teacher:</p>
                <a href="${approvalLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">APPROVE TEACHER</a>
                <p>If you do not recognize this person, ignore this email.</p>
            `
        };
        await transporter.sendMail(adminMailOptions);
        
        delete tempUserDatabase[email];
        res.json({ success: true, userType: 'teacher', message: 'Account created! Please wait for admin approval.' });
    } else {
        // Normal student flow
        delete tempUserDatabase[email];
        res.json({ success: true, userType: 'student', message: 'Account created successfully!' });
    }
});

// *** NEW ROUTE: ADMIN APPROVAL CLICK ***
app.get('/api/approve-teacher', async (req, res) => {
    const emailToApprove = req.query.email;

    if (mockUserDatabase[emailToApprove]) {
        mockUserDatabase[emailToApprove].approved = true;
        saveDatabase();

        try {
            await transporter.sendMail({
                from: 'shreyashmahagaon@gmail.com',
                to: emailToApprove,
                subject: 'Your EDUWISE Teacher Account is Approved!',
                html: `<h3>Welcome aboard!</h3><p>Your account has been approved by the administrator. You can now <a href="http://localhost:3000/login.html">log in here</a>.</p>`
            });
        } catch (e) {
            console.error("Could not send approval notification email.");
        }

        res.send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1 style="color: #4CAF50;">Success!</h1>
                <p>Teacher <strong>${emailToApprove}</strong> has been approved.</p>
                <p>They can now log in to the dashboard.</p>
                <a href="http://localhost:3000/login.html">Go to Login</a>
            </div>
        `);
    } else {
        res.send('<h1>Error</h1><p>User not found.</p>');
    }
});


// 7. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});