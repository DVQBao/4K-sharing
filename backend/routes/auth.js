// ========================================
// Auth Routes - Đăng ký, Đăng nhập
// ========================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// ========================================
// POST /api/auth/register - Đăng ký
// ========================================

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, provider } = req.body;
        
        // Validate
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        if (provider === 'local' && !password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Create user
        const user = new User({
            name,
            email,
            password,
            provider: provider || 'local'
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        
        console.log('✅ New user registered:', email);
        
        res.status(201).json({
            success: true,
            token,
            user: user.toJSON()
        });
        
    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// POST /api/auth/login - Đăng nhập
// ========================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        
        console.log('✅ User logged in:', email);
        
        res.json({
            success: true,
            token,
            user: user.toJSON()
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// GET /api/auth/me - Get current user
// ========================================

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: user.toJSON()
        });
        
    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

