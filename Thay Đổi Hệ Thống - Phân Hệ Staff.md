# THAY ĐỔI HỆ THỐNG: TÍCH HỢP PHÂN HỆ STAFF & MEMBERSHIP

Tài liệu tóm tắt nhanh các thay đổi lớn về **Database**, **Backend logic (BE)** và **API Integration (FE)** liên quan đến luồng mời và quản lý Nhân viên kho (Staff) để cả đội ngũ (BE & FE) nắm bắt nhanh trong 2 phút.

---

## 1. DÀNH CHO VINH (BACKEND DEVELOPER)

### 1.1. Thay đổi Database Schema
* **Bảng `users`:** **Đã xóa bỏ** cột `tenant_id` tự liên kết. Một User chỉ đóng vai trò lưu trữ thông tin Identity duy nhất (Email là UNIQUE).
* **Bảng mới `tenant_members`:** Lưu liên kết Staff ↔ Tenant. 
  * Ràng buộc: Một Staff chỉ được thuộc về tối đa **1 Tenant** tại 1 thời điểm (`isActive = true`, `isDeleted = false`).
  * Khi xóa Staff, chỉ cần set `isDeleted = true` (không xóa cứng User để giữ toàn vẹn lịch sử phiếu xuất nhập kho cũ).
* **Bảng mới `staff_invitations`:** Lưu token kích hoạt (UUID) gửi qua email, hết hạn sau 48 giờ.

### 1.2. Cách lấy `tenantId` trong Code mới
Vì trường `tenant_id` trong `User` đã bị xóa, tuyệt đối **không dùng** `user.getTenant()` nữa. Hãy thay bằng:

1. **Trong Controller (HTTP Request thread):**
   ```java
   // Đọc trực tiếp tenantId đã giải mã sẵn từ JWT claim (Rất nhanh, không gọi DB)
   UUID tenantId = TenantContextUtil.getCurrentTenantId();
   ```
2. **Trong Service / Scheduler / Async Task / Unit Test (Không có Request context):**
   ```java
   // Truy vấn qua repository để lấy Tenant ID của User
   UUID tenantId = tenantMemberRepository.findByUserIdAndIsActiveTrueAndIsDeletedFalse(userId)
           .map(member -> member.getTenant().getId())
           .orElse(userId); // Nếu không phải staff, userId chính là tenantId của họ
   ```

---

##  2. DÀNH CHO FRONTEND DEVELOPER

### 2.1. Thay đổi luồng đăng ký Nhân viên (Staff Creation)
* **Trước đây:** Tenant điền email, mật khẩu để tạo trực tiếp Staff.
* **Hiện tại (Luồng bảo mật & chuẩn UX):**
  1. Tenant gọi `POST /api/tenant/staffs/invite` với `{ email, fullName, phone }` $\rightarrow$ Hệ thống tự lưu trạng thái PENDING và gửi email chứa Token kích hoạt.
  2. Staff nhận email, click link dẫn tới trang: `/staff/accept?token=XYZ` trên FE.
  3. FE gọi `GET /api/auth/staff/invite?token=XYZ` để validate token và nhận về: Email, Họ tên, Tên Tenant mời $\rightarrow$ Hiển thị form thiết lập mật khẩu (Email đặt read-only).
  4. Staff nhập mật khẩu và gửi `POST /api/auth/staff/accept` với `{ token, password, confirmPassword }` để kích hoạt tài khoản.

### 2.2. Lấy Tenant Context khi Vận hành WMS
* Khi gọi API đăng nhập thành công (`POST /api/auth/login`) hoặc API thông tin cá nhân (`GET /api/auth/me`), Backend sẽ trả về trường **`tenantId`** trực tiếp trong JSON data:
  ```json
  {
    "success": true,
    "data": {
      "userId": "...",
      "email": "...",
      "role": "ROLE_STAFF",
      "tenantId": "UUID_CỦA_TENANT_CHỦ_QUẢN"
    }
  }
  ```
* FE chỉ cần đính kèm JWT vào header `Authorization: Bearer <token>`, Backend tự phân tách và cách ly dữ liệu kho theo Tenant chủ quản. **FE không cần truyền `tenantId` dưới dạng query/path param khi thao tác các API WMS.**
