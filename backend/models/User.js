// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

/**
 * Hash password before saving
 * @param {Function} next - Next middleware function
 */
userSchema.pre('save', async function hashPassword(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    return next();
});

/**
 * Check if the provided password is correct
 * @param {string} candidatePassword - The password to check
 * @returns {Promise<boolean>} - True if password is correct, false otherwise
 */
userSchema.methods.correctPassword = async function correctPassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
