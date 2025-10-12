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
        console.log('🍪 New Cookie ID:', cookieId);
        
        const User = require('../models/User');
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // ====================================
        // BƯỚC 1: Tìm và release cookie cũ (nếu có)
        // ====================================
        const oldCookie = await Cookie.findOne({ 
            currentUsers: userId
        });
        
        if (oldCookie && oldCookie._id.toString() !== cookieId) {
            console.log(`🔄 User was using old cookie #${oldCookie.cookieNumber}, releasing it...`);
            console.log(`📊 OLD Cookie BEFORE release: ${oldCookie.currentUsers.length}/${oldCookie.maxUsers} users`);
            
            // Release user từ cookie cũ - dùng $pull để chắc chắn
            const updateResult = await Cookie.updateOne(
                { _id: oldCookie._id },
                { 
                    $pull: { currentUsers: userId },
                    isActive: false,
                    notes: `cookie die, recheck (auto-replaced by #${cookieId.substring(0, 6)}) - ${new Date().toLocaleString('vi-VN')}`
                }
            );
            
            console.log(`✅ Update result:`, updateResult);
            
            // Fetch lại để verify
            const updatedOldCookie = await Cookie.findById(oldCookie._id);
            console.log(`📊 OLD Cookie AFTER release: ${updatedOldCookie.currentUsers.length}/${updatedOldCookie.maxUsers} users`);
            console.log(`📝 OLD Cookie status: isActive=${updatedOldCookie.isActive}`);
            console.log(`📝 OLD Cookie notes: ${updatedOldCookie.notes}`);
            
            if (updatedOldCookie.currentUsers.length === oldCookie.currentUsers.length) {
                console.error(`❌ WARNING: User was NOT removed from old cookie! Still ${updatedOldCookie.currentUsers.length} users`);
            } else {
                console.log(`✅ User successfully removed from old cookie #${oldCookie.cookieNumber}`);
            }
            
        } else if (oldCookie && oldCookie._id.toString() === cookieId) {
            console.log(`ℹ️ User already using this cookie #${oldCookie.cookieNumber}, no need to release`);
        } else {
            console.log('ℹ️ User has no old cookie to release');
        }
        
        // ====================================
        // BƯỚC 2: Validate cookie mới
        // ====================================
        const newCookie = await Cookie.findById(cookieId);
        
        if (!newCookie) {
            console.log('❌ New cookie not found:', cookieId);
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        if (!newCookie.isActive) {
            console.log('❌ New cookie is not active:', cookieId);
            return res.status(410).json({ error: 'Cookie is no longer active' });
        }
        
        if (newCookie.isExpired()) {
            console.log('❌ New cookie expired:', cookieId);
            return res.status(410).json({ error: 'Cookie expired' });
        }
        
        // ====================================
        // BƯỚC 3: Assign cookie mới (tăng slot +1)
        // ====================================
        console.log(`📊 NEW Cookie BEFORE assign: ${newCookie.currentUsers.length}/${newCookie.maxUsers} users`);
        
        await newCookie.assignToUser(userId);
        
        // Fetch lại để verify
        const verifiedNewCookie = await Cookie.findById(newCookie._id);
        console.log(`📊 NEW Cookie AFTER assign: ${verifiedNewCookie.currentUsers.length}/${verifiedNewCookie.maxUsers} users`);
        console.log(`✅ Cookie #${verifiedNewCookie.cookieNumber} CONFIRMED and assigned to user:`, req.user.email);
        
        // ====================================
        // BƯỚC 4: Cập nhật User.assignedCookie
        // ====================================
        user.assignedCookie = verifiedNewCookie._id;
        await user.save();
        console.log(`✅ Updated user.assignedCookie to #${verifiedNewCookie.cookieNumber}`);
        console.log(`📋 Summary: Old cookie slot decreased, New cookie slot increased, User.assignedCookie updated`);
        
        res.json({
            success: true,
            message: 'Cookie confirmed and assigned successfully',
            cookieNumber: verifiedNewCookie.cookieNumber,
            sharedUsers: verifiedNewCookie.currentUsers.length,
            replacedOldCookie: oldCookie ? {
                cookieNumber: oldCookie.cookieNumber,
                newStatus: 'die, recheck'
            } : null
        });
        
    } catch (error) {
        console.error('❌ Cookie confirm error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/cookies/:id/report-failed - User báo cáo cookie lỗi (không cần admin)
router.post('/:id/report-failed', authenticateToken, async (req, res) => {
    try {
        const cookieId = req.params.id;
        const { errorCode } = req.body;
        const userId = req.user.userId;
        
        console.log(`⚠️ User ${req.user.email} reporting failed cookie:`, cookieId);
        console.log(`📋 Error code:`, errorCode);
        
        const cookie = await Cookie.findById(cookieId);
        
        if (!cookie) {
            console.log('❌ Cookie not found:', cookieId);
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        console.log(`📊 Cookie #${cookie.cookieNumber} BEFORE mark die:`);
        console.log(`   - isActive: ${cookie.isActive}`);
        console.log(`   - currentUsers: ${cookie.currentUsers.length}/${cookie.maxUsers}`);
        console.log(`   - notes: ${cookie.notes || '(empty)'}`);
        
        // Mark cookie as failed
        cookie.isActive = false;
        cookie.notes = `cookie die, recheck - Error: ${errorCode || 'UNKNOWN'} - Reported by ${req.user.email} - ${new Date().toLocaleString('vi-VN')}`;
        await cookie.save();
        
        console.log(`✅ Cookie #${cookie.cookieNumber} AFTER mark die:`);
        console.log(`   - isActive: ${cookie.isActive}`);
        console.log(`   - currentUsers: ${cookie.currentUsers.length}/${cookie.maxUsers} (unchanged - not assigned)`);
        console.log(`   - notes: ${cookie.notes}`);
        
        res.json({
            success: true,
            message: 'Cookie marked as failed successfully',
            cookieNumber: cookie.cookieNumber,
            status: 'die, recheck'
        });
        
    } catch (error) {
        console.error('❌ Report failed cookie error:', error);
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

