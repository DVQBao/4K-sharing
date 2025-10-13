// ========================================
// Auth Routes - Đăng ký, Đăng nhập
// ========================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { getRequestInfo } = require('../utils/requestInfo');

// ========================================
// POST /api/auth/register - Đăng ký
// ========================================

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, provider } = req.body;
        
        // Validate
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        if (provider === 'local' && !password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // ====================================
        // Get registration info (IP, Device, Location)
        // ====================================
        const { ip, device, location } = await getRequestInfo(req);
        
        console.log(`📝 New registration attempt from IP: ${ip}, Device: ${device}, Location: ${location}`);
        
        // ====================================
        // Anti-spam: Check registrations from same IP in last 24h
        // ====================================
        const MAX_REGISTRATIONS_PER_IP = 3; // Allow max 3 accounts per IP per day
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const recentRegistrations = await User.countDocuments({
            registrationIP: ip,
            createdAt: { $gte: oneDayAgo }
        });
        
        if (recentRegistrations >= MAX_REGISTRATIONS_PER_IP && ip !== 'Unknown' && !ip.includes('Local')) {
            console.log(`⚠️ Registration blocked: IP ${ip} exceeded limit (${recentRegistrations}/${MAX_REGISTRATIONS_PER_IP})`);
            return res.status(429).json({ 
                error: `Bạn đã tạo quá nhiều tài khoản từ máy này (${recentRegistrations}/${MAX_REGISTRATIONS_PER_IP}). Vui lòng thử lại sau 24 giờ.`,
                retryAfter: '24 hours'
            });
        }
        
        // Create user
        const user = new User({
            name,
            email,
            password,
            provider: provider || 'local',
            registrationIP: ip,
            registrationDevice: device,
            registrationLocation: location,
            // Auto-login on registration: Update lastLogin fields
            lastLogin: new Date(),
            lastLoginIP: ip,
            lastLoginDevice: device,
            lastLoginLocation: location
        });
        
        // Add to login history
        user.loginHistory.unshift({ ip, device, location });
        
        await user.save();
        
        // Auto assign cookie for new user
        const Cookie = require('../models/Cookie');
        let assignedCookie = null;
        
        try {
            // Find available cookie
            const cookie = await Cookie.findOne({ 
                isActive: true,
                $expr: { $lt: [{ $size: "$currentUsers" }, "$maxUsers"] },
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: new Date() } }
                ]
            }).sort({ cookieNumber: 1, usageCount: 1 });
            
            if (cookie) {
                await cookie.assignToUser(user._id);
                assignedCookie = cookie;
                console.log(`🍪 Auto assigned Cookie #${cookie.cookieNumber} to new user: ${email}`);
            } else {
                console.log('⚠️ No available cookies for new user:', email);
            }
        } catch (cookieError) {
            console.error('❌ Cookie assignment error:', cookieError);
            // Continue registration even if cookie assignment fails
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('✅ New user registered:', email);
        
        res.status(201).json({
            success: true,
            token,
            user: user.toJSON(),
            assignedCookie: assignedCookie ? {
                cookieNumber: assignedCookie.cookieNumber,
                usersCount: assignedCookie.currentUsers.length
            } : null
        });
        
    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// POST /api/auth/login - Đăng nhập
// ========================================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Check if account is locked
        if (user.isLocked) {
            return res.status(403).json({ error: 'Account is locked. Please contact admin.' });
        }
        
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Get request info (IP, device, location)
        const { ip, device, location } = await getRequestInfo(req);
        
        // Update last login with tracking info
        user.lastLogin = new Date();
        user.lastLoginIP = ip;
        user.lastLoginDevice = device;
        user.lastLoginLocation = location;
        
        // Add to login history (keep last 10 entries)
        user.loginHistory.unshift({ ip, device, location });
        if (user.loginHistory.length > 10) {
            user.loginHistory = user.loginHistory.slice(0, 10);
        }
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        console.log('✅ User logged in:', email);
        
        res.json({
            success: true,
            token,
            user: user.toJSON()
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// GET /api/auth/me - Get current user with cookie info
// ========================================

router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get assigned cookie info
        const Cookie = require('../models/Cookie');
        let cookieInfo = null;
        
        try {
            const cookie = await Cookie.findOne({ 
                currentUsers: req.user.userId,
                isActive: true 
            });
            
            if (cookie) {
                cookieInfo = {
                    cookieNumber: cookie.cookieNumber,
                    usersCount: cookie.currentUsers.length,
                    maxUsers: cookie.maxUsers,
                    expiresAt: cookie.expiresAt,
                    isExpired: cookie.isExpired()
                };
            }
        } catch (cookieError) {
            console.error('❌ Get cookie info error:', cookieError);
        }
        
        res.json({
            success: true,
            user: user.toJSON(),
            cookieInfo
        });
        
    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

