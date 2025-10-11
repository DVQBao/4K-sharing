// ========================================
// Cookie Routes - Quản lý Netflix cookies
// ========================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Cookie = require('../models/Cookie');

// GET /api/cookies/guest - Lấy cookie Netflix cho guest
router.get('/guest', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log('🍪 Cookie request from user:', req.user.email, 'ID:', userId);
        
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Pro users get dedicated cookie (1 user/cookie)
        // Free users share cookie (4 users/cookie)
        
        // Tìm cookie đang được user sử dụng
        let cookie = await Cookie.findOne({ 
            currentUsers: userId,
            isActive: true 
        });
        
        console.log('🔍 Existing cookie for user:', cookie ? `#${cookie.cookieNumber}` : 'None');
        
        // Nếu chưa có cookie, tìm cookie available
        if (!cookie) {
            console.log('🔍 Searching for available cookie...');
            // Tìm cookie còn slot (< maxUsers)
            cookie = await Cookie.findOne({ 
                isActive: true,
                $expr: { $lt: [{ $size: "$currentUsers" }, "$maxUsers"] },
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: new Date() } }
                ]
            }).sort({ cookieNumber: 1, usageCount: 1 }); // Ưu tiên cookie số nhỏ và ít dùng
            
            if (!cookie) {
                console.log('❌ No available cookies found');
                return res.status(503).json({ 
                    error: 'No cookies available. Please try again later.' 
                });
            }
            
            console.log('✅ Found available cookie:', `#${cookie.cookieNumber}`);
            // Assign cookie to user
            await cookie.assignToUser(userId);
            console.log('✅ Assigned cookie to user');
        }
        
        // Check if cookie is expired
        if (cookie.isExpired()) {
            await cookie.releaseFromUser(userId);
            return res.status(410).json({ 
                error: 'Cookie expired. Please try again.' 
            });
        }
        
        // Clean cookie value - remove "NetflixId=" prefix if exists
        let cleanValue = cookie.value;
        if (cleanValue.startsWith('NetflixId=')) {
            cleanValue = cleanValue.substring('NetflixId='.length);
            console.log('🧹 Cleaned cookie value (removed NetflixId= prefix)');
        }
        
        const cookieData = {
            name: cookie.name,
            value: cleanValue,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly
        };
        
        console.log(`✅ Cookie #${cookie.cookieNumber} provided to user:`, req.user.email, `(${cookie.currentUsers.length}/${cookie.maxUsers} users)`);
        console.log('🍪 Cookie value preview:', cleanValue.substring(0, 50) + '...');
        
        res.json({
            success: true,
            cookie: cookieData,
            cookieNumber: cookie.cookieNumber,
            sharedUsers: cookie.currentUsers.length
        });
        
    } catch (error) {
        console.error('❌ Cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/cookies/status - Kiểm tra trạng thái cookie của user
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const cookie = await Cookie.findOne({ 
            usedBy: userId, 
            isActive: true 
        });
        
        if (!cookie) {
            return res.json({
                success: true,
                hasCookie: false,
                message: 'No active cookie assigned'
            });
        }
        
        res.json({
            success: true,
            hasCookie: true,
            cookie: {
                id: cookie._id,
                expiresAt: cookie.expiresAt,
                isExpired: cookie.isExpired(),
                lastUsed: cookie.lastUsed,
                usageCount: cookie.usageCount
            }
        });
        
    } catch (error) {
        console.error('❌ Cookie status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/cookies/release - Release cookie từ user
router.post('/release', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const cookie = await Cookie.findOne({ 
            usedBy: userId, 
            isActive: true 
        });
        
        if (!cookie) {
            return res.json({
                success: true,
                message: 'No cookie to release'
            });
        }
        
        await cookie.releaseFromUser();
        
        console.log('✅ Cookie released by user:', req.user.email);
        
        res.json({
            success: true,
            message: 'Cookie released successfully'
        });
        
    } catch (error) {
        console.error('❌ Cookie release error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

