# ❓ Trả lời 2 câu hỏi kỹ thuật

---

## Câu 1: Xử lý cookie thuần front-end?

### ❌ KHÔNG THỂ - Lý do chi tiết:

#### 1.1. Same-Origin Policy (SOP)

**Định nghĩa:**
Browser chỉ cho phép JavaScript truy cập cookie của **cùng origin** (protocol + domain + port).

**Ví dụ:**
```javascript
// Trang web: http://localhost:8000
document.cookie; // ✅ Đọc được cookie của localhost:8000

// KHÔNG THỂ đọc cookie của Netflix:
document.cookie; // ❌ Không thể đọc cookie của netflix.com
```

**Netflix origin:**
- Protocol: `https://`
- Domain: `www.netflix.com`
- Port: `443` (mặc định HTTPS)
- → Origin: `https://www.netflix.com:443`

**Web app origin:**
- Protocol: `http://`
- Domain: `localhost`
- Port: `8000`
- → Origin: `http://localhost:8000`

**Kết luận:** Hai origin khác nhau → **SOP chặn hoàn toàn**.

---

#### 1.2. SameSite Cookie Attribute

**Netflix cookies có attribute:**
```javascript
{
  name: "NetflixId",
  value: "...",
  domain: ".netflix.com",
  secure: true,
  httpOnly: true,
  sameSite: "Lax" // hoặc "Strict"
}
```

**SameSite chặn gì?**
- `Lax`: Cookie chỉ gửi khi navigate đến Netflix (top-level navigation)
- `Strict`: Cookie chỉ gửi khi request từ chính Netflix
- `None`: Cho phép cross-site (cần `Secure=true`)

**Thử inject bằng `document.cookie`:**
```javascript
// Tại localhost:8000
document.cookie = "NetflixId=abc123; domain=.netflix.com; path=/; secure";
// ❌ LỖI: Browser reject vì domain không khớp
```

**Browser security:**
- Chrome/Firefox **từ chối** set cookie cho domain khác
- Chỉ cho phép set cookie cho subdomain của origin hiện tại

---

#### 1.3. Cross-Origin Resource Sharing (CORS)

**Thử dùng `fetch()` để set cookie:**
```javascript
// Tại localhost:8000
fetch('https://www.netflix.com', {
  method: 'GET',
  credentials: 'include', // Gửi cookies
  headers: {
    'Cookie': 'NetflixId=abc123' // ❌ LỖI
  }
});
```

**Lỗi:**
```
Refused to set unsafe header "Cookie"
```

**Giải thích:**
- `Cookie` header là **forbidden header name**
- Browser không cho phép JavaScript set header này
- Chỉ browser tự động set khi gửi request

**CORS preflight:**
```
OPTIONS https://www.netflix.com
Origin: http://localhost:8000

Response:
Access-Control-Allow-Origin: https://www.netflix.com
(KHÔNG có localhost:8000)
```
→ Netflix không cho phép cross-origin request từ localhost.

---

#### 1.4. HttpOnly Cookie

**Netflix cookies thường có `httpOnly: true`:**
```javascript
{
  name: "NetflixId",
  httpOnly: true // ❌ JavaScript KHÔNG thể đọc/ghi
}
```

**Tại sao?**
- Bảo vệ khỏi XSS attacks
- Chỉ server (HTTP headers) mới đọc/ghi được
- `document.cookie` sẽ KHÔNG thấy cookie này

**Thử đọc:**
```javascript
// Tại netflix.com
console.log(document.cookie);
// Output: "cookie1=value1; cookie2=value2"
// (KHÔNG có NetflixId vì httpOnly=true)
```

---

#### 1.5. Secure Cookie

**Netflix cookies có `secure: true`:**
```javascript
{
  name: "NetflixId",
  secure: true // Chỉ gửi qua HTTPS
}
```

**Thử set qua HTTP:**
```javascript
// Tại http://localhost:8000 (HTTP, không phải HTTPS)
document.cookie = "NetflixId=abc; domain=.netflix.com; secure=true";
// ❌ LỖI: Secure cookie không thể set qua HTTP
```

---

#### 1.6. Thử mọi cách thuần front-end

**Cách 1: `document.cookie`**
```javascript
document.cookie = "NetflixId=value; domain=.netflix.com";
// ❌ Rejected: Domain không khớp
```

