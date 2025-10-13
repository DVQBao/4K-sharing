# 📊 Monthly Report Limit - Admin Control

## 🎯 Tính Năng

Admin có thể xem và chỉnh sửa số lần "Đổi TK" (monthly report limit) của từng user trực tiếp trong Admin Panel.

---

## ✨ Cải Tiến

### **1. 🔧 Đồng Bộ Hiển Thị**

**VẤN ĐỀ TRƯỚC:**
```javascript
// Code cũ
${user.monthlyReportLimit || 5}/5

// Kết quả:
// monthlyReportLimit = 0 → Hiển thị "5/5" ❌ SAI!
// monthlyReportLimit = 3 → Hiển thị "3/5" ✅ ĐÚNG
```

**GIẢI PHÁP:**
```javascript
// Code mới
${user.monthlyReportLimit !== undefined ? user.monthlyReportLimit : 5}/5

// Kết quả:
// monthlyReportLimit = 0 → Hiển thị "0/5" ✅ ĐÚNG!
// monthlyReportLimit = 3 → Hiển thị "3/5" ✅ ĐÚNG
```

---

### **2. ✏️ Chỉnh Sửa Trong Edit Mode**

**Cách sử dụng:**
1. Click **"EDIT"** trên user row
2. Cột **"Đổi TK"** trở thành input field (0-5)
3. Nhập giá trị mới (0, 1, 2, 3, 4, hoặc 5)
4. Click **"SUBMIT"**
5. Hệ thống cập nhật database và refresh table

**Validation:**
- ✅ Chỉ cho phép số từ 0 đến 5
- ❌ Nếu nhập số âm hoặc > 5 → Alert lỗi
- ❌ Nếu để trống → Alert lỗi

---

## 🖥️ Giao Diện

### **View Mode:**
```
┌─────────────┐
│ Đổi TK      │
├─────────────┤
│ 0/5 (đỏ)    │ ← monthlyReportLimit = 0
│ 2/5 (vàng)  │ ← monthlyReportLimit = 2  
│ 4/5 (xanh)  │ ← monthlyReportLimit = 4
└─────────────┘
```

**Màu sắc:**
- 🔴 **Đỏ:** 0/5 (hết lượt)
- 🟡 **Vàng:** 1-2/5 (ít lượt)
- 🟢 **Xanh:** 3-5/5 (nhiều lượt)

### **Edit Mode:**
```
┌─────────────┐
│ Đổi TK      │
├─────────────┤
│ [2] ← input │ ← Admin có thể chỉnh
└─────────────┘
```

---

## 🔧 Backend API

### **PUT /api/admin-users/:id**

**Request Body:**
```json
{
  "name": "User Name",
  "email": "user@example.com", 
  "plan": "pro",
  "proExpiresAt": "2025-12-31",
  "monthlyReportLimit": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "monthlyReportLimit": 3,
    ...
  }
}
```

**Validation:**
- `monthlyReportLimit` phải là number
- Giá trị từ 0 đến 5
- Nếu không hợp lệ → Bỏ qua update

---

## 🎯 Use Cases

### **Case 1: Reset User Report Limit**

**Tình huống:** User đã dùng hết 5 lượt đổi TK trong tháng

**Giải pháp:**
1. Admin vào Admin Panel
2. Tìm user → Click "EDIT"
3. Cột "Đổi TK" → Nhập "5"
4. Click "SUBMIT"
5. User có thể đổi TK lại

---

### **Case 2: Giảm Report Limit**

**Tình huống:** User lạm dụng tính năng đổi TK

**Giải pháp:**
1. Admin vào Admin Panel
2. Tìm user → Click "EDIT"
3. Cột "Đổi TK" → Nhập "1" (chỉ còn 1 lượt)
4. Click "SUBMIT"
5. User chỉ còn 1 lượt đổi TK

---

### **Case 3: Kiểm Tra Report Limit**

**Tình huống:** User báo không thể đổi TK

**Giải pháp:**
1. Admin vào Admin Panel
2. Tìm user trong bảng
3. Xem cột "Đổi TK":
   - `0/5` → User đã hết lượt
   - `3/5` → User còn 3 lượt
4. Nếu cần → Reset về 5

---

## 📊 Database Schema

### **User Model:**
```javascript
{
  monthlyReportLimit: {
    type: Number,
    default: 5,
    min: 0,
    max: 5
  }
}
```

**Giá trị mặc định:** 5 (user mới có 5 lượt đổi TK)

---

## 🧪 Testing

### **Test Case 1: Display Correct Values**

**Setup:** User có `monthlyReportLimit = 0`

**Expected:** Hiển thị "0/5" (màu đỏ)

---

### **Test Case 2: Edit Functionality**

**Setup:** User có `monthlyReportLimit = 2`

**Action:**
1. Click "EDIT"
2. Thay đổi input thành "4"
3. Click "SUBMIT"

**Expected:** 
- Database: `monthlyReportLimit = 4`
- Display: "4/5" (màu xanh)

---

### **Test Case 3: Validation**

**Action:** Nhập "6" vào input field

**Expected:** Alert "❌ Số lần đổi TK phải từ 0 đến 5!"

---

## 🔍 Debugging

### **Frontend Console:**
```javascript
💾 Saving user row... { 
  name: "User", 
  email: "user@example.com", 
  monthlyReportLimit: 3 
}
```

### **Backend Console:**
```javascript
📊 Updated monthlyReportLimit for user@example.com: 3
✅ Admin updated user: user@example.com
```

---

## ⚠️ Lưu Ý

1. **Default Value:** User mới có `monthlyReportLimit = 5`
2. **Range:** Chỉ cho phép 0-5
3. **Persistence:** Giá trị được lưu vào database
4. **Real-time:** Table tự động refresh sau khi save
5. **Validation:** Frontend + Backend đều validate

---

## 🎉 Summary

### **Trước:**
- ❌ Hiển thị sai: `0/5` → `5/5`
- ❌ Không thể chỉnh sửa
- ❌ Admin không kiểm soát được

### **Sau:**
- ✅ Hiển thị đúng: `0/5` → `0/5`
- ✅ Admin có thể chỉnh sửa
- ✅ Full control over user limits
- ✅ Validation đầy đủ

---

**🎊 Tính năng đã sẵn sàng sử dụng!**

Version: 1.0  
Last Updated: 2025-10-13
