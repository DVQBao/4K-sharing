// ========================================
// Netflix Guest Sharing - Main Application
// Luồng 2 nút + Chrome Extension Integration + Backend API
// ========================================

// ========================================
// BACKEND CONFIGURATION
// ========================================

const BACKEND_URL = 'https://fourk-sharing.onrender.com';

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
    AD_DURATION: 2, // seconds (cho demo, thực tế có thể là 15-30s)
    NETFLIX_URL: 'https://www.netflix.com',
    NETFLIX_TAB_NAME: 'NETFLIX_TAB',
    COOKIE_FILE: 'cookie.txt',
    // Extension ID sẽ được cập nhật tự động khi detect
    EXTENSION_ID: null
};

// ========================================
// DOM ELEMENTS
// ========================================

const elements = {
    // Extension banner
    extensionBanner: document.getElementById('extensionBanner'),
    bannerTitle: document.getElementById('bannerTitle'),
    bannerText: document.getElementById('bannerText'),
    extensionIdDisplay: document.getElementById('extensionIdDisplay'),
    setupLink: document.getElementById('setupLink'),
    
    // Step buttons
    openNetflixBtn: document.getElementById('openNetflixBtn'),
    watchAsGuestBtn: document.getElementById('watchAsGuestBtn'),
    
    // Step status
    step1Status: document.getElementById('step1Status'),
    step2Status: document.getElementById('step2Status'),
    
    // Plan modal
    planModal: document.getElementById('planModal'),
    
    // Ad modal
    adModal: document.getElementById('adModal'),
    adSection: document.getElementById('adSection'),
    watchingSection: document.getElementById('watchingSection'),
    watchingProgress: document.getElementById('watchingProgress'),
    watchingIcon: document.getElementById('watchingIcon'),
    adContent: document.getElementById('adContent'),
    adMessage: document.getElementById('adMessage'),
    adTimer: document.getElementById('adTimer'),
    timeLeft: document.getElementById('timeLeft'),
    progressFill: document.getElementById('progressFill'),
    cancelBtn: document.getElementById('cancelBtn'),
    startWatchingBtn: document.getElementById('startWatchingBtn')
};

// ========================================
// STATE
// ========================================

const state = {
    hasExtension: false,
    extensionId: null,
    netflixTabRef: null,
    netflixTabId: null,
    adCountdown: CONFIG.AD_DURATION,
    adInterval: null
};

// ========================================
// INITIALIZATION
// ========================================

// Listen for extension ready event BEFORE DOMContentLoaded
// to catch early events from inline script
window.addEventListener('NetflixGuestExtensionReady', (event) => {
    console.log('✅ Extension ready event received:', event.detail);
    state.extensionId = event.detail.extensionId;
    CONFIG.EXTENSION_ID = event.detail.extensionId;
    onExtensionDetected(event.detail);
});

// Listen for extension NOT found event
window.addEventListener('NetflixGuestExtensionNotFound', () => {
    console.log('⚠️ Extension not found event received');
    onExtensionNotDetected();
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 Netflix Guest Sharing initialized');
    
    // Kiểm tra extension
    checkExtension();
    
    // Setup event listeners
    setupEventListeners();
});

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    elements.openNetflixBtn.addEventListener('click', handleOpenNetflix);
    elements.watchAsGuestBtn.addEventListener('click', handleWatchAsGuest);
    elements.cancelBtn.addEventListener('click', closeAdModal);
    elements.startWatchingBtn.addEventListener('click', handleStartWatching);
    elements.setupLink.addEventListener('click', showSetupInstructions);
}

// ========================================
// EXTENSION DETECTION
// ========================================

/**
 * Kiểm tra xem Chrome Extension đã được cài đặt chưa
 */
async function checkExtension() {
    // Extension detection handled by inline script
    console.log('🔍 Extension detection active (handled by inline script)');
}

/**
 * Khi extension được phát hiện
 */
