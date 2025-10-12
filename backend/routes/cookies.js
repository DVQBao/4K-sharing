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
        const { skipCurrent, excludeIds } = req.query;
        
        console.log('🍪 Cookie request from user:', req.user.email, 'ID:', userId);
        console.log('📋 Request params:', { skipCurrent, excludeIds });
        
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Pro users get dedicated cookie (1 user/cookie)
        // Free users share cookie (4 users/cookie)
        
        let cookie = null;
        
        // Nếu KHÔNG yêu cầu bỏ qua cookie hiện tại, tìm cookie đang được user sử dụng
        if (skipCurrent !== 'true') {
            cookie = await Cookie.findOne({ 
                currentUsers: userId,
                isActive: true 
            });
            
            console.log('🔍 Existing cookie for user:', cookie ? `#${cookie.cookieNumber}` : 'None');
        } else {
            console.log('⏭️ Skipping current cookie as requested');
        }
        
        // Nếu chưa có cookie, tìm cookie available
        if (!cookie) {
            console.log('🔍 Searching for available cookie...');
            
            // Build query
            let query = {
                isActive: true,
                $expr: { $lt: [{ $size: "$currentUsers" }, "$maxUsers"] },
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: new Date() } }
                ]
            };
            
            // Bỏ qua cookie hiện tại nếu yêu cầu
            if (skipCurrent === 'true') {
                query.currentUsers = { $ne: userId };
            }
            
            // Bỏ qua các cookie đã thử (excludeIds)
            if (excludeIds) {
                try {
                    // Parse excludeIds - có thể là string hoặc array
                    let idsToExclude = [];
                    if (typeof excludeIds === 'string') {
                        // Nếu là string, cố gắng parse JSON hoặc split bằng dấu phẩy
                        try {
                            idsToExclude = JSON.parse(excludeIds);
                        } catch {
                            idsToExclude = excludeIds.split(',').map(id => id.trim()).filter(id => id);
                        }
                    } else if (Array.isArray(excludeIds)) {
                        idsToExclude = excludeIds;
                    }
                    
                    if (idsToExclude.length > 0) {
                        query._id = { $nin: idsToExclude };
                        console.log('🚫 Excluding cookies:', idsToExclude);
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to parse excludeIds:', error);
                }
            }
            
            // Tìm cookie còn slot (< maxUsers)
            cookie = await Cookie.findOne(query)
                .sort({ cookieNumber: 1, usageCount: 1 }); // Ưu tiên cookie số nhỏ và ít dùng
            
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
            cookie: {
                ...cookieData,
                _id: cookie._id.toString() // Thêm ID để frontend track
            },
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

// GET /api/cookies/preview - Preview cookie KHÔNG assign (dùng cho retry logic)
router.get('/preview', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { skipCurrent, excludeIds } = req.query;
        
        console.log('👀 Cookie PREVIEW request from user:', req.user.email, 'ID:', userId);
        console.log('📋 Request params:', { skipCurrent, excludeIds });
        
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Build query - tìm cookie available KHÔNG gán user
        let query = {
            isActive: true,
            $expr: { $lt: [{ $size: "$currentUsers" }, "$maxUsers"] },
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        };
        
        // Bỏ qua cookie hiện tại nếu yêu cầu
        if (skipCurrent === 'true') {
            query.currentUsers = { $ne: userId };
        }
        
        // Bỏ qua các cookie đã thử (excludeIds)
        if (excludeIds) {
            try {
                let idsToExclude = [];
                if (typeof excludeIds === 'string') {
                    try {
                        idsToExclude = JSON.parse(excludeIds);
                    } catch {
                        idsToExclude = excludeIds.split(',').map(id => id.trim()).filter(id => id);
                    }
                } else if (Array.isArray(excludeIds)) {
                    idsToExclude = excludeIds;
                }
                
                if (idsToExclude.length > 0) {
                    query._id = { $nin: idsToExclude };
                    console.log('🚫 Excluding cookies:', idsToExclude);
                }
            } catch (error) {
                console.warn('⚠️ Failed to parse excludeIds:', error);
            }
        }
        
        // Tìm cookie còn slot - KHÔNG assign
        const cookie = await Cookie.findOne(query)
            .sort({ cookieNumber: 1, usageCount: 1 });
        
        if (!cookie) {
            console.log('❌ No available cookies found for preview');
            return res.status(503).json({ 
                error: 'No cookies available. Please try again later.' 
            });
        }
        
        console.log('✅ Found cookie for preview:', `#${cookie.cookieNumber}`);
        console.log('⚠️ Cookie NOT assigned yet - waiting for confirmation');
        
        // Clean cookie value
        let cleanValue = cookie.value;
        if (cleanValue.startsWith('NetflixId=')) {
            cleanValue = cleanValue.substring('NetflixId='.length);
        }
        
        const cookieData = {
            name: cookie.name,
            value: cleanValue,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly
        };
        
        res.json({
            success: true,
            cookie: {
                ...cookieData,
                _id: cookie._id.toString()
            },
            cookieNumber: cookie.cookieNumber,
            sharedUsers: cookie.currentUsers.length // Số user hiện tại (chưa +1)
        });
        
    } catch (error) {
        console.error('❌ Cookie preview error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/cookies/confirm - Confirm cookie assignment (gọi khi login success)
router.post('/confirm', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { cookieId } = req.body;
        
        if (!cookieId) {
            return res.status(400).json({ error: 'cookieId is required' });
        }
        
        console.log('✅ Cookie CONFIRM request from user:', req.user.email);
        console.log('🍪 Cookie ID:', cookieId);
        
        const cookie = await Cookie.findById(cookieId);
        
        if (!cookie) {
            console.log('❌ Cookie not found:', cookieId);
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        if (!cookie.isActive) {
            console.log('❌ Cookie is not active:', cookieId);
            return res.status(410).json({ error: 'Cookie is no longer active' });
        }
        
        // Check if cookie is expired
        if (cookie.isExpired()) {
            console.log('❌ Cookie expired:', cookieId);
            return res.status(410).json({ error: 'Cookie expired' });
        }
        
        // Assign cookie to user (tăng slot +1)
        await cookie.assignToUser(userId);
        
        console.log(`✅ Cookie #${cookie.cookieNumber} CONFIRMED and assigned to user:`, req.user.email);
        console.log(`📊 Cookie slot: ${cookie.currentUsers.length}/${cookie.maxUsers}`);
        
        res.json({
            success: true,
            message: 'Cookie confirmed and assigned successfully',
            cookieNumber: cookie.cookieNumber,
            sharedUsers: cookie.currentUsers.length
        });
        
    } catch (error) {
        console.error('❌ Cookie confirm error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/cookies/release - Release cookie từ user
router.post('/release', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const cookie = await Cookie.findOne({ 
            currentUsers: userId,
            isActive: true 
        });
        
        if (!cookie) {
            return res.json({
                success: true,
                message: 'No cookie to release'
            });
        }
        
        await cookie.releaseFromUser(userId);
        
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

