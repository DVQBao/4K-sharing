// ========================================
// Netflix Guest Sharing - Backend Server
// ========================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors({
    origin: [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'https://dvqbao.github.io'
    ],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// DATABASE CONNECTION
// ========================================

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📊 Database:', mongoose.connection.name);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
});

// ========================================
// ROUTES
// ========================================

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const cookieRoutes = require('./routes/cookies');
const adminRoutes = require('./routes/admin');
const adminAuthRoutes = require('./routes/admin-auth');
const adminCookieRoutes = require('./routes/admin-cookies');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cookies', cookieRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/admin/cookies', adminCookieRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({
        message: '🎬 Netflix Guest Sharing API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                me: 'GET /api/auth/me'
            },
            users: {
                profile: 'GET /api/users/profile',
                update: 'PUT /api/users/profile'
            },
            cookies: {
                get: 'GET /api/cookies/get'
            },
            admin: {
                users: 'GET /api/admin/users',
                upgrade: 'PUT /api/admin/users/:id/upgrade',
                downgrade: 'PUT /api/admin/users/:id/downgrade'
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  🎬 Netflix Backend Server Started    ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                           ║
║  Environment: ${process.env.NODE_ENV}        ║
║  Frontend: ${process.env.FRONTEND_URL}
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, closing server...');
    mongoose.connection.close();
    process.exit(0);
});

