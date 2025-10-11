# 🎬 Netflix Guest Sharing - Hướng dẫn cài đặt đầy đủ

Hệ thống chia sẻ Netflix qua cookie với **luồng 2 nút** + **Chrome Extension tự động**.

---

## 📋 Mục lục

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Cài đặt Chrome Extension](#cài-đặt-chrome-extension)
3. [Chạy Web Demo](#chạy-web-demo)
4. [Test hoạt động](#test-hoạt-động)
5. [Cách sử dụng](#cách-sử-dụng)
6. [Troubleshooting](#troubleshooting)
7. [Technical Details](#technical-details)

---

## 🎯 Tổng quan hệ thống

### Luồng hoạt động

```
┌─────────────────────────────────────────────────────┐
│                   WEB APP                           │
│                                                     │
│  [Bước 1] Mở Netflix.com                           │
│     ↓                                               │
│  window.open() → Tab Netflix mở                    │
│     ↓                                               │
│  [Bước 2] Watch as Guest                           │
│     ↓                                               │
│  Xem quảng cáo 2s (demo) / 15-30s (thực tế)       │
│     ↓                                               │
│  Click "Bắt đầu xem"                               │
└──────────────┬──────────────────────────────────────┘
               │
               │ chrome.runtime.sendMessage()
               │ {action: "injectCookie", cookieData}
               ↓
┌─────────────────────────────────────────────────────┐
│            CHROME EXTENSION                         │
│                                                     │
│  background.js nhận message                        │
│     ↓                                               │
│  1. Tìm tab Netflix (chrome.tabs.query)           │
│  2. Xóa cookies cũ (chrome.cookies.remove)         │
│  3. Inject cookie mới (chrome.cookies.set)         │
│  4. Reload tab (chrome.tabs.reload)                │
│     ↓                                               │
│  content.js monitor URL                            │
│     ↓                                               │
│  Detect /browse → Thành công!                      │
└─────────────────────────────────────────────────────┘
```

### Tại sao cần Extension?

**❌ KHÔNG THỂ làm thuần front-end:**
- Browser security (SOP/CORS) chặn đọc/ghi cookie cross-origin
- `document.cookie` không thể access cookie từ domain khác
- `fetch()` không thể set cookie cho domain khác

**✅ Extension có quyền:**
- `chrome.cookies` API - đọc/ghi cookie mọi domain
- `chrome.tabs` API - quản lý tabs, reload
- `chrome.runtime` - message passing giữa web app và extension

---

## 🔧 Cài đặt Chrome Extension

### Bước 1: Kiểm tra file

Đảm bảo có đầy đủ file trong folder `extension/`:

```
extension/
├── manifest.json        ✓ Extension config (Manifest V3)
├── background.js        ✓ Service worker, cookie injection logic
├── content.js           ✓ Content script, monitor Netflix page
├── popup.html           ✓ Extension popup UI
├── popup.js             ✓ Popup logic
├── icon16.png           ✓ Icon 16x16
├── icon48.png           ✓ Icon 48x48
└── icon128.png          ✓ Icon 128x128
```

### Bước 2: Load extension vào Chrome

1. **Mở Chrome**, vào:
   ```
   chrome://extensions/
   ```

2. **Bật Developer mode**:
   - Góc trên bên phải, toggle switch "Developer mode"
   - ![Developer Mode](https://i.imgur.com/example.png)

3. **Click "Load unpacked"**:
   - Chọn folder: `C:\Users\Admin\PycharmProjects\PythonProject\NetflixSharingProject\extension`
   - ![Load Unpacked](https://i.imgur.com/example2.png)

4. **Extension sẽ xuất hiện**:
   - Tên: **Netflix Guest Helper**
   - Icon: 🎬
   - Status: **Enabled**

### Bước 3: Copy Extension ID

1. Trên trang `chrome://extensions/`, tìm **Netflix Guest Helper**
2. Phía dưới tên extension, có dòng chữ nhỏ:
   ```
   ID: abcdefghijklmnopqrstuvwxyz1234567890
   ```
3. **Copy Extension ID** này (dùng sau)

### Bước 4: Test Extension

1. **Click vào icon extension** trên toolbar (hoặc extensions menu)
2. Popup sẽ hiện ra
3. **Click "🧪 Test Extension"**
4. Nếu thấy alert:
   ```
   ✅ Extension Test Results:
   • Cookies permission: ✓
   • Tabs permission: ✓
   • Netflix cookies: X
   • Netflix tabs: 0
   
   Extension is working properly!
   ```
   → Extension đã cài thành công!

---

## 🌐 Chạy Web Demo

### Bước 1: Chuẩn bị cookie

1. **Lấy Netflix cookie**:
   - Đăng nhập Netflix trên Chrome
   - Mở DevTools (F12)
   - Tab **Application** → **Cookies** → `https://www.netflix.com`
   - Tìm cookie `NetflixId` hoặc `SecureNetflixId`
   - Copy **Value** (dạng: `v%3D2%26mac%3D...`)

2. **Edit file `cookie.txt`**:
   - Mở file `NetflixSharingProject/cookie.txt`
   - Paste cookie theo format:
   ```
   NetflixId=v%3D2%26mac%3DAQEAEQABAABe...
   ```

### Bước 2: Chạy local server

**Windows PowerShell:**
```powershell
cd C:\Users\Admin\PycharmProjects\PythonProject\NetflixSharingProject
python -m http.server 8000
```

**Hoặc dùng Node.js:**
```bash
npx http-server -p 8000
```

**Hoặc dùng PHP:**
```bash
php -S localhost:8000
```

### Bước 3: Mở web app

1. Mở Chrome
2. Vào: `http://localhost:8000`
3. Trang sẽ load với 2 options

---

## ✅ Test hoạt động

### Test 1: Extension Detection

1. **Mở `http://localhost:8000`**
2. Sau 1-2 giây, banner phía trên sẽ hiện:
   
   **Nếu có extension:**
   ```
   ✅ Extension đã cài đặt
   Chế độ tự động đã bật. Extension sẽ tự động inject cookie sau khi xem quảng cáo.
   Version: 1.0.0
   
   Extension ID: abcdefghijklmnop...
   Click để copy
   ```
   
   **Nếu chưa có extension:**
   ```
   ⚠️ Extension chưa được cài đặt
   Cần cài đặt Netflix Guest Helper Extension để tự động inject cookie.
   📖 Xem hướng dẫn cài đặt
   ```

### Test 2: Luồng 2 bước

#### **Bước 1: Mở Netflix Tab**

1. Click **"🌐 Mở Netflix Tab"**
2. Tab mới sẽ mở tại `https://www.netflix.com`
3. Status hiển thị:
   ```
   ✅ Đã mở Netflix tab thành công! Sẵn sàng cho bước 2.
   ```
4. Toast notification: **"Đã mở Netflix xong!"**

**Test case:**
- ✅ Popup không bị chặn
- ✅ Tab Netflix đã mở
- ✅ Status màu xanh xuất hiện
- ✅ Toast hiện ra 3 giây

#### **Bước 2: Watch as Guest**

1. Click **"📺 Watch as Guest"**
2. Modal quảng cáo xuất hiện
3. Đếm ngược từ 2s → 0s (demo) / 15s-30s (production)
4. Progress bar chạy từ 0% → 100%
5. Nút "Bắt đầu xem" tự động enable khi hết thời gian
6. Click **"Bắt đầu xem"**
7. Status hiển thị:
   ```
   ⏳ Đang tải session cookie...
   📤 Đang gửi cookie tới extension...
   ✅ Thành công! Đang reload Netflix...
   🎉 Hoàn thành! Kiểm tra tab Netflix để xem phim.
   ```
8. Toast: **"🎉 Cookie đã được inject! Đang reload Netflix..."**
9. Tab Netflix tự động reload
10. URL chuyển sang `/browse` → Netflix đã login!

**Test case:**
- ✅ Modal quảng cáo hiện
- ✅ Countdown đúng
- ✅ Progress bar chạy
- ✅ Nút disabled đến khi hết thời gian
- ✅ Cookie được đọc từ `cookie.txt`
- ✅ Extension nhận message
- ✅ Cookies Netflix cũ bị xóa
- ✅ Cookie mới được inject
- ✅ Tab reload
- ✅ URL = `/browse` → Success!

### Test 3: Error Handling

#### Test 3.1: Bước 2 trước Bước 1

1. **KHÔNG** click bước 1
2. Click bước 2 ngay
3. Sẽ thấy:
   ```
   ❌ Chưa mở Netflix! Vui lòng bấm bước 1 trước.
   ```
4. Nút bước 1 sẽ **nhấp nháy** (animation) để highlight

#### Test 3.2: Không có Extension

1. Disable extension trên `chrome://extensions/`
2. Reload web app
3. Banner sẽ đỏ:
   ```
   ⚠️ Extension chưa được cài đặt
   ```
4. Thử làm bước 2 → Sẽ thấy warning:
   ```
   ⚠️ Extension chưa cài. Cookie sẽ không được inject tự động.
   ```

#### Test 3.3: Cookie file lỗi

1. Edit `cookie.txt` → xóa hết nội dung
2. Thử bước 2 → Sẽ thấy:
   ```
   ❌ Lỗi: cookie.txt is empty
   ```

---

## 📖 Cách sử dụng (User Flow)

### Cho người dùng cuối:

1. **Cài Extension** (1 lần duy nhất):
   - Download extension từ Chrome Web Store (sau khi publish)
   - Hoặc load unpacked nếu là developer

2. **Mở web app**:
   - Vào `http://yoursite.com`
   - Kiểm tra banner xanh "✅ Extension đã cài đặt"

3. **Chọn "Watch as Guest"**:
   - Click **"Mở Netflix Tab"** → Tab Netflix mở
   - Click **"Watch as Guest"** → Xem quảng cáo
   - Sau khi xem xong → Click **"Bắt đầu xem"**
   - Extension tự động inject cookie
   - Netflix reload → Vào `/browse` → Xem phim!

4. **Xem phim**:
   - Chuyển qua tab Netflix
   - Browse, search, watch như bình thường
   - Session sẽ hết hạn theo cookie expiration (thường 24h)

---

## 🐛 Troubleshooting

### Lỗi: "Extension chưa được cài đặt"

**Nguyên nhân:**
- Extension chưa load
- Extension bị disable
- Extension ID không khớp

**Giải pháp:**
1. Kiểm tra `chrome://extensions/` - Extension có **Enabled** không?
2. Reload extension (click icon reload ⟳)
3. Reload web app (F5)
4. Nếu vẫn lỗi, xem console: F12 → Console tab

---

### Lỗi: "Netflix tab not found"

**Nguyên nhân:**
- Chưa bấm bước 1
- Tab Netflix đã đóng
- Popup bị chặn

**Giải pháp:**
1. Bấm lại **"Mở Netflix Tab"** (bước 1)
2. Kiểm tra popup có bị chặn không (icon ở address bar)
3. Cho phép popup: Chrome Settings → Site Settings → Popups → Allow `localhost`

---

### Lỗi: "Failed to inject cookie"

**Nguyên nhân:**
- Cookie format sai
- Cookie đã hết hạn
- Extension không có quyền

**Giải pháp:**
1. Kiểm tra `cookie.txt`:
   ```
   NetflixId=v%3D2%26mac%3D...
   ```
   Phải có format `name=value` hoặc JSON

2. Lấy cookie mới từ Netflix (xem phần "Lấy Netflix Cookie")

3. Test extension: Click icon extension → **"🧪 Test Extension"**

---

### Lỗi: "chrome.runtime is not defined"

**Nguyên nhân:**
- Không chạy trên Chrome
- Extension chưa cài
- File chạy local (file://) thay vì http://

**Giải pháp:**
1. Dùng Chrome (không phải Firefox, Edge, v.v.)
2. Chạy qua local server: `python -m http.server 8000`
3. Mở `http://localhost:8000` (KHÔNG phải `file:///...`)

---

### Lỗi: "Popup blocked"

**Nguyên nhân:**
- Browser chặn popup tự động

**Giải pháp:**
1. Chrome → Settings → Privacy and security → Site Settings
2. Popups and redirects → Add `http://localhost:8000`
3. Hoặc click icon popup ở address bar → **Always allow**

---

## 🔍 Technical Details

### Extension Architecture

#### **manifest.json** (Manifest V3)
```json
{
  "manifest_version": 3,
  "permissions": ["cookies", "tabs", "storage"],
  "host_permissions": ["*://*.netflix.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["*://*.netflix.com/*"],
    "js": ["content.js"]
  }],
  "externally_connectable": {
    "matches": ["http://localhost:*/*"]
  }
}
```

**Giải thích:**
- `permissions`: Quyền đọc/ghi cookie, tabs, storage
- `host_permissions`: Chỉ access Netflix domain
- `service_worker`: Background script (Manifest V3)
- `content_scripts`: Script chạy trên Netflix page
- `externally_connectable`: Cho phép web app giao tiếp

#### **background.js** - Service Worker

**Nhiệm vụ:**
1. Lắng nghe message từ web app
2. Tìm tab Netflix
3. Xóa cookies cũ
4. Inject cookie mới
5. Reload tab
6. Monitor URL để detect `/browse`

**API sử dụng:**
- `chrome.runtime.onMessageExternal` - Nhận message từ web app
- `chrome.tabs.query()` - Tìm tab Netflix
- `chrome.cookies.getAll()` - Lấy cookies
- `chrome.cookies.remove()` - Xóa cookie
- `chrome.cookies.set()` - Set cookie mới
- `chrome.tabs.reload()` - Reload tab

#### **content.js** - Content Script

**Nhiệm vụ:**
1. Broadcast extension presence (custom event)
2. Monitor URL changes
3. Detect `/browse` → Thông báo success
4. Hiển thị notification trên Netflix page

**API sử dụng:**
- `window.dispatchEvent()` - Broadcast event
- `MutationObserver` - Theo dõi URL change (SPA)
- `chrome.runtime.sendMessage()` - Gửi message về background

### Web App Architecture

#### **app.js** - Main Logic

**State Management:**
```javascript
const state = {
    hasExtension: false,      // Extension detected?
    extensionId: null,        // Extension ID
    netflixTabRef: null,      // Tab reference
    adCountdown: 2,           // Ad timer
    adInterval: null          // Interval ID
};
```

**Core Functions:**
1. `checkExtension()` - Detect extension qua custom event
2. `handleOpenNetflix()` - Mở tab Netflix
3. `handleWatchAsGuest()` - Hiển thị ad, kiểm tra tab
4. `handleStartWatching()` - Đọc cookie, gửi tới extension
5. `injectCookieViaExtension()` - Message passing với extension

**Message Passing:**
```javascript
chrome.runtime.sendMessage(
    EXTENSION_ID,
    {
        action: 'injectCookie',
        cookieData: { name: '...', value: '...' },
        tabName: 'NETFLIX_TAB'
    },
    (response) => {
        if (response.success) {
            // Success!
        }
    }
);
```

### Cookie Format Support

Extension hỗ trợ 3 format cookie:

#### Format 1: Cookie String
```
NetflixId=v%3D2%26mac%3DAQEA...
```

#### Format 2: JSON Object
```json
{
  "name": "NetflixId",
  "value": "v%3D2%26mac%3D...",
  "domain": ".netflix.com",
  "path": "/",
  "secure": true,
  "httpOnly": false
}
```

#### Format 3: Netscape Format
```
.netflix.com	TRUE	/	TRUE	1757548800	NetflixId	v%3D2%26...
```

---

## 🚀 Next Steps - Production

### 1. Publish Extension lên Chrome Web Store

**Steps:**
1. Tạo tài khoản Chrome Web Store Developer ($5 một lần)
2. Zip folder `extension/`:
   ```bash
   cd extension
   zip -r netflix-guest-helper.zip *
   ```
3. Upload lên Chrome Web Store
4. Điền thông tin: mô tả, screenshots, privacy policy
5. Submit for review (2-5 ngày)
6. Publish → Có Extension ID cố định

**Sau khi publish:**
- Update `EXTENSION_ID` trong `app.js`
- User có thể cài từ Web Store (1 click)

### 2. Backend API

Thay `readCookieFromFile()` bằng API call:

```javascript
async function readCookieFromFile() {
    const response = await fetch('/api/get-guest-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ad_watched: true,
            payment_verified: false,
            user_id: 'guest_123'
        })
    });
    
    const data = await response.json();
    return data.cookie;
}
```

**Backend API response:**
```json
{
  "success": true,
  "cookie": {
    "name": "NetflixId",
    "value": "v%3D2...",
    "domain": ".netflix.com",
    "expirationDate": 1757548800
  },
  "session_id": "abc123",
  "expires_in": 3600
}
```

### 3. Payment Integration

Thêm option trả phí thay vì xem quảng cáo:

```javascript
// Trong handleWatchAsGuest()
if (userChosePayment) {
    const paymentResult = await processPayment();
    if (paymentResult.success) {
        // Skip ad, inject cookie ngay
        handleStartWatching();
    }
} else {
    // Show ad như cũ
    showAdModal();
}
```

### 4. Session Management

Track thời gian xem, auto logout:

```javascript
// Trong extension background.js
chrome.alarms.create('sessionExpiry', {
    delayInMinutes: 120 // 2 hours
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'sessionExpiry') {
        // Clear Netflix cookies
        clearNetflixCookies();
        // Notify user
    }
});
```

---

## ⚖️ Legal & Security

### ⚠️ Disclaimer

**Dự án này chỉ phục vụ mục đích giáo dục:**
- Học cách làm Chrome Extension
- Hiểu cookie-based authentication
- Nghiên cứu message passing giữa web app và extension

**Chia sẻ tài khoản Netflix có thể vi phạm:**
- Netflix Terms of Service
- Luật bản quyền
- Quyền riêng tư

**Sử dụng có trách nhiệm!**

### 🔐 Security Best Practices

1. **Cookie Storage**:
   - ❌ KHÔNG lưu cookie trong code
   - ✅ Lưu trên server, encrypt
   - ✅ Dùng HTTPS

2. **Extension Permissions**:
   - ✅ Chỉ request quyền cần thiết
   - ✅ `host_permissions` chỉ Netflix domain

3. **User Privacy**:
   - ✅ Không track user behavior
   - ✅ Không log sensitive data
   - ✅ Cookie auto-expire sau X giờ

---

## 📞 Support & FAQ

### Q1: Extension không detect được?

**A:** 
1. Reload extension: `chrome://extensions/` → ⟳
2. Reload web app: F5
3. Check console: F12 → Console tab
4. Xem log: Có thông báo "Extension ready event received" không?

### Q2: Cookie inject nhưng vẫn không login được?

**A:**
1. Cookie đã hết hạn → Lấy cookie mới
2. Netflix phát hiện sharing → Đổi account
3. Multiple sessions → Netflix giới hạn số device

### Q3: Có thể dùng trên Firefox không?

**A:** Có, nhưng cần sửa:
- Đổi `chrome.*` → `browser.*` (WebExtensions API)
- Manifest format hơi khác
- Publish lên Firefox Add-ons thay vì Chrome Web Store

### Q4: Làm sao biết Extension ID?

**A:**
1. Vào `chrome://extensions/`
2. Tìm "Netflix Guest Helper"
3. ID nằm ngay dưới tên (dạng: `abcdefg...`)
4. Hoặc click icon extension → ID hiện trong popup

### Q5: Demo ad có thể thay bằng video thật không?

**A:** Có! Sửa `index.html`:
```html
<video id="adVideo" autoplay>
    <source src="ad-video.mp4" type="video/mp4">
</video>
```
Và bỏ `adVideo.style.display = 'none'` trong `createDemoAdVideo()`.

---

## 🎉 Hoàn thành!

Giờ bạn đã có:
- ✅ Chrome Extension hoạt động đầy đủ
- ✅ Web demo với luồng 2 nút rõ ràng
- ✅ Cookie injection tự động 100%
- ✅ Error handling toàn diện
- ✅ Hướng dẫn chi tiết

**Happy coding! 🚀**

---

**Made with ❤️ for educational purposes**

