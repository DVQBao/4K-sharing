# ⚡ Quick Start - 5 phút setup

Hướng dẫn nhanh để chạy demo Netflix Guest Sharing ngay lập tức.

---

## 📦 Bước 1: Cài Extension (2 phút)

### 1.1. Mở Chrome Extensions

Vào: `chrome://extensions/`

### 1.2. Bật Developer Mode

Toggle switch góc trên phải → **ON**

### 1.3. Load Extension

1. Click **"Load unpacked"**
2. Chọn folder:
   ```
   C:\Users\Admin\PycharmProjects\PythonProject\NetflixSharingProject\extension
   ```
3. ✅ Extension **"Netflix Guest Helper"** xuất hiện

---

## 🌐 Bước 2: Chạy Web Server (1 phút)

### PowerShell (Windows):

```powershell
cd C:\Users\Admin\PycharmProjects\PythonProject\NetflixSharingProject
python -m http.server 8000
```

### Hoặc dùng Node.js:

```bash
npx http-server -p 8000
```

**Kết quả:**
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

---

## 🍪 Bước 3: Chuẩn bị Cookie (1 phút)

### 3.1. Lấy Netflix Cookie

1. Đăng nhập **Netflix** trên Chrome
2. **F12** → Tab **Application**
3. **Cookies** → `https://www.netflix.com`
4. Tìm cookie **`NetflixId`**
5. **Copy Value** (dạng: `v%3D2%26mac%3D...`)

### 3.2. Edit cookie.txt

Mở file: `NetflixSharingProject/cookie.txt`

Paste cookie:
```
NetflixId=v%3D2%26mac%3DAQEAEQABAACYh...
```

Save file!

---

## 🧪 Bước 4: Test Extension (30 giây)

Mở: `http://localhost:8000/test-extension.html`

Click **"▶️ Chạy tất cả tests"**

**Kết quả mong đợi:**
```
✅ Test 1: Extension Detection - PASSED
✅ Test 2: Permissions Check - PASSED
✅ Test 3: Cookie API Test - PASSED
✅ Test 4: Tabs API Test - PASSED
✅ Test 5: Message Passing - PASSED
```

Nếu tất cả PASSED → Extension hoạt động hoàn hảo!

---

## 🎬 Bước 5: Demo Full Flow (30 giây)

### 5.1. Mở Web App

Vào: `http://localhost:8000`

### 5.2. Kiểm tra Extension Banner

Phải thấy banner màu **xanh**:
```
✅ Extension đã cài đặt
Chế độ tự động đã bật...
Extension ID: abcdefg...
```

### 5.3. Test Luồng 2 Bước

#### **Bước 1: Mở Netflix**
- Click **"🌐 Mở Netflix Tab"**
- Tab Netflix mở → Status: ✅ **"Đã mở Netflix tab thành công!"**

#### **Bước 2: Watch as Guest**
- Click **"📺 Watch as Guest"**
- Modal quảng cáo hiện → Đếm ngược **2s** (demo)
- Sau 2s → Click **"Bắt đầu xem"**

#### **Kết quả:**
- Status: ✅ **"Thành công! Đang reload Netflix..."**
- Tab Netflix **tự động reload**
- URL chuyển sang **`/browse`**
- Netflix đã **login!** 🎉

---

## ✅ Checklist Hoàn Thành

- [ ] Extension loaded vào Chrome
- [ ] Developer mode đã bật
- [ ] Web server đang chạy (`localhost:8000`)
- [ ] `cookie.txt` đã có Netflix cookie thật
- [ ] Test page: Tất cả tests PASSED
- [ ] Web app: Banner xanh "Extension đã cài đặt"
- [ ] Bước 1: Tab Netflix mở thành công
- [ ] Bước 2: Cookie inject thành công
- [ ] Netflix reload → `/browse` → Login OK!

---

## 🐛 Lỗi thường gặp

### ❌ "Extension chưa được cài đặt"

**Fix:**
1. `chrome://extensions/` → Kiểm tra extension có **Enabled** không?
2. Reload extension (icon ⟳)
3. **F5** reload web app

---

### ❌ "Netflix tab not found"

**Fix:**
1. Cho phép popup: Chrome Settings → Popups → Allow `localhost`
2. Hoặc click icon popup ở address bar
3. Click lại **"Mở Netflix Tab"**

---

### ❌ "Failed to inject cookie"

**Fix:**
1. Kiểm tra `cookie.txt` có đúng format:
   ```
   NetflixId=value...
   ```
2. Lấy cookie mới (cookie cũ có thể hết hạn)
3. Test extension: `http://localhost:8000/test-extension.html`

---

## 📖 Tài liệu chi tiết

- **README.md** - Tổng quan hệ thống
- **SETUP.md** - Hướng dẫn đầy đủ, troubleshooting
- **ANSWER.md** - Giải thích kỹ thuật (front-end vs extension)

---

## 🚀 Next Steps

### Deploy Production

1. **Publish Extension:**
   - Zip folder `extension/`
   - Upload lên Chrome Web Store
   - User cài 1-click!

2. **Deploy Web App:**
   - Host trên server (Vercel, Netlify, ...)
   - Update `externally_connectable` trong manifest với domain thật

3. **Backend API:**
   - Thay `readCookieFromFile()` → `fetch('/api/get-cookie')`
   - Quản lý cookie pool trên server

---

**🎉 Xong! Giờ bạn đã có demo Netflix Guest Sharing hoạt động hoàn chỉnh!**

**Questions?** Xem [SETUP.md](SETUP.md) để biết thêm chi tiết.

