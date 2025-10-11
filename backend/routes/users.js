// ========================================
// User Routes
// ========================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// GET /api/users/profile - Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
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
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/users/profile - Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (name) user.name = name;
        
        await user.save();
        
        res.json({
            success: true,
            user: user.toJSON()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

