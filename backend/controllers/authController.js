import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Sign JWT token
 * @param {string} id - User ID to be encoded in the token
 * @returns {string} JWT token
 */
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
});

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const register = async (req, res) => {
    try {
        const { email, password, fullName, companyName } = req.body;
        const newUser = await User.create({
            email,
            password,
            fullName,
            companyName,
        });

        const token = signToken(newUser._id);

        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: newUser,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

/**
 * Log in a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and password',
            });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user || !(await user.correctPassword(password))) {
            return res.status(401).json({
                status: 'fail',
                message: 'Incorrect email or password',
            });
        }

        const token = signToken(user._id);
        return res.status(200).json({
            status: 'success',
            token,
        });
    } catch (err) {
        return res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};