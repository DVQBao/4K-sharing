// ========================================
// Admin Authentication Middleware
// ========================================

const jwt = require('jsonwebtoken');

const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user is admin
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        
        // Add admin info to request
        req.admin = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
        };
        
        next();
        
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { authenticateAdmin };
