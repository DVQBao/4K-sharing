// ========================================
// Import 100 Netflix Cookies Script
// ========================================

require('dotenv').config();
const mongoose = require('mongoose');
const Cookie = require('./models/Cookie');

// Sample Netflix cookies (100 cookies)
const SAMPLE_COOKIES = [
    'NetflixId=v%3D3%26ct%3DBgjHlOvcAxL2Arigp8V5bErQqO0COTaSWib2zCUeC2qiNuXTYbv1SJ9nhrt-7hEakEDvt7HJVrkyGs09kIVt7M53Z8NzdbE75FOamF5q6XftereeruBU5v4pBNggbg97HNTqBxw2gE-UUt3hzyadHcNbdz8TQKYOtcyEmcBaxoXsAJR13QSyFT2-3RRQyYlM_H0O4BrTAczVvAc3SVKd2mkNtwf2CYjlaEVviS7JEDUFG2o4eMAE3db3aDn62DLw5AXK2C7YaKVfpv7nsfDitbTp1p0apNMByQEqNOq3dusmNVCIuHlH2HVhAiLO8_94BB2I0I49ebiC4XPX0fGYTqGDuU1gCkwYOxhMEQhysBmb8KKfbGdZhYn84_q0xRYcTUi_-DFI3nf8Jb8PogIWMh3o4vRH6oa2RzYwYvHr_RHH3Nifx_f5hKBX4L2u6DYSAcC2H2svlWGy2h-b-1AC4YhO821XH6zEWazzCs6poe0bo4jSuRBDny2Ql_xf0zbaGAYiDgoMzOor99BBEbYgNYcv%26pg%3DBCLYEPK2DJD2BDL7SZZ7JKLCRY%26ch%3DAQEAEAABABSiReww9rblxsEScDlWQSttVWEyFcNQGZc.',
    // Thêm 99 cookies khác ở đây...
];

// Generate 100 unique cookies
function generateCookies() {
    const cookies = [];
    const baseValue = 'v%3D3%26ct%3DBgjHlOvcAxL2Arigp8V5bErQqO0COTaSWib2zCUeC2qiNuXTYbv1SJ9nhrt-7hEakEDvt7HJVrkyGs09kIVt7M53Z8NzdbE75FOamF5q6XftereeruBU5v4pBNggbg97HNTqBxw2gE-UUt3hzyadHcNbdz8TQKYOtcyEmcBaxoXsAJR13QSyFT2-3RRQyYlM_H0O4BrTAczVvAc3SVKd2mkNtwf2CYjlaEVviS7JEDUFG2o4eMAE3db3aDn62DLw5AXK2C7YaKVfpv7nsfDitbTp1p0apNMByQEqNOq3dusmNVCIuHlH2HVhAiLO8_94BB2I0I49ebiC4XPX0fGYTqGDuU1gCkwYOxhMEQhysBmb8KKfbGdZhYn84_q0xRYcTUi_-DFI3nf8Jb8PogIWMh3o4vRH6oa2RzYwYvHr_RHH3Nifx_f5hKBX4L2u6DYSAcC2H2svlWGy2h-b-1AC4YhO821XH6zEWazzCs6poe0bo4jSuRBDny2Ql_xf0zbaGAYiDgoMzOor99BBEbYgNYcv%26pg%3DBCLYEPK2DJD2BDL7SZZ7JKLCRY%26ch%3DAQEAEAABABSiReww9rblxsEScDlWQSttVWEyFcNQGZc.';
    
    for (let i = 1; i <= 100; i++) {
        // Tạo unique value cho mỗi cookie
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
            source: 'imported',
            notes: `Imported cookie #${i} - Generated for testing`
        });
    }
    
    return cookies;
}

async function importCookies() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Clear existing cookies
        await Cookie.deleteMany({});
        console.log('🗑️ Cleared existing cookies');
        
        // Generate cookies
        const cookies = generateCookies();
        console.log(`📦 Generated ${cookies.length} cookies`);
        
        // Insert cookies
        const savedCookies = await Cookie.insertMany(cookies);
        console.log(`✅ Imported ${savedCookies.length} cookies successfully`);
        
        // Show statistics
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
                    }
                }
            }
        ]);
        
        console.log('📊 Cookie Statistics:', stats[0]);
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Import error:', error);
        process.exit(1);
    }
}

// Run import
importCookies();
