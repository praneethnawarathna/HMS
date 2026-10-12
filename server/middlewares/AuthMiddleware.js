const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization']; // Standard header access

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Extract token after "Bearer"

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded._id || decoded.user?._id || decoded.user?.id;

        if (!userId) {
            return res.status(401).json({
                code: 'AUTH_TOKEN_INVALID',
                message: 'Invalid token payload: missing user ID'
            });
        }

        req.user = {
            id: userId,
            email: decoded.email || decoded.user?.email || null,
            username: decoded.username || decoded.user?.username || null
        };
        next();

    } catch (error) {
        console.error('JWT Error:', error.message);
        const expired = error.name === 'TokenExpiredError';
        res.status(401).json({
            code: expired ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
            message: expired ? 'Authentication token has expired.' : 'Invalid authentication token.'
        });
    }
};

module.exports = { authMiddleware };
