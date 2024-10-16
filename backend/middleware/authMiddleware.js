
// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect routes - Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            [, token] = req.headers.authorization.split(' ');
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in! Please log in to get access.',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: 'fail',
                message: 'The user belonging to this token no longer exists.',
            });
        }

        req.user = currentUser;
        return next();
    } catch (err) {
        return res.status(401).json({
            status: 'fail',
            message: 'Authentication failed',
        });
    }
};
