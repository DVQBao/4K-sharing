# 📁 File Structure - Netflix Guest Sharing Project

Tổng quan cấu trúc thư mục và chức năng từng file.

---

## 📂 Root Directory

```
NetflixSharingProject/
│
├── 📄 index.html                 # Main web application UI
├── 📄 app.js                     # Main application logic
├── 📄 cookie.txt                 # Netflix cookie storage (user editable)
│
├── 📁 extension/                 # Chrome Extension directory
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   ├── popup.js
│   └── icon*.png
│
├── 📄 test-extension.html        # Extension test suite
│
├── 📄 README.md                  # Project overview
├── 📄 SETUP.md                   # Detailed setup guide
├── 📄 QUICKSTART.md              # 5-minute quick start
├── 📄 ANSWER.md                  # Technical Q&A
├── 📄 SUMMARY.md                 # Project summary
├── 📄 FILE_STRUCTURE.md          # This file
│
├── 📄 start.bat                  # Windows startup script
├── 📄 start.sh                   # Linux/Mac startup script
│
├── 📄 .gitignore                 # Git ignore rules
└── 📄 LICENSE                    # MIT License
```

---

## 📝 File Details

### 🌐 Web Application

#### `index.html` (244 lines)
**Purpose:** Main web UI với luồng 2 bước

**Features:**
- Extension status banner (xanh/đỏ)
- Option 1: Buy Official (link Netflix)
- Option 2: Watch as Guest (2-step flow)
  - Step 1: Mở Netflix Tab
  - Step 2: Xem ad + Inject cookie
- Ad modal với countdown timer
- Toast notifications
- Modern gradient UI, responsive design

**CSS:** Embedded, Netflix-themed (dark + red gradient)

---

#### `app.js` (355 lines)
**Purpose:** Main application logic

**Core Functions:**
- `checkExtension()` - Detect extension via Custom Event
- `handleOpenNetflix()` - Mở Netflix tab, tracking
- `handleWatchAsGuest()` - Kiểm tra tab, show ad modal
- `handleStartWatching()` - Đọc cookie, inject via extension
- `readCookieFromFile()` - Parse cookie.txt (3 formats)
- `injectCookieViaExtension()` - Message passing

**State Management:**
```javascript
const state = {
    hasExtension: false,
    extensionId: null,
    netflixTabRef: null,
    adCountdown: 2,
    adInterval: null
};
```

**Error Handling:**
- Tab chưa mở → Highlight bước 1
- Extension chưa cài → Warning banner
- Cookie file lỗi → Error toast

---

#### `cookie.txt`
**Purpose:** Lưu Netflix cookie

**Supported Formats:**

1. **Cookie String** (hiện tại):
   ```
   NetflixId=v%3D2%26mac%3D...
   ```

2. **JSON Object:**
   ```json
   {
     "name": "NetflixId",
     "value": "...",
     "domain": ".netflix.com"
   }
   ```

3. **Netscape Format:**
   ```
   .netflix.com	TRUE	/	TRUE	1757548800	NetflixId	value
   ```

**Security:** Add vào `.gitignore`

---

### 🧩 Chrome Extension

#### `extension/manifest.json` (33 lines)
**Purpose:** Extension configuration (Manifest V3)

**Key Fields:**
- `manifest_version`: 3
- `permissions`: `["cookies", "tabs", "storage"]`
- `host_permissions`: `["*://*.netflix.com/*"]`
- `background`: Service worker (background.js)
- `content_scripts`: Netflix page monitoring
- `externally_connectable`: Web app communication

---

#### `extension/background.js` (280 lines)
**Purpose:** Service worker - Cookie injection logic

**Message Handlers:**
- `ping` - Health check
- `injectCookie` - Main injection flow
- `testCookieAPI` - Test cookie permissions
- `testTabsAPI` - Test tabs permissions
- `echo` - Message passing test

**Core Functions:**
- `findNetflixTab()` - Query Netflix tabs
- `clearNetflixCookies()` - Remove all Netflix cookies
- `injectCookies()` - Set new cookies
- `monitorNetflixTab()` - Watch for `/browse`

**APIs Used:**
- `chrome.runtime.onMessageExternal`
- `chrome.cookies.*`
- `chrome.tabs.*`

---

#### `extension/content.js` (120 lines)
**Purpose:** Content script chạy trên Netflix page

**Features:**
- Broadcast extension presence (Custom Event)
- Monitor URL changes (MutationObserver)
- Detect `/browse` → Login success
- Show success notification

**Event Dispatched:**
```javascript
window.dispatchEvent(new CustomEvent('NetflixGuestExtensionReady', {
    detail: { version: '1.0.0', extensionId: chrome.runtime.id }
}));
```

---

#### `extension/popup.html` (80 lines)
**Purpose:** Extension popup UI

**Display:**
- Extension status badge
- Extension ID (click to copy)
- Usage instructions
- Test Extension button
- Open Web Demo button

**Design:** Gradient purple theme

---

#### `extension/popup.js` (85 lines)
**Purpose:** Popup logic

**Functions:**
- `loadExtensionInfo()` - Show extension ID & status
- `testExtension()` - Run permission tests
- `openWebApp()` - Open demo page

---

#### `extension/icon*.png`
**Purpose:** Extension icons

- `icon16.png` - Toolbar icon (16x16)
- `icon48.png` - Extension page (48x48)
- `icon128.png` - Web Store (128x128)

**Current:** Placeholder PNG, thay bằng Netflix-themed icon

---

### 🧪 Testing

#### `test-extension.html` (300+ lines)
**Purpose:** Comprehensive test suite

**Tests:**
1. **Extension Detection** - Custom Event listening
2. **Permissions Check** - `chrome.runtime.sendMessage()`
3. **Cookie API Test** - `chrome.cookies.*`
4. **Tabs API Test** - `chrome.tabs.*`
5. **Message Passing** - Echo test

