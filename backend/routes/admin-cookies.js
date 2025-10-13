// ========================================
// Admin Cookie Routes - Quản lý cookies
// ========================================

const express = require('express');
const router = express.Router();
const Cookie = require('../models/Cookie');
const { authenticateAdmin } = require('../middleware/admin-auth');

// GET /api/admin/cookies/stats - Lấy thống kê cookies
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        const total = await Cookie.countDocuments();
        const available = await Cookie.countDocuments({ 
            isActive: true,
            $expr: { $lt: [{ $size: "$currentUsers" }, "$maxUsers"] },
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });
        const used = await Cookie.countDocuments({ 
            $expr: { $gt: [{ $size: "$currentUsers" }, 0] }
        });
        const expired = await Cookie.countDocuments({ 
            expiresAt: { $lt: new Date() } 
        });
        
        res.json({
            success: true,
            stats: {
                total,
                available,
                used,
                expired
            }
        });
    } catch (error) {
        console.error('❌ Get cookie stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/cookies - Danh sách tất cả cookies
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, status, search } = req.query;
        const skip = (page - 1) * limit;
        
        // Build filter
        let filter = {};
        
        if (status === 'active') {
            filter.isActive = true;
        } else if (status === 'inactive') {
            filter.isActive = false;
        } else if (status === 'available') {
            filter.isActive = true;
            filter.usedBy = null;
        } else if (status === 'used') {
            filter.usedBy = { $ne: null };
        } else if (status === 'expired') {
            filter.expiresAt = { $lt: new Date() };
        }
        
        if (search) {
            filter.$or = [
                { value: { $regex: search, $options: 'i' } },
                { notes: { $regex: search, $options: 'i' } }
            ];
        }
        
        const cookies = await Cookie.find(filter)
            .populate('usedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Cookie.countDocuments(filter);
        
        // Statistics
        const stats = await Cookie.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: ['$isActive', 1, 0] } },
                    available: { 
                        $sum: { 
                            $cond: [
                                { $and: ['$isActive', { $eq: ['$usedBy', null] }] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    used: { 
                        $sum: { 
                            $cond: [{ $ne: ['$usedBy', null] }, 1, 0] 
                        } 
                    },
                    expired: { 
                        $sum: { 
                            $cond: [
                                { $lt: ['$expiresAt', new Date()] }, 
                                1, 
                                0
                            ] 
                        } 
                    }
                }
            }
        ]);
        
        res.json({
            success: true,
            cookies,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            stats: stats[0] || {
                total: 0,
                active: 0,
                available: 0,
                used: 0,
                expired: 0
            }
        });
        
    } catch (error) {
        console.error('❌ Admin cookies error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/cookies - Thêm cookie mới (single)
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const { value, notes, expiresAt } = req.body;
        
        if (!value) {
            return res.status(400).json({ error: 'Cookie value is required' });
        }
        
        // Get next cookie number
        const maxCookie = await Cookie.findOne().sort({ cookieNumber: -1 });
        const nextNumber = (maxCookie?.cookieNumber || 0) + 1;
        
        const newCookie = new Cookie({
            name: 'NetflixId',
            value: value,
            domain: '.netflix.com',
            path: '/',
            secure: true,
            httpOnly: false,
            cookieNumber: nextNumber,
            maxUsers: 4,
            currentUsers: [],
            expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            source: 'manual',
            notes: notes || ''
        });
        
        await newCookie.save();
        console.log(`✅ Added new cookie #${nextNumber}`);
        
        res.status(201).json({
            success: true,
            message: `Added cookie #${nextNumber}`,
            cookie: newCookie
        });
        
    } catch (error) {
        console.error('❌ Add cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/admin/cookies/:id - Cập nhật cookie
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Remove fields that shouldn't be updated directly
        delete updateData.usedBy;
        delete updateData.lastUsed;
        delete updateData.usageCount;
        
        if (updateData.expiresAt) {
            updateData.expiresAt = new Date(updateData.expiresAt);
        }
        
        const cookie = await Cookie.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );
        
        if (!cookie) {
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        console.log('✅ Cookie updated by admin:', id);
        
        res.json({
            success: true,
            message: 'Cookie updated successfully',
            cookie
        });
        
    } catch (error) {
        console.error('❌ Update cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/cookies/delete-all - Xóa tất cả cookies
router.delete('/delete-all', authenticateAdmin, async (req, res) => {
    try {
        const User = require('../models/User');
        
        console.log(`🗑️ Starting delete all cookies...`);
        
        // ====================================
        // BƯỚC 1: Clear assignedCookie của TẤT CẢ users
        // ====================================
        const updateResult = await User.updateMany(
            { assignedCookie: { $ne: null } }, // Tìm users có assignedCookie
            { $set: { assignedCookie: null } } // Set assignedCookie = null
        );
        
        console.log(`✅ Cleared assignedCookie for ${updateResult.modifiedCount} users`);
        
        // ====================================
        // BƯỚC 2: Xóa tất cả cookies
        // ====================================
        const result = await Cookie.deleteMany({});
        console.log(`✅ Deleted all cookies: ${result.deletedCount} cookies`);
        
        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} cookies and cleared ${updateResult.modifiedCount} user assignments`,
            cookiesDeleted: result.deletedCount,
            usersAffected: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('❌ Delete all cookies error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/admin/cookies/:id - Xóa cookie
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const User = require('../models/User');
        
        console.log(`🗑️ Deleting cookie: ${id}`);
        
        // ====================================
        // BƯỚC 1: Tìm cookie để xóa
        // ====================================
        const cookie = await Cookie.findById(id);
        
        if (!cookie) {
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        console.log(`📊 Cookie #${cookie.cookieNumber} has ${cookie.currentUsers.length} users assigned`);
        
        // ====================================
        // BƯỚC 2: Clear assignedCookie của tất cả users đang dùng cookie này
        // ====================================
        const updateResult = await User.updateMany(
            { assignedCookie: id }, // Tìm users có assignedCookie trùng với cookie này
            { $set: { assignedCookie: null } } // Set assignedCookie = null
        );
        
        console.log(`✅ Cleared assignedCookie for ${updateResult.modifiedCount} users`);
        
        // ====================================
        // BƯỚC 3: Xóa cookie khỏi hệ thống
        // ====================================
        await Cookie.findByIdAndDelete(id);
        
        console.log(`✅ Cookie #${cookie.cookieNumber} deleted successfully`);
        
        res.json({
            success: true,
            message: 'Cookie deleted successfully',
            usersAffected: updateResult.modifiedCount,
            cookieNumber: cookie.cookieNumber
        });
        
    } catch (error) {
        console.error('❌ Delete cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/cookies/:id/assign - Assign cookie to user
router.post('/:id/assign', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const cookie = await Cookie.findById(id);
        
        if (!cookie) {
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        if (cookie.usedBy) {
            return res.status(400).json({ error: 'Cookie is already assigned' });
        }
        
        await cookie.assignToUser(userId);
        
        console.log('✅ Cookie assigned by admin:', id, 'to user:', userId);
        
        res.json({
            success: true,
            message: 'Cookie assigned successfully'
        });
        
    } catch (error) {
        console.error('❌ Assign cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/cookies/:id/release - Release cookie from user
router.post('/:id/release', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const cookie = await Cookie.findById(id);
        
        if (!cookie) {
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        if (!cookie.usedBy) {
            return res.status(400).json({ error: 'Cookie is not assigned' });
        }
        
        await cookie.releaseFromUser();
        
        console.log('✅ Cookie released by admin:', id);
        
        res.json({
            success: true,
            message: 'Cookie released successfully'
        });
        
    } catch (error) {
        console.error('❌ Release cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/cookies/import-sample - Import 100 sample cookies
router.post('/import-sample', authenticateAdmin, async (req, res) => {
    try {
        // Generate 100 sample cookies
        const cookies = [];
        const baseValue = 'v%3D3%26ct%3DBgjHlOvcAxL2Arigp8V5bErQqO0COTaSWib2zCUeC2qiNuXTYbv1SJ9nhrt-7hEakEDvt7HJVrkyGs09kIVt7M53Z8NzdbE75FOamF5q6XftereeruBU5v4pBNggbg97HNTqBxw2gE-UUt3hzyadHcNbdz8TQKYOtcyEmcBaxoXsAJR13QSyFT2-3RRQyYlM_H0O4BrTAczVvAc3SVKd2mkNtwf2CYjlaEVviS7JEDUFG2o4eMAE3db3aDn62DLw5AXK2C7YaKVfpv7nsfDitbTp1p0apNMByQEqNOq3dusmNVCIuHlH2HVhAiLO8_94BB2I0I49ebiC4XPX0fGYTqGDuU1gCkwYOxhMEQhysBmb8KKfbGdZhYn84_q0xRYcTUi_-DFI3nf8Jb8PogIWMh3o4vRH6oa2RzYwYvHr_RHH3Nifx_f5hKBX4L2u6DYSAcC2H2svlWGy2h-b-1AC4YhO821XH6zEWazzCs6poe0bo4jSuRBDny2Ql_xf0zbaGAYiDgoMzOor99BBEbYgNYcv%26pg%3DBCLYEPK2DJD2BDL7SZZ7JKLCRY%26ch%3DAQEAEAABABSiReww9rblxsEScDlWQSttVWEyFcNQGZc.';
        
        for (let i = 1; i <= 100; i++) {
            const uniqueSuffix = Math.random().toString(36).substring(2, 15);
            const cookieValue = baseValue + uniqueSuffix;
            
            cookies.push({
                name: 'NetflixId',
                value: cookieValue,
                domain: '.netflix.com',
                path: '/',
                secure: true,
                httpOnly: false,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                source: 'sample',
                notes: `Sample cookie #${i} - Generated for testing`
            });
        }
        
        // Clear existing cookies
        await Cookie.deleteMany({});
        console.log('🗑️ Cleared existing cookies');
        
        // Insert new cookies
        const savedCookies = await Cookie.insertMany(cookies);
        console.log(`✅ Imported ${savedCookies.length} sample cookies`);
        
        res.json({
            success: true,
            message: `Successfully imported ${savedCookies.length} sample cookies`,
            count: savedCookies.length
        });
        
    } catch (error) {
        console.error('❌ Import sample cookies error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/cookies/bulk-import - Import cookies từ file txt (mỗi dòng 1 cookie)
router.post('/bulk-import', authenticateAdmin, async (req, res) => {
    try {
        const { cookiesText, clearExisting = false } = req.body;
        
        if (!cookiesText || typeof cookiesText !== 'string') {
            return res.status(400).json({ error: 'cookiesText (string) is required' });
        }
        
        // Parse cookies từ text (mỗi dòng 1 cookie)
        const lines = cookiesText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (lines.length === 0) {
            return res.status(400).json({ error: 'No cookies found in text' });
        }
        
        // Clear existing cookies if requested
        if (clearExisting) {
            await Cookie.deleteMany({});
            console.log('🗑️ Cleared all existing cookies');
        }
        
        // Create cookies với số thứ tự
        const cookies = lines.map((cookieValue, index) => ({
            name: 'NetflixId',
            value: cookieValue,
            domain: '.netflix.com',
            path: '/',
            secure: true,
            httpOnly: false,
            cookieNumber: index + 1, // Số thứ tự từ 1
            maxUsers: 4, // 4 Free users/cookie
            currentUsers: [],
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            source: 'import',
            notes: `Imported from file - Cookie #${index + 1}`
        }));
        
        // Insert cookies
        const savedCookies = await Cookie.insertMany(cookies);
        
        console.log(`✅ Bulk imported ${savedCookies.length} cookies from file`);
        
        res.json({
            success: true,
            message: `Successfully imported ${savedCookies.length} cookies`,
            count: savedCookies.length
        });
        
    } catch (error) {
        console.error('❌ Bulk import error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
