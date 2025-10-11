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
            usedBy: null,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });
        const used = await Cookie.countDocuments({ usedBy: { $ne: null } });
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

// POST /api/admin/cookies - Thêm cookies mới
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const { cookies, source = 'manual' } = req.body;
        
        if (!cookies || !Array.isArray(cookies)) {
            return res.status(400).json({ error: 'Cookies array is required' });
        }
        
        const cookieDocs = cookies.map(cookieData => ({
            name: cookieData.name || 'NetflixId',
            value: cookieData.value,
            domain: cookieData.domain || '.netflix.com',
            path: cookieData.path || '/',
            secure: cookieData.secure !== false,
            httpOnly: cookieData.httpOnly || false,
            expiresAt: cookieData.expiresAt ? new Date(cookieData.expiresAt) : null,
            source,
            notes: cookieData.notes || ''
        }));
        
        const savedCookies = await Cookie.insertMany(cookieDocs);
        
        console.log(`✅ ${savedCookies.length} cookies added by admin`);
        
        res.status(201).json({
            success: true,
            message: `${savedCookies.length} cookies added successfully`,
            cookies: savedCookies
        });
        
    } catch (error) {
        console.error('❌ Add cookies error:', error);
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

// DELETE /api/admin/cookies/:id - Xóa cookie
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const cookie = await Cookie.findByIdAndDelete(id);
        
        if (!cookie) {
            return res.status(404).json({ error: 'Cookie not found' });
        }
        
        console.log('✅ Cookie deleted by admin:', id);
        
        res.json({
            success: true,
            message: 'Cookie deleted successfully'
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

// POST /api/admin/cookies/bulk-import - Import nhiều cookies
router.post('/bulk-import', authenticateAdmin, async (req, res) => {
    try {
        const { cookies, source = 'manual' } = req.body;
        
        if (!cookies || !Array.isArray(cookies)) {
            return res.status(400).json({ error: 'Cookies array is required' });
        }
        
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };
        
        for (let i = 0; i < cookies.length; i++) {
            try {
                const cookieData = cookies[i];
                
                const cookie = new Cookie({
                    name: cookieData.name || 'NetflixId',
                    value: cookieData.value,
                    domain: cookieData.domain || '.netflix.com',
                    path: cookieData.path || '/',
                    secure: cookieData.secure !== false,
                    httpOnly: cookieData.httpOnly || false,
                    expiresAt: cookieData.expiresAt ? new Date(cookieData.expiresAt) : null,
                    source,
                    notes: cookieData.notes || `Imported from bulk import - Row ${i + 1}`
                });
                
                await cookie.save();
                results.success++;
                
            } catch (error) {
                results.failed++;
                results.errors.push({
                    row: i + 1,
                    error: error.message
                });
            }
        }
        
        console.log(`✅ Bulk import completed: ${results.success} success, ${results.failed} failed`);
        
        res.json({
            success: true,
            message: `Bulk import completed: ${results.success} success, ${results.failed} failed`,
            results
        });
        
    } catch (error) {
        console.error('❌ Bulk import error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