function onExtensionDetected(details) {
    // Prevent multiple calls
    if (state.hasExtension) {
        console.log('ℹ️ Extension already detected, skipping duplicate call');
        return;
    }
    
    state.hasExtension = true;
    state.extensionId = details.extensionId;
    CONFIG.EXTENSION_ID = details.extensionId;
    
    // Update UI - Simple banner
    if (elements.extensionBanner && elements.bannerTitle && elements.bannerText) {
        elements.extensionBanner.className = 'extension-banner show success';
        elements.bannerTitle.innerHTML = '✅ Extension đã cài đặt';
        elements.bannerText.innerHTML = 'Bạn có thể tiếp tục tận hưởng Netflix 4K';
    }
    
    console.log('✅ Extension detected and UI updated successfully');
}

/**
 * Khi không phát hiện extension
 */
function onExtensionNotDetected() {
    // Don't override if already detected!
    if (state.hasExtension) {
        console.log('ℹ️ Extension already detected, skip not-detected handler');
        return;
    }
    
    state.hasExtension = false;
    
    // Update UI - Simple banner with install guide link
    if (elements.extensionBanner && elements.bannerTitle && elements.bannerText) {
        elements.extensionBanner.className = 'extension-banner show error';
        elements.bannerTitle.innerHTML = '⚠️ Chưa cài Extension';
        elements.bannerText.innerHTML = `
            Vui lòng cài đặt Chrome Extension để sử dụng.<br>
            <a href="install-guide.html" style="color: #fff; text-decoration: underline; font-weight: 600;">
                📖 Xem hướng dẫn cài đặt
            </a>
        `;
    }
    
    console.warn('⚠️ Extension not detected, UI updated');
}

// ========================================
// STEP 1: MỞ NETFLIX TAB
// ========================================

/**
 * Xử lý nút "Mở Netflix.com"
 * Kiểm tra và mở tab Netflix nếu chưa có
 */