**UI:**
- Green/Red/Yellow status indicators
- Real-time log panel
- Run all tests button
- Matrix-style terminal theme

---

### 📖 Documentation

#### `README.md` (200 lines)
**Purpose:** Project overview & quick start

**Sections:**
- Quick Start (4 steps)
- Architecture diagram
- File structure
- Features checklist
- Troubleshooting
- Legal notice
- Learning resources

---

#### `SETUP.md` (600+ lines)
**Purpose:** Comprehensive setup guide

**Sections:**
1. Tổng quan hệ thống
2. Cài đặt Chrome Extension (step-by-step)
3. Chạy Web Demo
4. Test hoạt động (screenshots)
5. Cách sử dụng (user flow)
6. Troubleshooting (10+ lỗi thường gặp)
7. Technical Details (API, architecture)
8. Next Steps Production

---

#### `QUICKSTART.md` (150 lines)
**Purpose:** 5-minute quick start

**Steps:**
1. Cài Extension (2 phút)
2. Chạy Web Server (1 phút)
3. Chuẩn bị Cookie (1 phút)
4. Test Extension (30s)
5. Demo Full Flow (30s)

**Includes:** Checklist & common errors

---

#### `ANSWER.md` (400+ lines)
**Purpose:** Trả lời 2 câu hỏi kỹ thuật

**Câu 1:** Xử lý cookie thuần front-end?
- ❌ KHÔNG THỂ
- Giải thích chi tiết: SOP, CORS, SameSite, HttpOnly, Secure
- Code examples minh họa

**Câu 2:** Extension cần gì?
- ✅ Manifest V3 requirements
- Permissions breakdown
- API usage examples
- Message passing flow

**Includes:** Comparison table (Front-end vs Extension)

---

#### `SUMMARY.md` (300+ lines)
**Purpose:** Tổng kết dự án

**Sections:**
- Checklist hoàn thành
- File structure
- Core features
- Technical details
- Test coverage
- Security & Legal
- Next steps production

---

#### `FILE_STRUCTURE.md` (this file)
**Purpose:** Chi tiết cấu trúc file và chức năng

---

### 🚀 Startup Scripts

#### `start.bat` (Windows)
**Purpose:** Quick start script cho Windows

**Actions:**
1. Check Python installed
2. Start `python -m http.server 8000`
3. Auto-open browser tabs:
   - `http://localhost:8000`
   - `http://localhost:8000/test-extension.html`

**Usage:**
```cmd
double-click start.bat
```

---

#### `start.sh` (Linux/Mac)
**Purpose:** Quick start script cho Unix-based OS

**Actions:** Same as `start.bat` but uses `python3`

**Usage:**
```bash
chmod +x start.sh
./start.sh
```

---

### 🔧 Configuration

#### `.gitignore`
**Purpose:** Git ignore rules

**Ignored:**
- `cookie.txt` (sensitive)
- `*.log` (logs)
- `.DS_Store`, `Thumbs.db` (OS files)
- `.vscode/`, `.idea/` (editor files)
- `node_modules/` (if added)
- `*.crx`, `*.pem` (extension build files)

---

#### `LICENSE`
**Purpose:** MIT License + Educational Disclaimer

**Sections:**
1. MIT License text
2. Educational Purpose Disclaimer
3. Legal Notice
4. User Acknowledgment

---

## 📊 Statistics

### Code:
- **Total Files:** 19
- **Total Lines:** ~3,000+
- **JavaScript:** ~1,200 lines
- **HTML/CSS:** ~800 lines
- **Documentation:** ~2,000 lines

### Coverage:
- ✅ Extension: 100% (manifest, background, content, popup)
- ✅ Web App: 100% (UI, logic, error handling)
- ✅ Testing: Test suite + manual tests
- ✅ Documentation: Comprehensive (5 markdown files)

---

## 🎯 Key Features by File

| File | Key Features |
|------|--------------|
| `index.html` | 2-step UI, ad modal, toast notifications |
| `app.js` | Extension detection, cookie reading, message passing |
| `background.js` | Cookie injection, tab management, monitoring |
| `content.js` | URL monitoring, success notification |
| `popup.html/js` | Extension info, test button |
| `test-extension.html` | 5 automated tests, real-time log |
| `SETUP.md` | 600+ lines guide, troubleshooting |
| `ANSWER.md` | Technical deep dive (SOP, CORS, APIs) |

---

## 🔄 Data Flow

```
cookie.txt
    ↓
app.js → readCookieFromFile()
    ↓
chrome.runtime.sendMessage(extensionId, {cookieData})
    ↓
background.js → onMessageExternal
    ↓
chrome.cookies.set(cookieData)
    ↓
chrome.tabs.reload(netflixTabId)
    ↓
content.js → MutationObserver
    ↓
Detect /browse → Success!
```

---

## 📚 Documentation Hierarchy

```
README.md           ← Start here (overview)
    ↓
QUICKSTART.md       ← 5-minute setup
    ↓
SETUP.md            ← Full guide (600+ lines)
    ↓
ANSWER.md           ← Technical deep dive
    ↓
SUMMARY.md          ← Project summary
    ↓
FILE_STRUCTURE.md   ← You are here!
```

---

**Tip:** Để hiểu dự án nhanh nhất, đọc theo thứ tự:
1. README.md (5 phút)
2. QUICKSTART.md (5 phút)
3. Code comments trong app.js & background.js
4. SETUP.md khi gặp vấn đề
5. ANSWER.md để hiểu kỹ thuật sâu

---

**Last Updated:** 2025-10-10

**Total Project Size:** ~3,000+ lines of code & documentation

