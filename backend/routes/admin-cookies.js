// ========================================
// Admin Cookie Routes - Quản lý cookies
// ========================================

const express = require('express');
const router = express.Router();
const Cookie = require('../models/Cookie');
const { authenticateAdmin } = require('../middleware/admin-auth');

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
