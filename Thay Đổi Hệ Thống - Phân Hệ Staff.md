# THAY ĐỔI HỆ THỐNG: TÍCH HỢP PHÂN HỆ STAFF, MEMBERSHIP & PHÂN CÔNG KHO

Tài liệu tóm tắt nhanh các thay đổi lớn về **Database**, **Backend logic (BE)** và **API Integration (FE)** liên quan đến luồng mời, quản lý, sa thải và **Phân công Nhân viên kho (Staff Warehouse Assignment)** để cả đội ngũ (BE & FE) nắm bắt nhanh trong 2 phút.

---

## 1. DÀNH CHO BACKEND DEVELOPER (VINH)

### 1.1. Thay đổi Database Schema
* **Bảng `users`:** Không chứa `tenant_id`. User chỉ đóng vai trò định danh duy nhất (Email là UNIQUE).
* **Bảng `tenant_members`:** Lưu liên kết Staff ↔ Tenant.
  * Bổ sung cột **`resigned_at`** (TIMESTAMP, NULLABLE): Ghi nhận thời điểm Staff chính thức nghỉ việc / sa thải khỏi Tenant.
  * Ràng buộc: Một Staff chỉ được thuộc về tối đa **1 Tenant** tại 1 thời điểm (`isActive = true`, `isDeleted = false`).
* **Bảng mới `staff_warehouse_assignments` (`Staff_Warehouse_Assignment`):**
  * Lưu vết phân công Staff làm việc tại từng Kho cụ thể theo mốc thời gian.
  * Các trường: `staff_id`, `tenant_id`, `warehouse_id`, `role` (`MANAGER`, `OPERATOR`, `INSPECTOR`), `custom_title` (String tùy chỉnh), `assigned_by`, `start_date`, `end_date`, `status` (`ACTIVE`, `REVOKED`, `EXPIRED`), `notes`.
* **Bảng `staff_invitations`:** Lưu token kích hoạt (UUID) gửi qua email.

### 1.2. Backend Logic Update
1. **Phân quyền Hợp đồng (`GET /api/contracts`)**:
   - Đã khóa bảo mật nghiêm ngặt `@PreAuthorize("hasAnyRole('OWNER', 'TENANT', 'ADMIN')")`. Staff không thể xem hợp đồng tài chính (nếu gọi nhận 403 Forbidden).
2. **API Lấy danh sách kho (`GET /api/tenant/warehouses/my-warehouses`)**:
   - Với **Tenant**: Trả về tất cả kho đang có hợp đồng thuê `ACTIVE`.
   - Với **Staff**: Tự động lọc đúng danh sách các kho mà Staff đó đang được phân công hoạt động (`ACTIVE`).
3. **Quy trình Sa thải / Nghỉ việc (`DELETE /api/tenant/staffs/{memberId}`)**:
   - Set `isDeleted = true`, `isActive = false`, `resignedAt = now()`.
   - Tự động thu hồi (REVOKE) tất cả phân công kho đang ACTIVE của Staff đó (`endDate = now()`, `status = REVOKED`).

---

## 2. DÀNH CHO FRONTEND DEVELOPER

### 2.1. Thay đổi luồng Đăng ký & Mời Nhân viên
1. Tenant gọi `POST /api/tenant/staffs/invite` với `{ email, fullName, phone }`.
2. Staff nhận email, mở link `/staff/accept?token=XYZ` trên FE.
3. FE gọi `GET /api/auth/staff/invite?token=XYZ` để preview thông tin lời mời.
4. Staff điền mật khẩu và submit `POST /api/auth/staff/accept` để hoàn tất tạo tài khoản.

### 2.2. Mới: Màn hình Phân Công Kho Cho Staff (Tenant Admin UI)
* **API Phân công Kho:** `POST /api/tenant/staffs/{staffUserId}/warehouses`
  ```json
  {
    "warehouseId": "UUID_KHO",
    "role": "MANAGER", // MANAGER | OPERATOR | INSPECTOR
    "customTitle": "Thủ kho Ca 1",
    "notes": "Phân công phụ trách ca ngày"
  }
  ```
* **API Xem danh sách phân công:** `GET /api/tenant/staffs/{staffUserId}/warehouses`
* **API Thu hồi phân công kho:** `DELETE /api/tenant/staffs/assignments/{assignmentId}`

### 2.3. Mới: Màn hình Vận hành & Lịch sử Công tác (Staff UI)
* **Lấy danh sách Kho chọn Dropdown:**
  - FE gọi `GET /api/tenant/warehouses/my-warehouses` đính kèm JWT Token. Backend tự động trả về danh sách các kho mà Staff đang được phân công làm việc.
* **Xem Lịch sử Sự nghiệp:**
  - Staff gọi `GET /api/staff/my-work-history` để xem lại toàn bộ quá trình công tác qua các Tenant & Kho bãi từ trước đến nay.

### 2.4. Lưu ý quan trọng cho FE khi Sa thải / Nghỉ việc
* Khi Tenant bấm "Xóa" Staff (`DELETE /api/tenant/staffs/{memberId}`), Backend chỉ xóa mềm và ghi ngày nghỉ việc `resignedAt`.
* Lịch sử các phiếu Nhập/Xuất kho cũ và Biên bản kiểm kê cũ do Staff này tạo **vẫn hiển thị bình thường** trên giao diện báo cáo/truy vết của Tenant (không bị rác UI hay lỗi null reference).
