// ========================================
// Request Info Utilities
// Extract IP, Device, Location from HTTP request
// ========================================

/**
 * Get client IP address from request
 */
function getClientIP(req) {
    // Try various headers for IP (for proxies/load balancers)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    
    return req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || 
           'Unknown';
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

/**
 * Get approximate location from IP (basic implementation)
 * For production, use ip-api.com or ipinfo.io API
 */
async function getLocationFromIP(ip) {
    // Skip for localhost/private IPs
    if (ip === 'Unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'Local Network';
    }
    
    try {
        // Free IP geolocation API (100 requests/day limit)
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`);
        const data = await response.json();
        
        if (data.status === 'success') {
            return `${data.city || ''}, ${data.regionName || ''}, ${data.country || ''}`.replace(/^, |, $/g, '');
        }
    } catch (error) {
        console.error('❌ IP geolocation error:', error);
    }
    
    return 'Unknown Location';
}

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
    getRequestInfo
};

