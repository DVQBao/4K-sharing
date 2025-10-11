// Test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing MongoDB connection...');
console.log('Connection string:', process.env.MONGODB_URI ? '✅ Found' : '❌ Not found');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ SUCCESS! Connected to MongoDB Atlas');
        console.log('📊 Database name:', mongoose.connection.name);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection FAILED:', err.message);
        process.exit(1);
    });

