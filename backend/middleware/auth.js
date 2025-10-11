// ========================================
// Authentication Middleware
// ========================================

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        
        req.user = decoded;
        next();
    });
}

/**
 * Check if user is admin
 */
async function isAdmin(req, res, next) {
    // Trong demo này, check email có phải admin không
    // Production: Nên có field role trong User model
    const adminEmails = ['baodvq2501@gmail.com'];
    
    if (!adminEmails.includes(req.user.email)) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
}

module.exports = {
    authenticateToken,
    isAdmin
};

