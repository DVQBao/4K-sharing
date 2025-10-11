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
        
        // Tìm cookie đang được user sử dụng
        let cookie = await Cookie.findOne({ 
            usedBy: userId, 
            isActive: true 
        });
        
        // Nếu chưa có cookie, tìm cookie available
        if (!cookie) {
            cookie = await Cookie.findOne({ 
                isActive: true,
                usedBy: null,
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: new Date() } }
                ]
            });
            
            if (!cookie) {
                return res.status(503).json({ 
                    error: 'No cookies available. Please try again later.' 
                });
            }
            
            // Assign cookie to user
            await cookie.assignToUser(userId);
        }
        
        // Check if cookie is expired
        if (cookie.isExpired()) {
            await cookie.releaseFromUser();
            return res.status(410).json({ 
                error: 'Cookie expired. Please try again.' 
            });
        }
        
        const cookieData = {
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly
        };
        
        console.log('✅ Cookie provided to user:', req.user.email, 'Cookie ID:', cookie._id);
        
        res.json({
            success: true,
            cookie: cookieData
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

