// ========================================
// Request Info Utilities
// Extract IP, Device, Location from HTTP request
// ========================================

/**
 * Get client IP address from request
 * Priority: Cloudflare → X-Real-IP → X-Forwarded-For → Direct IP
 */
function getClientIP(req) {
    // Priority 1: Cloudflare CF-Connecting-IP (most reliable behind CF)
    let ip = req.headers['cf-connecting-ip'];
    if (ip && !isPrivateIP(ip)) {
        return ip;
    }
    
    // Priority 2: X-Real-IP (nginx/reverse proxy)
    ip = req.headers['x-real-ip'];
    if (ip && !isPrivateIP(ip)) {
        return ip;
    }
    
    // Priority 3: X-Forwarded-For (may contain chain, take first public IP)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',').map(ip => ip.trim());
        for (const candidateIP of ips) {
            if (!isPrivateIP(candidateIP)) {
                return candidateIP;
            }
        }
    }
    
    // Priority 4: Direct connection IP
    ip = req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip;
    
    return ip || 'Unknown';
}

/**
 * Check if IP is private/local
 */
function isPrivateIP(ip) {
    if (!ip || ip === 'Unknown') return true;
    
    // Remove IPv6 prefix if present
    ip = ip.replace(/^::ffff:/, '');
    
    // Private IP ranges
    return ip.startsWith('127.') ||      // Localhost
           ip.startsWith('10.') ||        // Private Class A
           ip.startsWith('192.168.') ||   // Private Class C
           ip.startsWith('172.16.') ||    // Private Class B (172.16-31)
           ip.startsWith('172.17.') ||
           ip.startsWith('172.18.') ||
           ip.startsWith('172.19.') ||
           ip.startsWith('172.20.') ||
           ip.startsWith('172.21.') ||
           ip.startsWith('172.22.') ||
           ip.startsWith('172.23.') ||
           ip.startsWith('172.24.') ||
           ip.startsWith('172.25.') ||
           ip.startsWith('172.26.') ||
           ip.startsWith('172.27.') ||
           ip.startsWith('172.28.') ||
           ip.startsWith('172.29.') ||
           ip.startsWith('172.30.') ||
           ip.startsWith('172.31.') ||
           ip === '::1' ||                // IPv6 localhost
           ip === 'localhost';
}

/**
 * Parse User-Agent to get device info
 */
function getDeviceInfo(req) {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Simple parsing (can be enhanced with ua-parser-js library)
    let os = 'Unknown OS';
    let browser = 'Unknown Browser';
    
    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'MacOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    // Detect Browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';
    
    return `${os} / ${browser}`;
}

// In-memory cache for geo-location (24 hours TTL)
const geoCache = new Map();
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get approximate location from IP
 * Uses cache to reduce API calls
 */
async function getLocationFromIP(ip) {
    // Skip for localhost/private IPs
    if (isPrivateIP(ip)) {
        return 'Local Network';
    }
    
    // Check cache first
    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL) {
        return cached.location;
    }
    
    try {
        // Try Cloudflare headers first (fastest, no API call needed)
        // Note: This requires Cloudflare to be enabled on your domain
        
        // Fallback to IP geolocation API
        // Using ip-api.com (free, 45 req/min limit)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
            timeout: 3000 // 3 second timeout
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            const location = `${data.city || ''}, ${data.regionName || ''}, ${data.country || ''}`.replace(/^, |, $/g, '');
            
            // Cache the result
            geoCache.set(ip, {
                location,
                timestamp: Date.now()
            });
            
            return location;
        }
    } catch (error) {
        console.error('❌ IP geolocation error:', error.message);
    }
    
    return 'Unknown Location';
}

/**
 * Clear expired cache entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of geoCache.entries()) {
        if (now - data.timestamp > GEO_CACHE_TTL) {
            geoCache.delete(ip);
        }
    }
}, 60 * 60 * 1000); // Clean every hour

/**
 * Get all request info at once
 */
async function getRequestInfo(req) {
    const ip = getClientIP(req);
    const device = getDeviceInfo(req);
    const location = await getLocationFromIP(ip);
    
    return { ip, device, location };
}

module.exports = {
    getClientIP,
    getDeviceInfo,
    getLocationFromIP,
    getRequestInfo,
    isPrivateIP
};