**Cách 2: `fetch()` với credentials**
```javascript
fetch('https://www.netflix.com', {
  credentials: 'include'
});
// ❌ Cookie vẫn là của localhost, không phải Netflix
```

**Cách 3: `XMLHttpRequest`**
```javascript
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;
xhr.open('GET', 'https://www.netflix.com');
xhr.setRequestHeader('Cookie', 'NetflixId=value');
// ❌ Lỗi: Refused to set unsafe header "Cookie"
```

**Cách 4: `iframe` trick**
```javascript
const iframe = document.createElement('iframe');
iframe.src = 'https://www.netflix.com';
document.body.appendChild(iframe);

iframe.contentWindow.document.cookie = "NetflixId=value";
// ❌ Lỗi: Blocked by Same-Origin Policy
// Không thể access iframe.contentWindow của origin khác
```

**Cách 5: `window.open()` trick**
```javascript
const win = window.open('https://www.netflix.com', '_blank');
win.document.cookie = "NetflixId=value";
// ❌ Lỗi: Cannot access property 'document' of cross-origin window
```

---

### ✅ KẾT LUẬN CÂU 1

**KHÔNG THỂ xử lý cookie thuần front-end vì:**

1. **Same-Origin Policy** - Chỉ đọc/ghi cookie cùng origin
2. **SameSite Attribute** - Netflix cookies có SameSite=Lax/Strict
3. **CORS** - Netflix không allow cross-origin requests
4. **HttpOnly Flag** - JavaScript không thể access
5. **Secure Flag** - Chỉ gửi qua HTTPS
6. **Forbidden Headers** - Browser không cho set Cookie header
7. **Cross-origin Window Access** - Không thể access iframe/popup khác origin

**Các browser security đều block hoàn toàn!**

---

## Câu 2: Extension cần gì?

### ✅ Chrome Extension Requirements - Chi tiết

#### 2.1. Manifest V3 (Chrome Extensions latest standard)

**File: `manifest.json`**
```json
{
  "manifest_version": 3,
  "name": "Netflix Guest Helper",
  "version": "1.0.0",
  "description": "Tự động inject cookie Netflix",
  
  "permissions": [
    "cookies",    // ✅ Đọc/ghi cookies mọi domain
    "tabs",       // ✅ Quản lý tabs
    "storage"     // ✅ Lưu trữ data
  ],
  
  "host_permissions": [
    "*://*.netflix.com/*"  // ✅ Access tất cả Netflix subdomains
  ],
  
  "background": {
    "service_worker": "background.js",  // ✅ Manifest V3 dùng service worker
    "type": "module"                    // ✅ ES6 modules support
  },
  
  "content_scripts": [
    {
      "matches": ["*://*.netflix.com/*"],  // ✅ Chạy trên Netflix pages
      "js": ["content.js"],
      "run_at": "document_end"             // ✅ Sau khi DOM load xong
    }
  ],
  
  "externally_connectable": {
    "matches": [
      "http://localhost:*/*",      // ✅ Local dev
      "https://yourdomain.com/*"   // ✅ Production domain
    ]
  }
}
```

**Giải thích từng phần:**

##### `"manifest_version": 3`
- Chrome yêu cầu dùng Manifest V3 (MV2 deprecated từ 2023)
- MV3 an toàn hơn, dùng Service Worker thay vì background pages

##### `"permissions": ["cookies", "tabs", "storage"]`

**`"cookies"`:**
- Cho phép dùng `chrome.cookies.*` API
- Đọc: `chrome.cookies.get()`, `chrome.cookies.getAll()`
- Ghi: `chrome.cookies.set()`
- Xóa: `chrome.cookies.remove()`
- **BYPASS Same-Origin Policy!**

**`"tabs"`:**
- Cho phép dùng `chrome.tabs.*` API
- Query tabs: `chrome.tabs.query()`
- Reload: `chrome.tabs.reload()`
- Update: `chrome.tabs.update()`
- Listen events: `chrome.tabs.onUpdated`

**`"storage"`:**
- Lưu trữ data: `chrome.storage.local.set()`
- Đọc data: `chrome.storage.local.get()`
- Sync across devices: `chrome.storage.sync`

##### `"host_permissions": ["*://*.netflix.com/*"]`
- Cho phép extension access Netflix domain
- `*://` = HTTP hoặc HTTPS
- `*.netflix.com` = Tất cả subdomains (www.netflix.com, api.netflix.com, ...)
- `/*` = Tất cả paths

