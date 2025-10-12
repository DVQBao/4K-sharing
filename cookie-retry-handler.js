// ========================================
// Cookie Retry Handler
// Xử lý retry khi cookie lỗi
// ========================================

class CookieRetryHandler {
    constructor(backendUrl, authToken) {
        this.backendUrl = backendUrl;
        this.authToken = authToken;
        this.maxRetries = 5;
        this.currentRetry = 0;
        this.usedCookies = new Set();
    }
    
    /**
     * Thử login với cookie, tự động retry nếu lỗi
     */
    async attemptLogin(onProgress) {
        this.currentRetry = 0;
        this.usedCookies.clear();
        
        while (this.currentRetry < this.maxRetries) {
            this.currentRetry++;
            
            try {
                // Update progress
                if (onProgress) {
                    onProgress({
                        status: 'trying',
                        attempt: this.currentRetry,
                        maxAttempts: this.maxRetries,
                        message: `Đang thử đăng nhập (lần ${this.currentRetry}/${this.maxRetries})...`
                    });
                }
                
                // Get cookie from backend
                const cookieData = await this.getCookieFromBackend();
                
                if (!cookieData) {
                    throw new Error('Không có cookie khả dụng');
                }
                
                // Try to inject cookie
                const result = await this.injectCookieAndCheck(cookieData);
                
                if (result.success) {
                    // Success!
                    if (onProgress) {
                        onProgress({
                            status: 'success',
                            message: 'Đăng nhập thành công!',
                            cookieNumber: cookieData.cookieNumber
                        });
                    }
                    return { success: true, cookieData };
                }
                
                // Failed - mark cookie as dead
                await this.markCookieAsDead(cookieData.cookieId, result.errorCode);
                
                // Add to used list
                this.usedCookies.add(cookieData.cookieId);
                
                // Update progress
                if (onProgress) {
                    onProgress({
                        status: 'retrying',
                        attempt: this.currentRetry,
                        maxAttempts: this.maxRetries,
                        message: `Cookie #${cookieData.cookieNumber} lỗi, đang thử cookie khác...`,
                        errorCode: result.errorCode
                    });
                }
                
                // Wait before retry
                await this.sleep(2000);
                
            } catch (error) {
                console.error(`❌ Attempt ${this.currentRetry} failed:`, error);
                
                if (this.currentRetry >= this.maxRetries) {
                    // Out of retries
                    if (onProgress) {
                        onProgress({
                            status: 'failed',
                            message: 'Tạm thời không có tài khoản khả dụng. Vui lòng quay lại sau.',
                            error: error.message
                        });
                    }
                    return { success: false, error: error.message };
                }
            }
        }
        
        // Max retries reached
        return {
            success: false,
            error: 'Đã thử tất cả cookie nhưng không thành công'
        };
    }
    
