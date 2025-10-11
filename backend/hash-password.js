// ========================================
// Hash Password Tool
// ========================================

const bcrypt = require('bcryptjs');

async function hashPassword() {
    const password = 'your_new_password_here'; // Thay đổi password ở đây
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔐 Original password:', password);
        console.log('🔒 Hashed password:', hashedPassword);
        console.log('\n📋 Copy hashed password vào admin-auth.js:');
        console.log(`password: '${hashedPassword}', // password: ${password}`);
    } catch (error) {
        console.error('❌ Error hashing password:', error);
    }
}

hashPassword();
