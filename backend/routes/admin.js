// ========================================
// Admin Routes - Quản lý users
// ========================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/admin/users - Danh sách tất cả users
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        
        const stats = {
            total: users.length,
            free: users.filter(u => u.plan !== 'pro').length,
            pro: users.filter(u => u.plan === 'pro').length
        };
        
        res.json({
            success: true,
            users,
            stats
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/users/:id/upgrade - Nâng cấp Pro
router.put('/users/:id/upgrade', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.plan = 'pro';
        user.proExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await user.save();
        
        console.log('⭐ User upgraded to Pro:', user.email);
        
        res.json({
            success: true,
            message: 'User upgraded to Pro',
            user: user.toJSON()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/users/:id/downgrade - Hạ cấp Free
router.put('/users/:id/downgrade', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.plan = 'free';
        user.proExpiresAt = null;
        await user.save();
        
        console.log('⬇️ User downgraded to Free:', user.email);
        
        res.json({
            success: true,
            message: 'User downgraded to Free',
            user: user.toJSON()
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/users/:id - Xóa user
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('🗑️ User deleted:', user.email);
        
        res.json({
            success: true,
            message: 'User deleted'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

