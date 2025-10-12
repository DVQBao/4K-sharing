// ========================================
// Netflix Guest Helper - Background Service Worker
// Manifest V3 compatible
// ========================================

console.log('🔧 Netflix Guest Extension - Background Script Loaded');

// ========================================
// MESSAGE LISTENERS
// ========================================

/**
 * Lắng nghe message từ external sources (web app)
 * Manifest V3: chrome.runtime.onMessageExternal
 */
chrome.runtime.onMessageExternal.addListener(
    async (request, sender, sendResponse) => {
        console.log('📨 Received external message:', request);
        
        // Ping check - kiểm tra extension có hoạt động không
        if (request.action === 'ping') {
            sendResponse({ status: 'ok', version: '1.0.0' });
            return true;
        }
        
        // Test commands
        if (request.action === 'testCookieAPI') {
            try {
                const cookies = await chrome.cookies.getAll({ domain: '.netflix.com' });
                sendResponse({ success: true, count: cookies.length });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            return true;
        }
        
        if (request.action === 'testTabsAPI') {
            try {
                const allTabs = await chrome.tabs.query({});
                const netflixTabs = await chrome.tabs.query({ url: '*://*.netflix.com/*' });
                sendResponse({ 
                    success: true, 
                    totalTabs: allTabs.length,
                    netflixTabs: netflixTabs.length
                });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
            return true;
        }
        
        if (request.action === 'echo') {
            sendResponse({ 
                success: true, 
                echo: request.data,
                timestamp: Date.now()
            });
            return true;
        }
        
        // Inject cookie - chức năng chính
        if (request.action === 'injectCookie') {
            try {
                console.log('🚀 Starting cookie injection process...');
                
                // Bước 1: Tìm tab Netflix
                const netflixTab = await findNetflixTab(request.tabName);
                
                if (!netflixTab) {
                    console.error('❌ Netflix tab not found');
                    sendResponse({ 
                        success: false, 
                        error: 'Netflix tab not found. Please open Netflix first.' 
                    });
                    return true;
                }
                
                console.log(`✅ Found Netflix tab: ${netflixTab.id}`, netflixTab);
                
                // Bước 2: Xóa toàn bộ cookies Netflix cũ
                await clearNetflixCookies();
                console.log('🗑️ Cleared existing Netflix cookies');
                
                // Bước 3: Inject cookie mới
                await injectCookies(request.cookieData);
                console.log('✅ Injected new cookies');
                
                // Bước 4: Reload tab Netflix
                await chrome.tabs.reload(netflixTab.id);
                console.log('🔄 Reloaded Netflix tab');
                
                // Bước 5: Monitor tab để phát hiện /browse
                monitorNetflixTab(netflixTab.id);
                
                sendResponse({ success: true });
                
            } catch (error) {
                console.error('❌ Cookie injection error:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            }
            
            return true; // Keep channel open for async response
        }
        
        // Handle refreshNetflixTab request
        if (request.action === 'refreshNetflixTab') {
            (async () => {
                try {
                    // Find Netflix tab
                    const tabs = await chrome.tabs.query({
                        url: 'https://www.netflix.com/*'
                    });
                    
                    if (tabs.length === 0) {
                        sendResponse({ 
                            success: false, 
                            error: 'No Netflix tab found' 
                        });
                        return;
                    }
                    
                    const netflixTab = tabs[0];
                    
                    // Reload the tab
                    await chrome.tabs.reload(netflixTab.id);
                    console.log('🔄 Netflix tab refreshed');
                    
                    sendResponse({ success: true });
                    
                } catch (error) {
                    console.error('❌ Refresh Netflix tab error:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message 
                    });
                }
            })();
            
            return true; // Keep channel open for async response
        }
        
        // Handle checkNetflixStatus request
        if (request.action === 'checkNetflixStatus') {
            (async () => {
                try {
                    // Find Netflix tab
                    const tabs = await chrome.tabs.query({
                        url: 'https://www.netflix.com/*'
                    });
                    
                    if (tabs.length === 0) {
                        sendResponse({ 
                            success: false, 
                            error: 'No Netflix tab found' 
                        });
                        return;
                    }
                    
                    const netflixTab = tabs[0];
                    
                    // Send message to content script to check login status
                    const response = await chrome.tabs.sendMessage(netflixTab.id, {
                        action: 'checkLoginStatus'
                    });
                    
                    if (response && response.success) {
                        sendResponse({
                            success: true,
                            loginStatus: 'success',
                            url: response.url
                        });
                    } else if (response && response.errorCode) {
                        sendResponse({
                            success: true,
                            loginStatus: 'error',
                            errorCode: response.errorCode
                        });
                    } else {
                        sendResponse({
                            success: true,
                            loginStatus: 'unknown'
                        });
                    }
                    
                } catch (error) {
                    console.error('❌ Check Netflix status error:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message 
                    });
                }
            })();
            
            return true; // Keep channel open for async response
        }
        
        // Handle focusNetflixTab request - Force focus Netflix tab
        if (request.action === 'focusNetflixTab') {
            (async () => {
                try {
                    console.log('🔍 Searching for Netflix tab to focus...');
                    
                    // Find Netflix tab
                    const tabs = await chrome.tabs.query({
                        url: 'https://www.netflix.com/*'
                    });
                    
                    if (tabs.length === 0) {
                        console.warn('⚠️ No Netflix tab found');
                        sendResponse({ 
                            success: false, 
                            error: 'No Netflix tab found' 
                        });
                        return;
                    }
                    
                    const netflixTab = tabs[0];
                    console.log('✅ Found Netflix tab:', netflixTab.id);
                    
                    // Activate the tab
                    await chrome.tabs.update(netflixTab.id, { active: true });
                    console.log('✅ Tab activated');
                    
                    // Focus the window containing the tab
                    await chrome.windows.update(netflixTab.windowId, { focused: true });
                    console.log('✅ Window focused');
                    
                    sendResponse({ 
                        success: true,
                        tabId: netflixTab.id,
                        windowId: netflixTab.windowId
                    });
                    
                } catch (error) {
                    console.error('❌ Focus Netflix tab error:', error);
                    sendResponse({ 
                        success: false, 
                        error: error.message 
                    });
                }
            })();
            
            return true; // Keep channel open for async response
        }
        
        return false;
    }
);

/**
 * Lắng nghe message từ content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Received message from content script:', request);
    
    // Content script báo đã vào /browse thành công
    if (request.action === 'loginSuccess') {
        console.log('🎉 Netflix login successful!');
        
        // Gửi notification về web app (nếu cần)
        notifyWebApp({
            status: 'success',
            message: 'Netflix login successful'
        });
        
        // Hiển thị notification trên Netflix page
        chrome.tabs.sendMessage(sender.tab.id, {
            action: 'showSuccessNotification'
        });
    }
    
    return false;
});

// ========================================
// CORE FUNCTIONS
// ========================================

/**
 * Tìm tab Netflix đang mở
 * @param {string} tabName - Window name được set từ web app
 * @returns {Promise<chrome.tabs.Tab|null>}
 */
async function findNetflixTab(tabName = 'NETFLIX_TAB') {
    try {
        // Query tất cả tabs Netflix
        const tabs = await chrome.tabs.query({
            url: '*://*.netflix.com/*'
        });
        
        console.log(`🔍 Found ${tabs.length} Netflix tabs`);
        
        if (tabs.length === 0) {
            return null;
        }
        
        // Ưu tiên tab có window.name khớp (cần content script support)
        // Hiện tại trả về tab Netflix đầu tiên
        return tabs[0];
        
    } catch (error) {
        console.error('Error finding Netflix tab:', error);
        return null;
    }
}

/**
 * Xóa toàn bộ cookies Netflix
 */
async function clearNetflixCookies() {
    const netflixDomains = [
        '.netflix.com',
        'www.netflix.com',
        'netflix.com'
    ];
    
    for (const domain of netflixDomains) {
        try {
            // Get all cookies for domain
            const cookies = await chrome.cookies.getAll({
                domain: domain
            });
            
            console.log(`🗑️ Removing ${cookies.length} cookies for ${domain}`);
            
            // Remove each cookie
            for (const cookie of cookies) {
                await chrome.cookies.remove({
                    url: `https://${cookie.domain}${cookie.path}`,
                    name: cookie.name
                });
            }
            
        } catch (error) {
            console.warn(`Warning: Could not clear cookies for ${domain}:`, error);
        }
    }
}

/**
 * Inject cookies mới vào Netflix
 * @param {Object|Array} cookieData - Cookie data (object hoặc array)
 */
async function injectCookies(cookieData) {
    // Chuyển thành array nếu là single object
    const cookies = Array.isArray(cookieData) ? cookieData : [cookieData];
    
    console.log(`📝 Injecting ${cookies.length} cookie(s)...`);
    
    for (const cookie of cookies) {
        try {
            // Parse cookie nếu là string format
            const parsedCookie = typeof cookie === 'string' 
                ? parseCookieString(cookie) 
                : cookie;
            
            // Set cookie
            const details = {
                url: 'https://www.netflix.com',
                name: parsedCookie.name,
                value: parsedCookie.value,
                domain: parsedCookie.domain || '.netflix.com',
                path: parsedCookie.path || '/',
                secure: parsedCookie.secure !== undefined ? parsedCookie.secure : true,
                httpOnly: parsedCookie.httpOnly || false,
                sameSite: 'no_restriction'
            };
            
            // Add expiration if provided
            if (parsedCookie.expirationDate) {
                details.expirationDate = parsedCookie.expirationDate;
            }
            
            await chrome.cookies.set(details);
            console.log(`✅ Set cookie: ${parsedCookie.name}`);
            
        } catch (error) {
            console.error(`❌ Failed to set cookie:`, error);
            throw error;
        }
    }
}

/**
 * Parse cookie từ string format (NetflixId=value)
 */
function parseCookieString(cookieStr) {
    const match = cookieStr.match(/^([^=]+)=(.+)$/);
    if (!match) {
        throw new Error('Invalid cookie string format');
    }
    
    return {
        name: match[1].trim(),
        value: match[2].trim(),
        domain: '.netflix.com',
        path: '/',
        secure: true,
        httpOnly: false
    };
}

/**
 * Monitor tab Netflix để phát hiện khi vào /browse
 */
function monitorNetflixTab(tabId) {
    console.log(`👀 Monitoring tab ${tabId} for /browse...`);
    
    // Listen for tab updates
    const updateListener = (updatedTabId, changeInfo, tab) => {
        if (updatedTabId !== tabId) return;
        
        // Check if navigated to /browse
        if (changeInfo.url && changeInfo.url.includes('/browse')) {
            console.log('🎉 Successfully navigated to /browse!');
            
            // Remove listener
            chrome.tabs.onUpdated.removeListener(updateListener);
            
            // Notify content script
            chrome.tabs.sendMessage(tabId, {
                action: 'showSuccessNotification'
            }).catch(err => {
                console.log('Note: Could not send message to content script:', err);
            });
        }
    };
    
    chrome.tabs.onUpdated.addListener(updateListener);
    
    // Timeout after 30 seconds
    setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(updateListener);
        console.log('⏱️ Monitoring timeout');
    }, 30000);
}

/**
 * Gửi notification về web app (nếu cần)
 */
function notifyWebApp(data) {
    // Store in chrome.storage để web app có thể query
    chrome.storage.local.set({
        lastInjectionStatus: {
            ...data,
            timestamp: Date.now()
        }
    });
}

// ========================================
// INSTALLATION HANDLER
// ========================================

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('🎉 Netflix Guest Helper installed!');
        
        // Mở trang hướng dẫn (optional)
        // chrome.tabs.create({
        //     url: 'https://yourdomain.com/setup'
        // });
    } else if (details.reason === 'update') {
        console.log('🔄 Netflix Guest Helper updated to version', chrome.runtime.getManifest().version);
    }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Broadcast presence to web pages
 * Giúp web app detect extension
 */
function broadcastPresence() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && (tab.url.includes('localhost') || tab.url.includes('127.0.0.1'))) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'extensionReady',
                    version: '1.0.0'
                }).catch(() => {
                    // Ignore errors for tabs without content script
                });
            }
        });
    });
}

// Broadcast on startup
broadcastPresence();

console.log('✅ Background script ready');

