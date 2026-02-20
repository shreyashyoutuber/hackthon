const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    full_name: {
        type: String,
        required: true
    },
    user_type: {
        type: String,
        enum: ['student', 'teacher', 'admin', 'both'],
        default: 'student'
    },
    school_id: {
        type: String,
        trim: true
    },
    phone_number: {
        type: String,
        trim: true
    },
    grades: {
        type: Map,
        of: new mongoose.Schema({
            score: String,
            grade: String
        }, { _id: false }),
        default: {}
    },
    interview_report: {
        type: String,
        default: ''
    },
    approved: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    minimize: false // Ensure empty objects like grades are saved
});

module.exports = mongoose.model('User', UserSchema);
