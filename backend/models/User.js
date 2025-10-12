// ========================================
// User Model
// ========================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: function() {
            return this.provider === 'local';
        },
        minlength: 8
    },
    provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    plan: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free'
    },
    proExpiresAt: {
        type: Date,
        default: null
    },
    verified: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date,
        default: null
    },
    lastLoginIP: {
        type: String,
        default: null
    },
    lastLoginDevice: {
        type: String,
        default: null
    },
    lastLoginLocation: {
        type: String,
        default: null
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    assignedCookie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cookie',
        default: null
    },
    monthlyReportLimit: {
        type: Number,
        default: 5
    },
    lastReportReset: {
        type: Date,
        default: Date.now
    },
    loginHistory: [{
        ip: String,
        device: String,
        location: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true // Tự động tạo createdAt và updatedAt
});

// Hash password trước khi save
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    if (this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Method so sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method check Pro còn hạn không
userSchema.methods.isProActive = function() {
    if (this.plan !== 'pro') return false;
    if (!this.proExpiresAt) return false;
    return new Date() < this.proExpiresAt;
};

// Ẩn password khi trả về JSON
userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);

