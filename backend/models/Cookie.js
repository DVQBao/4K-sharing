// ========================================
// Cookie Model
// ========================================

const mongoose = require('mongoose');

const cookieSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        default: 'NetflixId'
    },
    value: {
        type: String,
        required: true
    },
    domain: {
        type: String,
        default: '.netflix.com'
    },
    path: {
        type: String,
        default: '/'
    },
    secure: {
        type: Boolean,
        default: true
    },
    httpOnly: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    lastUsed: {
        type: Date,
        default: null
    },
    usageCount: {
        type: Number,
        default: 0
    },
    cookieNumber: {
        type: Number,
        default: 0
    },
    maxUsers: {
        type: Number,
        default: 4
    },
    currentUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    source: {
        type: String,
        enum: ['manual', 'api', 'generated', 'import', 'sample'],
        default: 'manual'
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for performance
cookieSchema.index({ isActive: 1, usedBy: 1 });
cookieSchema.index({ expiresAt: 1 });
cookieSchema.index({ lastUsed: 1 });

// Method to check if cookie is expired
cookieSchema.methods.isExpired = function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
};

// Method to check if cookie is available (for Free users - max 4 users/cookie)
cookieSchema.methods.isAvailable = function() {
    return this.isActive && !this.isExpired() && this.currentUsers.length < this.maxUsers;
};

// Method to assign to user (support multiple users for Free plan)
cookieSchema.methods.assignToUser = function(userId) {
    // Check if user already assigned
    if (!this.currentUsers.includes(userId)) {
        this.currentUsers.push(userId);
    }
    this.lastUsed = new Date();
    this.usageCount += 1;
    return this.save();
};

// Method to release from user
cookieSchema.methods.releaseFromUser = function(userId) {
    if (userId) {
        // Remove specific user
        this.currentUsers = this.currentUsers.filter(id => id.toString() !== userId.toString());
    } else {
        // Remove all users
        this.currentUsers = [];
    }
    return this.save();
};

module.exports = mongoose.model('Cookie', cookieSchema);
