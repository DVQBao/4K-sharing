// ========================================
// Migration Script: Update monthlyReportLimit based on plan
// ========================================
// 
// This script updates all existing users' monthlyReportLimit to match their plan:
// - Free users: 2 quota
// - Pro users: 5 quota
//
// Usage: node migrate-quota-by-plan.js
//

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { COOKIE_LIMITS } = require('./models/User');

async function migrateQuotas() {
    try {
        console.log('🔄 Starting migration: Update monthlyReportLimit by plan...\n');
        
        // Connect to MongoDB
        const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/netflix-sharing';
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to migrate\n`);
        
        let freeCount = 0;
        let proCount = 0;
        let errorCount = 0;
        
        // Update each user
        for (const user of users) {
            try {
                const oldLimit = user.monthlyReportLimit;
                const newLimit = COOKIE_LIMITS[user.plan] || COOKIE_LIMITS.free;
                
                user.monthlyReportLimit = newLimit;
                await user.save();
                
                if (user.plan === 'pro') {
                    proCount++;
                } else {
                    freeCount++;
                }
                
                console.log(`✅ ${user.email} (${user.plan}): ${oldLimit} → ${newLimit}`);
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Error updating ${user.email}:`, error.message);
            }
        }
        
        console.log('\n========================================');
        console.log('📊 Migration Summary:');
        console.log(`   • Free users updated: ${freeCount} (quota: 2)`);
        console.log(`   • Pro users updated: ${proCount} (quota: 5)`);
        console.log(`   • Errors: ${errorCount}`);
        console.log('========================================\n');
        
        console.log('✅ Migration completed successfully!');
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateQuotas();

