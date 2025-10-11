# 🔄 Hướng dẫn UPDATE WEBSITE

## Cách 1: Update từ máy tính (KHUYẾN NGHỊ)

### Bước 1: Sửa code trên máy
- Mở file bất kỳ trong thư mục `NetflixSharingProject`
- Sửa code như bình thường
- Save file

### Bước 2: Push lên GitHub
```bash
# 1. Vào thư mục project
cd NetflixSharingProject

# 2. Kiểm tra file đã thay đổi
git status

# 3. Thêm tất cả file đã thay đổi
git add .

# 4. Commit với message mô tả
git commit -m "Update: mô tả thay đổi của bạn"

# 5. Push lên GitHub
git push origin main
```

### Bước 3: Đợi GitHub Pages deploy
- GitHub tự động deploy (1-2 phút)
- Kiểm tra tại: https://github.com/DVQBao/4K-sharing/actions
- Website tự động update tại: https://dvqbao.github.io/4K-sharing/

---

## Cách 2: Sửa trực tiếp trên GitHub

### Ưu điểm:
- ✅ Sửa từ bất kỳ máy tính nào có internet
- ✅ Không cần Git
- ✅ Người khác có thể sửa (nếu bạn cho quyền)

### Nhược điểm:
- ❌ Chỉ sửa được 1 file tại 1 thời điểm
- ❌ Không có editor tốt như VSCode

### Các bước:
1. Vào: https://github.com/DVQBao/4K-sharing
2. Click vào file muốn sửa (ví dụ: `index.html`)
3. Click nút "Edit" (icon bút chì ✏️)
4. Sửa code
5. Scroll xuống, điền commit message
6. Click "Commit changes"
7. GitHub Pages tự động deploy

---

## 👥 CHO NGƯỜI KHÁC CHỈNH SỬA

### Option 1: Add Collaborator (Quyền FULL)
1. Vào: https://github.com/DVQBao/4K-sharing/settings/access
2. Click "Add people"
3. Nhập username/email GitHub của họ
4. Chọn quyền: "Write" (có thể push code)
5. Họ có thể:
   - Clone repo về máy
   - Sửa code trên máy
   - Push lên GitHub

### Option 2: Pull Request (An toàn hơn)
1. Người khác "Fork" repo của bạn
2. Clone fork về máy của họ
3. Sửa code
4. Tạo Pull Request
5. **BẠN** review và merge nếu đồng ý
6. Code của họ được merge vào repo chính

---

## 📋 TÓM TẮT

| Tình huống | Giải pháp |
|-----------|-----------|
| Bạn sửa trên máy của bạn | Push lên GitHub → Auto deploy |
| Bạn sửa từ máy khác | Sửa trực tiếp trên GitHub |
| Người khác muốn sửa | Add Collaborator hoặc Pull Request |
| Web tự động update? | ✅ CÓ - sau khi push/commit lên GitHub |

---

## ⚡ TIPS

### Kiểm tra website đã update chưa:
1. Vào: https://github.com/DVQBao/4K-sharing/actions
2. Đợi workflow "pages build and deployment" xanh ✅
3. Hard refresh website: `Ctrl + Shift + R` (xóa cache)

### Nếu website không update:
1. Clear cache: `Ctrl + Shift + Delete`
2. Đợi thêm 2-3 phút
3. Kiểm tra Actions có lỗi không

---

## 🚀 VÍ DỤ THỰC TÊ

### Sửa giá gói Premium từ 200k → 150k:

```bash
# 1. Mở file index.html
# 2. Tìm dòng: "Chỉ 200.000đ/tháng"
# 3. Sửa thành: "Chỉ 150.000đ/tháng"
# 4. Save file

# 5. Mở terminal:
cd NetflixSharingProject
git add index.html
git commit -m "Update: Giảm giá Premium từ 200k xuống 150k"
git push origin main

# 6. Đợi 1-2 phút
# 7. Truy cập: https://dvqbao.github.io/4K-sharing/
# 8. Hard refresh: Ctrl + Shift + R
# 9. Giá đã thay đổi! ✅
```

