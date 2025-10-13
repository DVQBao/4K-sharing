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
        
        console.log(`🔧 Admin assigning cookie...`);
        console.log(`👤 User ID: ${id}`);
        console.log(`🍪 Cookie ID: ${cookieId}`);
        
        const user = await User.findById(id);
        if (!user) {
            console.log('❌ User not found');
            return res.status(404).json({ error: 'User not found' });
        }
        
        const newCookie = await Cookie.findById(cookieId);
        if (!newCookie) {
            console.log('❌ Cookie not found');
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        console.log(`📊 User: ${user.email}`);
        console.log(`📊 New Cookie: #${newCookie.cookieNumber}`);
        
        // ====================================
        // BƯỚC 1: Release user from ALL old cookies
        // ====================================
        const releaseResult = await Cookie.updateMany(
            { currentUsers: user._id },
            { $pull: { currentUsers: user._id } }
        );
        console.log(`✅ Released user from ${releaseResult.modifiedCount} old cookie(s)`);
        
        // ====================================
        // BƯỚC 2: Assign to new cookie
        // ====================================
        const oldUserCount = newCookie.currentUsers.length;
        
        if (!newCookie.currentUsers.some(uid => uid.toString() === user._id.toString())) {
            newCookie.currentUsers.push(user._id);
            newCookie.lastUsed = new Date();
            newCookie.usageCount += 1;
            await newCookie.save();
            console.log(`✅ Added user to cookie #${newCookie.cookieNumber}`);
        } else {
            console.log(`ℹ️ User already in cookie #${newCookie.cookieNumber}`);
        }
        
        // Fetch lại để verify
        const verifiedCookie = await Cookie.findById(cookieId);
        console.log(`📊 Cookie #${verifiedCookie.cookieNumber}: ${oldUserCount}/${verifiedCookie.maxUsers} → ${verifiedCookie.currentUsers.length}/${verifiedCookie.maxUsers}`);
        
        // ====================================
        // BƯỚC 3: Update User.assignedCookie
        // ====================================
        user.assignedCookie = newCookie._id;
        await user.save();
        console.log(`✅ Updated user.assignedCookie to Cookie #${newCookie.cookieNumber}`);
        
        console.log(`✅ Admin assigned Cookie #${newCookie.cookieNumber} to user: ${user.email}`);
        
        res.json({
            success: true,
            message: `Assigned Cookie #${newCookie.cookieNumber} to user`,
            cookieNumber: newCookie.cookieNumber,
            sharedUsers: verifiedCookie.currentUsers.length
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

// ========================================
// POST /api/admin-users/auto-assign - Auto-assign cookies to users without cookie
// ========================================

router.post('/auto-assign', async (req, res) => {
    try {
        console.log('\n🤖 ========== AUTO-ASSIGN COOKIES START ==========');
        
        // ====================================
        // BƯỚC 1: Tìm tất cả users chưa có cookie
        // ====================================
        const usersWithoutCookie = await User.find({
            $or: [
                { assignedCookie: null },
                { assignedCookie: { $exists: false } }
            ]
        });
        
        console.log(`📊 Found ${usersWithoutCookie.length} users without cookie`);
        
        if (usersWithoutCookie.length === 0) {
            return res.json({
                success: true,
                message: 'Tất cả users đã có cookie',
                assigned: 0,
                failed: 0,
                details: []
            });
        }
        
        // ====================================
        // BƯỚC 2: Tìm tất cả cookies còn slot
        // ====================================
        const availableCookies = await Cookie.find({ 
            isActive: true,
            $expr: { $lt: [{ $size: "$currentUsers" }, "$maxUsers"] }
        }).sort({ currentUsers: 1, cookieNumber: 1 }); // Ưu tiên cookie ít users nhất
        
        console.log(`🍪 Found ${availableCookies.length} cookies with available slots`);
        
        if (availableCookies.length === 0) {
            return res.json({
                success: false,
                message: 'Không có cookie nào còn slot trống',
                assigned: 0,
                failed: usersWithoutCookie.length,
                details: usersWithoutCookie.map(u => ({
                    user: u.email,
                    status: 'failed',
                    reason: 'No available cookies'
                }))
            });
        }
        
        // ====================================
        // BƯỚC 3: Tự động gán cookie cho users
        // ====================================
        const results = {
            assigned: 0,
            failed: 0,
            details: []
        };
        
        for (const user of usersWithoutCookie) {
            try {
                // Tìm cookie còn slot
                let assignedCookie = null;
                
                for (const cookie of availableCookies) {
                    // Refresh cookie data để đảm bảo currentUsers là mới nhất
                    const freshCookie = await Cookie.findById(cookie._id);
                    
                    if (freshCookie && freshCookie.currentUsers.length < freshCookie.maxUsers) {
                        assignedCookie = freshCookie;
                        break;
                    }
                }
                
                if (!assignedCookie) {
                    console.log(`❌ No slot available for user: ${user.email}`);
                    results.failed++;
                    results.details.push({
                        user: user.email,
                        status: 'failed',
                        reason: 'No available slots'
                    });
                    continue;
                }
                
                // ====================================
                // BƯỚC 3A: Release user from ALL old cookies (nếu có)
                // ====================================
                await Cookie.updateMany(
                    { currentUsers: user._id },
                    { $pull: { currentUsers: user._id } }
                );
                
                // ====================================
                // BƯỚC 3B: Assign user to new cookie
                // ====================================
                if (!assignedCookie.currentUsers.some(uid => uid.toString() === user._id.toString())) {
                    assignedCookie.currentUsers.push(user._id);
                    assignedCookie.lastUsed = new Date();
                    assignedCookie.usageCount += 1;
                    await assignedCookie.save();
                }
                
                // ====================================
                // BƯỚC 3C: Update user.assignedCookie
                // ====================================
                user.assignedCookie = assignedCookie._id;
                await user.save();
                
                console.log(`✅ Assigned Cookie #${assignedCookie.cookieNumber} to ${user.email}`);
                results.assigned++;
                results.details.push({
                    user: user.email,
                    status: 'success',
                    cookieNumber: assignedCookie.cookieNumber
                });
                
            } catch (err) {
                console.error(`❌ Error assigning cookie to ${user.email}:`, err);
                results.failed++;
                results.details.push({
                    user: user.email,
                    status: 'error',
                    reason: err.message
                });
            }
        }
        
        console.log(`\n📊 AUTO-ASSIGN RESULTS:`);
        console.log(`   ✅ Assigned: ${results.assigned}`);
        console.log(`   ❌ Failed: ${results.failed}`);
        console.log('🤖 ========== AUTO-ASSIGN COOKIES END ==========\n');
        
        res.json({
            success: true,
            message: `Đã tự động gán ${results.assigned} cookies`,
            assigned: results.assigned,
            failed: results.failed,
            details: results.details
        });
        
    } catch (error) {
        console.error('❌ Auto-assign cookies error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

