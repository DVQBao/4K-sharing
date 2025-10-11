// ========================================
// Admin User Management Routes
// ========================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Cookie = require('../models/Cookie');
const { authenticateAdmin } = require('../middleware/admin-auth');
const bcrypt = require('bcryptjs');

// All routes require admin authentication
router.use(authenticateAdmin);

// ========================================
// PUT /api/admin-users/:id - Edit user info
// ========================================

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, plan, proExpiresAt, isLocked } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (plan) {
            user.plan = plan;
            if (plan === 'pro' && proExpiresAt) {
                user.proExpiresAt = new Date(proExpiresAt);
            } else if (plan === 'free') {
                user.proExpiresAt = null;
            }
        }
        if (typeof isLocked === 'boolean') {
            user.isLocked = isLocked;
        }
        
        await user.save();
        
        console.log(`✅ Admin updated user: ${user.email}`);
        
        res.json({
            success: true,
            message: 'User updated successfully',
            user: user.toJSON()
        });
        
    } catch (error) {
        console.error('❌ Update user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// POST /api/admin-users/:id/reset-password - Reset password
// ========================================

router.post('/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        await user.save();
        
        console.log(`✅ Admin reset password for user: ${user.email}`);
        
        res.json({
            success: true,
            message: 'Password reset successfully',
            newPassword: newPassword // Return to show in admin panel
        });
        
    } catch (error) {
        console.error('❌ Reset password error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// POST /api/admin-users/:id/assign-cookie - Assign cookie manually
// ========================================

router.post('/:id/assign-cookie', async (req, res) => {
    try {
        const { id } = req.params;
        const { cookieId } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const cookie = await Cookie.findById(cookieId);
        if (!cookie) {
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        // Release user from current cookie
        await Cookie.updateMany(
            { currentUsers: user._id },
            { $pull: { currentUsers: user._id } }
        );
        
        // Assign to new cookie
        if (!cookie.currentUsers.includes(user._id)) {
            cookie.currentUsers.push(user._id);
            await cookie.save();
        }
        
        console.log(`✅ Admin assigned Cookie #${cookie.cookieNumber} to user: ${user.email}`);
        
        res.json({
            success: true,
            message: `Assigned Cookie #${cookie.cookieNumber} to user`,
            cookieNumber: cookie.cookieNumber
        });
        
    } catch (error) {
        console.error('❌ Assign cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// POST /api/admin-users/:id/lock - Lock/Unlock account
// ========================================

router.post('/:id/lock', async (req, res) => {
    try {
        const { id } = req.params;
        const { isLocked } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.isLocked = isLocked;
        await user.save();
        
        console.log(`✅ Admin ${isLocked ? 'locked' : 'unlocked'} user: ${user.email}`);
        
        res.json({
            success: true,
            message: `User ${isLocked ? 'locked' : 'unlocked'} successfully`,
            isLocked: user.isLocked
        });
        
    } catch (error) {
        console.error('❌ Lock/unlock user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// GET /api/admin-users/:id/login-history - Get login history
// ========================================

router.get('/:id/login-history', async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findById(id).select('loginHistory email name');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            email: user.email,
            name: user.name,
            loginHistory: user.loginHistory || []
        });
        
    } catch (error) {
        console.error('❌ Get login history error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

