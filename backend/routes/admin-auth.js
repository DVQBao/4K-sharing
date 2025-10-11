// ========================================
// Admin Authentication Routes
// ========================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ========================================
// ADMIN CREDENTIALS (Hardcoded for security)
// ========================================

const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
    role: 'admin'
};

// ========================================
// POST /api/admin/login - Admin Login
// ========================================

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Check credentials
        if (username !== ADMIN_CREDENTIALS.username) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: 'admin',
                username: ADMIN_CREDENTIALS.username,
                role: 'admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('✅ Admin logged in:', username);
        
        res.json({
            success: true,
            token,
            user: {
                username: ADMIN_CREDENTIALS.username,
                role: ADMIN_CREDENTIALS.role
            }
        });
        
    } catch (error) {
        console.error('❌ Admin login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// POST /api/admin/verify - Verify Admin Token
// ========================================

router.post('/verify', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        res.json({
            success: true,
            user: {
                username: decoded.username,
                role: decoded.role
            }
        });
        
    } catch (error) {
        console.error('❌ Admin verify error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
