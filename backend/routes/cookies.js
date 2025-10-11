// ========================================
// Cookie Routes - Lấy Netflix cookie
// ========================================

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Netflix cookie mẫu - Trong production sẽ quản lý pool cookies
const NETFLIX_COOKIE = 'NetflixId=v%3D3%26ct%3DBgjHlOvcAxL2Arigp8V5bErQqO0COTaSWib2zCUeC2qiNuXTYbv1SJ9nhrt-7hEakEDvt7HJVrkyGs09kIVt7M53Z8NzdbE75FOamF5q6XftereeruBU5v4pBNggbg97HNTqBxw2gE-UUt3hzyadHcNbdz8TQKYOtcyEmcBaxoXsAJR13QSyFT2-3RRQyYlM_H0O4BrTAczVvAc3SVKd2mkNtwf2CYjlaEVviS7JEDUFG2o4eMAE3db3aDn62DLw5AXK2C7YaKVfpv7nsfDitbTp1p0apNMByQEqNOq3dusmNVCIuHlH2HVhAiLO8_94BB2I0I49ebiC4XPX0fGYTqGDuU1gCkwYOxhMEQhysBmb8KKfbGdZhYn84_q0xRYcTUi_-DFI3nf8Jb8PogIWMh3o4vRH6oa2RzYwYvHr_RHH3Nifx_f5hKBX4L2u6DYSAcC2H2svlWGy2h-b-1AC4YhO821XH6zEWazzCs6poe0bo4jSuRBDny2Ql_xf0zbaGAYiDgoMzOor99BBEbYgNYcv%26pg%3DBCLYEPK2DJD2BDL7SZZ7JKLCRY%26ch%3DAQEAEAABABSiReww9rblxsEScDlWQSttVWEyFcNQGZc.';

// GET /api/cookies/get - Lấy cookie Netflix
router.get('/get', authenticateToken, async (req, res) => {
    try {
        // Parse cookie string
        const match = NETFLIX_COOKIE.match(/^([^=]+)=(.+)$/);
        
        if (!match) {
            throw new Error('Invalid cookie format');
        }
        
        const cookieData = {
            name: match[1].trim(),
            value: match[2].trim(),
            domain: '.netflix.com',
            path: '/',
            secure: true,
            httpOnly: false
        };
        
        console.log('✅ Cookie provided to user:', req.user.email);
        
        res.json({
            success: true,
            cookie: cookieData
        });
        
    } catch (error) {
        console.error('❌ Cookie error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