##### `"externally_connectable"`
- Cho phép web app (localhost/yourdomain) gửi message tới extension
- Dùng `chrome.runtime.sendMessage(extensionId, {...})`

---

#### 2.2. Background Service Worker

**File: `background.js`**

**Nhiệm vụ:**
- Lắng nghe message từ web app
- Xử lý cookie injection
- Quản lý tabs

**API cần dùng:**

##### `chrome.runtime.onMessageExternal`
```javascript
chrome.runtime.onMessageExternal.addListener(
    async (request, sender, sendResponse) => {
        if (request.action === 'injectCookie') {
            // Xử lý inject cookie
            const result = await injectCookie(request.cookieData);
            sendResponse({ success: true });
        }
        return true; // Keep channel open cho async
    }
);
```

**Giải thích:**
- `onMessageExternal` = Nhận message từ external sources (web app)
- `onMessage` = Nhận message từ content scripts
- `sendResponse()` = Gửi response về
- `return true` = Keep message channel open cho async operations

##### `chrome.cookies.*` API

**Get cookies:**
```javascript
const cookies = await chrome.cookies.getAll({
    domain: '.netflix.com'
});
// Trả về array tất cả cookies của Netflix
```

**Remove cookie:**
```javascript
await chrome.cookies.remove({
    url: 'https://www.netflix.com/',
    name: 'NetflixId'
});
```

**Set cookie:**
```javascript
await chrome.cookies.set({
    url: 'https://www.netflix.com',
    name: 'NetflixId',
    value: 'abc123...',
    domain: '.netflix.com',
    path: '/',
    secure: true,
    httpOnly: true,  // ✅ Extension có thể set httpOnly cookies!
    sameSite: 'no_restriction',
    expirationDate: 1757548800
});
```

**Điểm mạnh:**
- ✅ Có thể set `httpOnly: true` (JavaScript thuần KHÔNG thể)
- ✅ Có thể set cookie cho bất kỳ domain nào (nếu có `host_permissions`)
- ✅ Bypass Same-Origin Policy
- ✅ Bypass SameSite restrictions

##### `chrome.tabs.*` API

**Query tabs:**
```javascript
const netflixTabs = await chrome.tabs.query({
    url: '*://*.netflix.com/*'
});
// Tìm tất cả tabs Netflix đang mở
```

**Reload tab:**
```javascript
await chrome.tabs.reload(tabId);
```

**Update URL:**
```javascript
await chrome.tabs.update(tabId, {
    url: 'https://www.netflix.com/browse'
});
```

**Listen URL changes:**
```javascript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && changeInfo.url.includes('/browse')) {
        console.log('Netflix login successful!');
    }
});
```

---

#### 2.3. Content Script

**File: `content.js`**

**Nhiệm vụ:**
- Chạy trên Netflix page (trong context của Netflix)
- Monitor URL changes
- Detect `/browse` → Login thành công
- Broadcast extension presence

**API cần dùng:**

##### Custom Events (Extension Presence Detection)
```javascript
window.dispatchEvent(new CustomEvent('NetflixGuestExtensionReady', {
    detail: {
        version: '1.0.0',
        extensionId: chrome.runtime.id
    }
}));
```

**Web app lắng nghe:**
```javascript
window.addEventListener('NetflixGuestExtensionReady', (event) => {
    console.log('Extension detected:', event.detail.extensionId);
});
```

##### MutationObserver (URL Monitoring)
```javascript
let lastUrl = location.href;

const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        checkLoginStatus(); // Check nếu URL = /browse
    }
});

observer.observe(document, {
    subtree: true,
    childList: true
});
```

**Tại sao cần?**
- Netflix là SPA (Single Page Application)
- URL thay đổi KHÔNG trigger `window.onload`
- Cần dùng `MutationObserver` hoặc `pushState` listener

##### `chrome.runtime.sendMessage()` (Content → Background)
```javascript
chrome.runtime.sendMessage({
    action: 'loginSuccess',
    url: window.location.href
});
```

---

#### 2.4. Message Passing Flow

**Luồng communication đầy đủ:**