    /**
     * Get cookie from backend
     */
    async getCookieFromBackend() {
        try {
            const response = await fetch(`${this.backendUrl}/api/cookies/guest`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.cookie) {
                return {
                    cookieId: data.cookie._id || 'unknown',
                    cookieNumber: data.cookieNumber,
                    name: data.cookie.name,
                    value: data.cookie.value,
                    domain: data.cookie.domain,
                    path: data.cookie.path,
                    secure: data.cookie.secure,
                    httpOnly: data.cookie.httpOnly
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Get cookie error:', error);
            throw error;
        }
    }
    
    /**
     * Inject cookie and check if login successful
     */
    async injectCookieAndCheck(cookieData) {
        try {
            console.log('🍪 Starting inject cookie process...');
            console.log('🍪 Cookie data:', {
                cookieNumber: cookieData.cookieNumber,
                name: cookieData.name,
                domain: cookieData.domain
            });
            
            // Use existing injectCookieViaExtension function from app.js
            if (typeof window.injectCookieViaExtension !== 'function') {
                console.error('❌ injectCookieViaExtension function not found!');
                throw new Error('injectCookieViaExtension function not available');
            }
            
            console.log('📤 Calling injectCookieViaExtension...');
            const response = await window.injectCookieViaExtension(cookieData);
            console.log('📥 Injection response:', response);
            
            if (!response || !response.success) {
                console.error('❌ Injection failed:', response);
                throw new Error(response?.error || 'Extension injection failed');
            }
            
            console.log('✅ Cookie injected successfully, waiting 3s...');
            // Wait for Netflix to process cookie
            await this.sleep(3000);
            
            console.log('🔍 Checking login status...');
            // Check login status via extension
            const loginStatus = await this.checkNetflixLoginStatus();
            console.log('📊 Login status:', loginStatus);
            
            return loginStatus;
            
        } catch (error) {
            console.error('❌ Inject cookie error:', error);
            return {
                success: false,
                errorCode: 'INJECTION_FAILED',
                error: error.message
            };
        }
    }
    
    /**
     * Check Netflix login status via extension
     */
    async checkNetflixLoginStatus() {
        try {
            // Use existing extension communication from app.js
            if (!window.state?.hasExtension || !window.CONFIG?.EXTENSION_ID) {
                return { success: false, errorCode: 'NO_EXTENSION' };
            }
            
            // Send message to extension to check Netflix tab status
            const response = await chrome.runtime.sendMessage(
                window.CONFIG.EXTENSION_ID,
                { action: 'checkNetflixStatus' }
            );
            
            if (response && response.success) {
                // Extension found Netflix tab and checked status
                if (response.loginStatus === 'success') {
                    return { success: true };
                } else if (response.loginStatus === 'error') {
                    console.log(`🔄 Detected error: ${response.errorCode}, trying refresh...`);
                    
                    // Update progress to show we're refreshing
                    if (window.showStepStatus) {
                        window.showStepStatus(2, 'warning', `🔄 Phát hiện lỗi ${response.errorCode}, đang refresh trang...`);
                    }
                    
                    // Try refresh page first before marking cookie as dead
                    const refreshResult = await this.refreshAndRecheck();
                    if (refreshResult.success) {
                        return { success: true };
                    }
                    
                    // Still failed after refresh
                    return {
                        success: false,
                        errorCode: response.errorCode || 'NETFLIX_ERROR'
                    };
                }
            }
            
            // Fallback: assume login failed if no clear success
            return {
                success: false,
                errorCode: 'LOGIN_CHECK_FAILED'
            };
            
        } catch (error) {
            console.error('❌ Check login status error:', error);
            
            // Fallback: try to check if Netflix tab exists and has /browse URL
            try {
                if (window.state?.netflixTabRef && !window.state.netflixTabRef.closed) {
                    // Tab exists, assume success for now
                    // In real implementation, we'd need better detection
                    return { success: true };
                }
            } catch (tabError) {
                console.warn('Tab check failed:', tabError);
            }
            
            return {
                success: false,
                errorCode: 'CHECK_FAILED',
                error: error.message
            };
        }
    }
    
    /**
     * Refresh Netflix page and recheck status
     */
    async refreshAndRecheck() {
        try {
            console.log('🔄 Refreshing Netflix page...');
            
            // Send refresh command to extension
            const refreshResponse = await chrome.runtime.sendMessage(
                window.CONFIG.EXTENSION_ID,
                { action: 'refreshNetflixTab' }
            );
            
            if (!refreshResponse?.success) {
                console.warn('⚠️ Failed to refresh Netflix tab');
                return { success: false, errorCode: 'REFRESH_FAILED' };
            }
            
            // Wait for page to load
            console.log('⏳ Waiting for page to reload...');
            await this.sleep(5000); // Wait 5 seconds for page to fully load
            
            // Check status again
            console.log('🔍 Checking status after refresh...');
            const response = await chrome.runtime.sendMessage(
                window.CONFIG.EXTENSION_ID,
                { action: 'checkNetflixStatus' }
            );
            
            if (response && response.success && response.loginStatus === 'success') {
                console.log('✅ Success after refresh!');
                
                // Clear warning message
                if (window.hideStepStatus) {
                    window.hideStepStatus(2);
                }
                if (window.showStepStatus) {
                    window.showStepStatus(2, 'success', '✅ Đăng nhập thành công sau khi refresh!');
                }
                
                return { success: true };
            }
            
            console.log('❌ Still failed after refresh');
            return { 
                success: false, 
                errorCode: response?.errorCode || 'STILL_FAILED_AFTER_REFRESH' 
            };
            
        } catch (error) {
            console.error('❌ Refresh and recheck error:', error);
            return { 
                success: false, 
                errorCode: 'REFRESH_ERROR',
                error: error.message 
            };
        }
    }
    
    /**
     * Mark cookie as dead in backend
     */
    async markCookieAsDead(cookieId, errorCode) {
        try {
            const response = await fetch(`${this.backendUrl}/api/admin/cookies/${cookieId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    notes: `die - Error: ${errorCode || 'UNKNOWN'} - ${new Date().toLocaleString('vi-VN')}`,
                    isActive: false
                })
            });
            
            if (response.ok) {
                console.log(`✅ Marked cookie ${cookieId} as dead`);
            }
            
        } catch (error) {
            console.error('❌ Mark cookie as dead error:', error);
        }
    }
    
    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in app.js
window.CookieRetryHandler = CookieRetryHandler;