function handleOpenNetflix() {
    console.log('📍 Step 1: Opening Netflix tab...');
    
    // Reset status
    hideStepStatus(1);
    
    try {
        // Kiểm tra xem đã có tab Netflix chưa
        if (state.netflixTabRef && !state.netflixTabRef.closed) {
            // Tab đã tồn tại, focus vào tab đó
            state.netflixTabRef.focus();
            showStepStatus(1, 'success', '✅ Tab Netflix đã mở sẵn! Đã focus vào tab.');
            console.log('✅ Netflix tab already open, focused');
            return;
        }
        
        // Mở tab mới
        try {
            state.netflixTabRef = window.open(
                CONFIG.NETFLIX_URL,
                CONFIG.NETFLIX_TAB_NAME
            );
            
            // Check if popup was blocked
            if (!state.netflixTabRef || state.netflixTabRef.closed) {
                showStepStatus(1, 'error', '❌ Không thể mở tab. Vui lòng cho phép popup!');
                showToast('Vui lòng cho phép popup cho trang này', 'error');
                console.error('❌ Popup blocked');
                return;
            }
        } catch (error) {
            showStepStatus(1, 'error', '❌ Lỗi khi mở tab: ' + error.message);
            console.error('❌ Error:', error);
            return;
        }
        
        // Gán window.name để dễ nhận diện
        try {
            state.netflixTabRef.name = CONFIG.NETFLIX_TAB_NAME;
        } catch (error) {
            console.warn('Cannot set window.name (cross-origin):', error);
        }
        
        // Lưu timestamp
        localStorage.setItem('netflixTabOpened', Date.now().toString());
        
        // Đợi tab load xong
        setTimeout(() => {
            showStepStatus(1, 'success', '✅ Đã mở Netflix tab thành công! Sẵn sàng cho bước 2.');
            showToast('Đã mở Netflix xong!', 'success');
            console.log('✅ Netflix tab opened successfully');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error opening Netflix:', error);
        showStepStatus(1, 'error', `❌ Lỗi: ${error.message}`);
        showToast('Lỗi khi mở Netflix', 'error');
    }
}

// ========================================
// STEP 2: WATCH AS GUEST
// ========================================

/**
 * Xử lý nút "Watch as Guest"
 * Hiển thị modal chọn gói: Free (ad) hoặc Pro (20k/tháng)
 */
function handleWatchAsGuest() {
    console.log('📍 Step 2: Starting guest flow...');
    
    // Reset status
    hideStepStatus(2);
    
    // Kiểm tra xem đã mở Netflix chưa
    if (!state.netflixTabRef || state.netflixTabRef.closed) {
        showStepStatus(2, 'error', '❌ Chưa mở Netflix! Vui lòng bấm bước 1 trước.');
        showToast('Vui lòng mở Netflix tab trước (Bước 1)', 'warning');
        console.error('❌ Netflix tab not found');
        
        // Highlight bước 1
        elements.openNetflixBtn.style.animation = 'pulse 1s ease 3';
        setTimeout(() => {
            elements.openNetflixBtn.style.animation = '';
        }, 3000);
        
        return;
    }
    
    // Kiểm tra extension
    if (!state.hasExtension) {
        showStepStatus(2, 'warning', '⚠️ Extension chưa được cài. Vui lòng xem hướng dẫn!');
        showToast('Cần cài extension để bắt đầu', 'warning');
    }
    
    // Kiểm tra user plan
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        if (user.plan === 'pro') {
            // User Pro: Skip ad, bắt đầu xem ngay
            console.log('⭐ Pro user - skipping ad, starting directly');
            showToast('⭐ Pro user - Bắt đầu xem ngay!', 'success');
            
            // Mở modal và chỉ hiện watching section
            elements.adModal.classList.add('active');
            
            // Ẩn ad section, hiện watching section
            if (elements.adSection) elements.adSection.style.display = 'none';
            if (elements.watchingSection) elements.watchingSection.style.display = 'block';
            
            // Hiện thông báo đang xử lý
            showStepStatus(2, 'success', '⏳ Pro user - Đang kết nối Netflix...');
            if (elements.watchingProgress) {
                elements.watchingProgress.textContent = '⏳ Pro user - Đang kết nối Netflix...';
            }
            
            // Tự động bắt đầu
            setTimeout(() => {
                handleStartWatching();
            }, 500);
            return;
        }
    }
    
    // User Free: Hiển thị modal chọn gói
    showPlanModal();
    console.log('📋 Plan selection modal opened');
}

/**
 * Hiển thị modal chọn gói
 */
function showPlanModal() {
    elements.planModal.classList.add('active');
}

/**
 * Đóng modal chọn gói
 */
function closePlanModal() {
    elements.planModal.classList.remove('active');
}

/**
 * User chọn Free Plan - Xem quảng cáo
 */
function selectFreePlan() {
    console.log('📺 User selected Free Plan - Watch ad');
    closePlanModal();
    
    // Hiển thị modal quảng cáo
    showAdModal();
    showStepStatus(2, 'success', '⏳ Đang xem quảng cáo...');
}

/**
 * User chọn Pro Plan - 20k/tháng
 */
function selectProPlan() {
    console.log('⭐ User selected Pro Plan');
    
    // Show confirmation
    const confirm = window.confirm(`🚀 Nâng cấp lên Pro Plan?

💰 Giá: 20.000 VNĐ/tháng

Bạn sẽ được chuyển đến Zalo để liên hệ chủ trang và thanh toán.

Sau khi thanh toán, tài khoản sẽ được nâng cấp và bạn có thể xem phim không quảng cáo!

Tiếp tục?`);
    
    if (confirm) {
        // Redirect to Zalo
        window.open('https://zalo.me/0393434851', '_blank');
        showToast('Đang mở Zalo... Liên hệ chủ trang để nâng cấp!', 'success');
        closePlanModal();
    }
}

// ========================================
// AD MODAL LOGIC
// ========================================

/**
 * Hiển thị modal quảng cáo
 */
function showAdModal() {
    elements.adModal.classList.add('active');
    resetAdState();
    startAdCountdown();
    animateAdContent();
}

/**
 * Đóng modal quảng cáo
 */
function closeAdModal() {
    elements.adModal.classList.remove('active');
    resetAdState();
}

/**
 * Reset trạng thái quảng cáo
 */
function resetAdState() {
    clearInterval(state.adInterval);
    state.adCountdown = CONFIG.AD_DURATION;
    elements.timeLeft.textContent = CONFIG.AD_DURATION;
    elements.startWatchingBtn.disabled = true;
    elements.progressFill.style.width = '0%';
}

/**
 * Bắt đầu đếm ngược quảng cáo
 */
function startAdCountdown() {
    state.adCountdown = CONFIG.AD_DURATION;
    elements.timeLeft.textContent = state.adCountdown;
    
    state.adInterval = setInterval(() => {
        state.adCountdown--;
        elements.timeLeft.textContent = Math.max(0, state.adCountdown);
        
        // Update progress bar
        const progress = ((CONFIG.AD_DURATION - state.adCountdown) / CONFIG.AD_DURATION) * 100;
        elements.progressFill.style.width = `${progress}%`;
        
        // Update message
        if (state.adCountdown > 0) {
            elements.adMessage.textContent = `Vui lòng đợi ${state.adCountdown} giây...`;
        } else {
            elements.adMessage.textContent = '✅ Quảng cáo đã hoàn thành!';
        }
        
        if (state.adCountdown <= 0) {
            clearInterval(state.adInterval);
            enableStartButton();
        }
    }, 1000);
}

/**
 * Enable nút "Bắt đầu xem"
 */
function enableStartButton() {
    elements.startWatchingBtn.disabled = false;
    elements.adTimer.innerHTML = '✅ Hoàn thành!';
    console.log('✅ Ad completed');
}

/**
 * Animate ad content
 */
function animateAdContent() {
    elements.adMessage.textContent = `Vui lòng đợi ${CONFIG.AD_DURATION} giây...`;
}

// ========================================
// HANDLE START WATCHING
// ========================================

/**
 * Xử lý khi user bấm "Bắt đầu xem"
 * Đọc cookie và gửi tới extension để inject
 */
async function handleStartWatching() {
    console.log('🚀 Starting Netflix session with auto-retry...');
    
    try {
        // Kiểm tra Netflix tab đã mở chưa (phải mở ở bước 1)
        if (!state.netflixTabRef || state.netflixTabRef.closed) {
            showStepStatus(2, 'error', '❌ Netflix tab đã bị đóng! Vui lòng mở lại ở bước 1.');
            showToast('Netflix tab đã đóng, vui lòng mở lại', 'error');
            closeAdModal();
            return;
        }
        
        // Kiểm tra extension
        if (!state.hasExtension) {
            showStepStatus(2, 'error', '❌ Cần extension để login. Vui lòng cài extension.');
            showToast('Cần cài extension để login', 'error');
            closeAdModal();
            return;
        }
        
        // Chuyển sang watching section (ẩn ad, hiện progress)
        if (elements.adSection) elements.adSection.style.display = 'none';
        if (elements.watchingSection) elements.watchingSection.style.display = 'block';
        
        // Tạo retry handler
        const retryHandler = new CookieRetryHandler(
            BACKEND_URL,
            localStorage.getItem('auth_token')
        );
        
        // Bắt đầu quá trình login với auto-retry
        showStepStatus(2, 'success', '⏳ Đang kết nối...');
        if (elements.watchingProgress) {
            elements.watchingProgress.textContent = '⏳ Đang kết nối...';
        }
        
        const result = await retryHandler.attemptLogin((progress) => {
            // Cập nhật UI dựa trên tiến trình
            console.log('🔄 Progress:', progress);
            
            if (progress.status === 'trying') {
                if (elements.watchingIcon) elements.watchingIcon.textContent = '⏳';
                if (elements.watchingProgress) {
                    elements.watchingProgress.textContent = 'Đang đăng nhập...';
                }
            } else if (progress.status === 'retrying') {
                if (elements.watchingIcon) elements.watchingIcon.textContent = '🔄';
                if (elements.watchingProgress) {
                    elements.watchingProgress.textContent = 'Đang đăng nhập...';
                }
                if (progress.errorCode) {
                    console.log(`Cookie lỗi (${progress.errorCode}), đang thử cookie khác...`);
                }
            } else if (progress.status === 'success') {
                if (elements.watchingIcon) elements.watchingIcon.textContent = '✅';
                if (elements.watchingProgress) {
                    elements.watchingProgress.textContent = 'Đăng nhập thành công!';
                }
            } else if (progress.status === 'failed') {
                if (elements.watchingIcon) elements.watchingIcon.textContent = '❌';
                if (elements.watchingProgress) {
                    elements.watchingProgress.textContent = 'Đăng nhập thất bại. Vui lòng thử lại sau.';
                }
            }
        });
        
        if (result.success) {
            // Thành công!
            console.log('✅ Login successful, preparing to focus Netflix tab...');
            
            // Clear any warning messages first
            hideStepStatus(2);
            showStepStatus(2, 'success', '✅ Đăng nhập thành công!');
            
            if (elements.watchingIcon) elements.watchingIcon.textContent = '✅';
            if (elements.watchingProgress) {
                elements.watchingProgress.textContent = 'Đăng nhập thành công! Đang chuyển sang Netflix...';
            }
            
            showToast('🎉 Đăng nhập thành công!', 'success');
            
            // Focus vào tab Netflix qua extension (cách chắc chắn nhất)
            console.log('🔄 Requesting extension to focus Netflix tab...');
            
            try {
                const focusResponse = await chrome.runtime.sendMessage(
                    CONFIG.EXTENSION_ID,
                    { action: 'focusNetflixTab' }
                );
                
                if (focusResponse && focusResponse.success) {
                    console.log('✅ Netflix tab focused successfully via extension!');
                    console.log('   Tab ID:', focusResponse.tabId);
                    console.log('   Window ID:', focusResponse.windowId);
                } else {
                    console.warn('⚠️ Extension could not focus tab:', focusResponse?.error);
                    
                    // Fallback: Thử focus bằng window reference
                    console.log('🔄 Trying fallback focus method...');
                    if (state.netflixTabRef && !state.netflixTabRef.closed) {
                        window.blur();
                        state.netflixTabRef.focus();
                        console.log('✅ Fallback focus attempted');
                    }
                }
            } catch (error) {
                console.error('❌ Error requesting focus via extension:', error);
                
                // Fallback: Thử focus bằng window reference
                console.log('🔄 Trying fallback focus method...');
                if (state.netflixTabRef && !state.netflixTabRef.closed) {
                    try {
                        window.blur();
                        state.netflixTabRef.focus();
                        console.log('✅ Fallback focus attempted');
                    } catch (e) {
                        console.warn('⚠️ Fallback focus also failed:', e);
                    }
                }
            }
            
            // Đợi 1.5s để user thấy thông báo, rồi đóng modal
            setTimeout(() => {
                if (elements.watchingProgress) {
                    elements.watchingProgress.textContent = '🎉 Hoàn thành! Kiểm tra tab Netflix để xem phim.';
                }
                closeAdModal();
            }, 1500);
            
        } else {
            // Thất bại sau khi đã retry
            const errorMsg = result.error || 'Không thể đăng nhập sau nhiều lần thử';
            showStepStatus(2, 'error', `❌ ${errorMsg}`);
            showToast(`❌ ${errorMsg}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ Start watching error:', error);
        showStepStatus(2, 'error', '❌ Lỗi hệ thống: ' + error.message);
        showToast('❌ Có lỗi xảy ra: ' + error.message, 'error');
    }
}

// ========================================
// COOKIE MANAGEMENT
// ========================================

/**
 * Đọc cookie từ file cookie.txt
 * PRODUCTION VERSION: Cookie được embed trực tiếp để tránh CORS issue
 */
async function readCookieFromFile() {
    try {
        console.log('🔄 Fetching cookie from backend...');
        const token = localStorage.getItem('auth_token');
        console.log('🔑 Auth token exists:', !!token);
        
        // Call backend API to get Netflix cookie
        const response = await fetch(`${BACKEND_URL}/api/cookies/guest`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Backend response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend error:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📦 Backend response data:', data);
        
        if (data.cookie) {
            // Backend returns cookie object, no need to parse
            console.log(`✅ Using assigned Cookie #${data.cookieNumber} (${data.sharedUsers} users)`);
            console.log('🍪 Cookie value preview:', data.cookie.value.substring(0, 50) + '...');
            return data.cookie;
        } else {
            console.log('⚠️ No cookie in response, using fallback');
            // Fallback to demo cookie if no cookie from backend
            const DEMO_COOKIE = 'NetflixId=v%3D3%26ct%3DBgjHlOvcAxL2Arigp8V5bErQqO0COTaSWib2zCUeC2qiNuXTYbv1SJ9nhrt-7hEakEDvt7HJVrkyGs09kIVt7M53Z8NzdbE75FOamF5q6XftereeruBU5v4pBNggbg97HNTqBxw2gE-UUt3hzyadHcNbdz8TQKYOtcyEmcBaxoXsAJR13QSyFT2-3RRQyYlM_H0O4BrTAczVvAc3SVKd2mkNtwf2CYjlaEVviS7JEDUFG2o4eMAE3db3aDn62DLw5AXK2C7YaKVfpv7nsfDitbTp1p0apNMByQEqNOq3dusmNVCIuHlH2HVhAiLO8_94BB2I0I49ebiC4XPX0fGYTqGDuU1gCkwYOxhMEQhysBmb8KKfbGdZhYn84_q0xRYcTUi_-DFI3nf8Jb8PogIWMh3o4vRH6oa2RzYwYvHr_RHH3Nifx_f5hKBX4L2u6DYSAcC2H2svlWGy2h-b-1AC4YhO821XH6zEWazzCs6poe0bo4jSuRBDny2Ql_xf0zbaGAYiDgoMzOor99BBEbYgNYcv%26pg%3DBCLYEPK2DJD2BDL7SZZ7JKLCRY%26ch%3DAQEAEAABABSiReww9rblxsEScDlWQSttVWEyFcNQGZc.';
            return parseCookie(DEMO_COOKIE.trim());
        }
    } catch (error) {
        console.error('❌ Error fetching cookie from backend:', error);
        
        // Fallback to demo cookie
        console.log('🔄 Using fallback DEMO cookie');
        const DEMO_COOKIE = 'NetflixId=v%3D3%26ct%3DBgjHlOvcAxL2Arigp8V5bErQqO0COTaSWib2zCUeC2qiNuXTYbv1SJ9nhrt-7hEakEDvt7HJVrkyGs09kIVt7M53Z8NzdbE75FOamF5q6XftereeruBU5v4pBNggbg97HNTqBxw2gE-UUt3hzyadHcNbdz8TQKYOtcyEmcBaxoXsAJR13QSyFT2-3RRQyYlM_H0O4BrTAczVvAc3SVKd2mkNtwf2CYjlaEVviS7JEDUFG2o4eMAE3db3aDn62DLw5AXK2C7YaKVfpv7nsfDitbTp1p0apNMByQEqNOq3dusmNVCIuHlH2HVhAiLO8_94BB2I0I49ebiC4XPX0fGYTqGDuU1gCkwYOxhMEQhysBmb8KKfbGdZhYn84_q0xRYcTUi_-DFI3nf8Jb8PogIWMh3o4vRH6oa2RzYwYvHr_RHH3Nifx_f5hKBX4L2u6DYSAcC2H2svlWGy2h-b-1AC4YhO821XH6zEWazzCs6poe0bo4jSuRBDny2Ql_xf0zbaGAYiDgoMzOor99BBEbYgNYcv%26pg%3DBCLYEPK2DJD2BDL7SZZ7JKLCRY%26ch%3DAQEAEAABABSiReww9rblxsEScDlWQSttVWEyFcNQGZc.';
        return parseCookie(DEMO_COOKIE.trim());
    }
}

/**
 * Parse cookie từ nhiều format khác nhau
 */
function parseCookie(text) {
    // Format 1: JSON object
    if (text.startsWith('{')) {
        return JSON.parse(text);
    }
    
    // Format 2: Cookie string (NetflixId=value...)
    if (text.includes('=')) {
        const match = text.match(/^([^=]+)=(.+)$/);
        if (match) {
            return {
                name: match[1].trim(),
                value: match[2].trim(),
                domain: '.netflix.com',
                path: '/',
                secure: true,
                httpOnly: false
            };
        }
    }
    
    // Format 3: Netscape format (tab-separated)
    if (text.includes('\t')) {
        const parts = text.split('\t');
        if (parts.length >= 7) {
            return {
                name: parts[5].trim(),
                value: parts[6].trim(),
                domain: parts[0].trim(),
                path: parts[2].trim(),
                secure: parts[3] === 'TRUE',
                httpOnly: false,
                expirationDate: parseInt(parts[4])
            };
        }
    }
    
    throw new Error('Unknown cookie format');
}

// ========================================
// EXTENSION COMMUNICATION
// ========================================

/**
 * Gửi cookie tới extension để inject
 */
async function injectCookieViaExtension(cookieData) {
    return new Promise((resolve, reject) => {
        console.log('📤 Sending cookie to extension...');
        
        if (!CONFIG.EXTENSION_ID) {
            reject(new Error('Extension ID not found'));
            return;
        }
        
        chrome.runtime.sendMessage(
            CONFIG.EXTENSION_ID,
            {
                action: 'injectCookie',
                cookieData: cookieData,
                tabName: CONFIG.NETFLIX_TAB_NAME
            },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Extension error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                console.log('✅ Extension response:', response);
                resolve(response);
            }
        );
    });
}

// ========================================
// UI HELPERS
// ========================================

/**
 * Hiển thị status cho step
 */
function showStepStatus(stepNumber, type, message) {
    const statusElement = stepNumber === 1 ? elements.step1Status : elements.step2Status;
    statusElement.className = `step-status show ${type}`;
    statusElement.textContent = message;
}

/**
 * Ẩn status cho step
 */
function hideStepStatus(stepNumber) {
    const statusElement = stepNumber === 1 ? elements.step1Status : elements.step2Status;
    statusElement.className = 'step-status';
    statusElement.textContent = '';
}

/**
 * Hiển thị toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Hiển thị hướng dẫn setup
 */
function showSetupInstructions(e) {
    e?.preventDefault();
    
    const instructions = `
📖 HƯỚNG DẪN CÀI ĐẶT EXTENSION

1. Mở Chrome, vào chrome://extensions/
2. Bật "Developer mode" (góc trên bên phải)
3. Click "Load unpacked"
4. Chọn folder: NetflixSharingProject/extension
5. Extension sẽ xuất hiện với icon 🎬
6. Reload trang web này

Extension ID sẽ hiện ở banner màu xanh khi cài thành công.

Đọc file SETUP.md để biết thêm chi tiết!
    `.trim();
    
    alert(instructions);
}

// ========================================
// DEBUG
// ========================================

// ========================================
// EXPOSE FUNCTIONS FOR COOKIE RETRY HANDLER
// ========================================

// Make functions available globally for CookieRetryHandler
window.injectCookieViaExtension = injectCookieViaExtension;
window.state = state;
window.CONFIG = CONFIG;
window.showStepStatus = showStepStatus;
window.hideStepStatus = hideStepStatus;

console.log(`
╔════════════════════════════════════════════════════╗
║     🎬 Netflix Guest Sharing - Initialized        ║
╠════════════════════════════════════════════════════╣
║  Luồng 2 bước:                                     ║
║  ① Mở Netflix Tab  → window.open()                ║
║  ② Watch as Guest  → Ad → Cookie Injection        ║
╠════════════════════════════════════════════════════╣
║  Extension Required: Netflix Guest Helper          ║
║  Auto-retry: ✅ (NEW!)                             ║
║  Error Detection: ✅ (NEW!)                        ║
╚════════════════════════════════════════════════════╝
`);

// Expose for debugging
window.netflixGuestApp = {
    state,
    config: CONFIG,
    elements,
    checkExtension,
    handleOpenNetflix,
    handleWatchAsGuest
};