```
WEB APP (localhost:8000)
    │
    │ chrome.runtime.sendMessage(extensionId, {...})
    │ ├─ action: 'injectCookie'
    │ └─ cookieData: {...}
    ↓
BACKGROUND.JS (Extension)
    │
    │ chrome.runtime.onMessageExternal
    │ ├─ Nhận message
    │ ├─ Parse cookieData
    │ ├─ chrome.tabs.query() → Tìm tab Netflix
    │ ├─ chrome.cookies.remove() → Xóa cookies cũ
    │ ├─ chrome.cookies.set() → Set cookie mới
    │ └─ chrome.tabs.reload() → Reload Netflix
    │
    │ sendResponse({ success: true })
    ↓
WEB APP
    │ Nhận response
    │ Hiển thị "Thành công!"
    
Đồng thời:

NETFLIX TAB (www.netflix.com)
    │
    │ content.js đang chạy
    │ Monitor URL changes
    ↓
    │ URL = /browse
    │
    │ chrome.runtime.sendMessage()
    │ └─ action: 'loginSuccess'
    ↓
BACKGROUND.JS
    │ Nhận message
    │ Log success
    ↓
CONTENT.JS
    │ chrome.tabs.sendMessage(tabId, {showNotification})
    │ Hiển thị notification trên Netflix page
```

---

### ✅ KẾT LUẬN CÂU 2

**Extension cần:**

#### 1. Manifest V3 với permissions:
- ✅ `"cookies"` - Đọc/ghi cookies mọi domain
- ✅ `"tabs"` - Quản lý tabs
- ✅ `"storage"` - Lưu trữ data
- ✅ `"host_permissions"` - Access Netflix domain
- ✅ `"externally_connectable"` - Nhận message từ web app

#### 2. Background Service Worker (`background.js`):
- ✅ `chrome.runtime.onMessageExternal` - Nhận message từ web app
- ✅ `chrome.cookies.getAll()` - Lấy cookies
- ✅ `chrome.cookies.remove()` - Xóa cookies
- ✅ `chrome.cookies.set()` - Set cookies (có thể set httpOnly!)
- ✅ `chrome.tabs.query()` - Tìm tabs
- ✅ `chrome.tabs.reload()` - Reload tabs
- ✅ `chrome.tabs.onUpdated` - Monitor URL changes

#### 3. Content Script (`content.js`):
- ✅ Custom Events - Broadcast extension presence
- ✅ MutationObserver - Monitor SPA navigation
- ✅ `chrome.runtime.sendMessage()` - Gửi message về background
- ✅ DOM manipulation - Hiển thị notifications

#### 4. Popup (Optional - UI):
- ✅ `popup.html` - Extension popup UI
- ✅ `popup.js` - Test extension, show info

---

## 🎯 So sánh: Front-end vs Extension

| Feature | Pure Front-end | Chrome Extension |
|---------|---------------|------------------|
| **Đọc cookie cross-origin** | ❌ Blocked by SOP | ✅ chrome.cookies.get() |
| **Ghi cookie cross-origin** | ❌ Blocked by SOP | ✅ chrome.cookies.set() |
| **Set httpOnly cookie** | ❌ Impossible | ✅ Có thể |
| **Set secure cookie qua HTTP** | ❌ Blocked | ✅ Có thể |
| **Bypass SameSite** | ❌ Blocked | ✅ sameSite: 'no_restriction' |
| **Access tab khác origin** | ❌ CORS block | ✅ chrome.tabs.* |
| **Inject script vào page** | ❌ CSP block | ✅ content_scripts |
| **Message passing** | ❌ postMessage limited | ✅ chrome.runtime.* |

---

## 📚 Tài liệu tham khảo

### Browser Security:
- [Same-Origin Policy - MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [SameSite Cookies - web.dev](https://web.dev/samesite-cookies-explained/)
- [CORS - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

### Chrome Extension APIs:
- [chrome.cookies API](https://developer.chrome.com/docs/extensions/reference/cookies/)
- [chrome.tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)
- [chrome.runtime API](https://developer.chrome.com/docs/extensions/reference/runtime/)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)

---

**Tóm tắt:**

1. **Front-end KHÔNG THỂ** xử lý cookie cross-origin vì browser security (SOP, CORS, SameSite, HttpOnly, Secure flags)

2. **Extension CẦN** Manifest V3 với permissions (`cookies`, `tabs`, `host_permissions`) và các API (`chrome.cookies.*`, `chrome.tabs.*`, `chrome.runtime.*`) để bypass các restrictions này.

**Extension là giải pháp DUY NHẤT cho cookie injection cross-origin!**

