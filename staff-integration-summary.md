# Tổng Hợp Tích Hợp: Phân Hệ Staff Management (Luồng 2 + Luồng 5)

> Tài liệu này dành cho AI/Developer đọc và tiếp tục công việc. Đây là bản tổng hợp toàn bộ những gì đã được thiết kế và triển khai cho phân hệ Staff trong hệ thống StockSpace.

---

## 1. Kiến Trúc Nghiệp Vụ (Membership Pattern)

### Sơ Đồ Cốt Lõi

```
User (Identity — email UNIQUE)
  │
  ├── Tenant (ROLE_TENANT): userId chính là tenantId của họ
  │
  └── Staff (ROLE_STAFF): liên kết qua bảng tenant_members
         tenant_members: { userId, tenantId, isActive, isDeleted, joinedAt }
```

### Điểm Quan Trọng
- **Bảng `users` KHÔNG còn cột `tenant_id`** — đã xóa bỏ hoàn toàn trong phiên bản mới.
- Liên kết Staff ↔ Tenant nằm ở bảng mới `tenant_members`.
- Khi Staff bị sa thải → `isDeleted = true` (soft delete), giữ lại lịch sử phiếu nhập xuất.
- JWT token của Staff chứa claim `tenantId` (là UUID của Tenant chủ quản), Backend tự cách ly dữ liệu theo đó.
- **FE không cần truyền tenantId dưới dạng query/path param** trong các API WMS.

---

## 2. Phân Quyền Tenant vs Staff

| Chức năng | Tenant | Staff | Ghi chú |
|---|:---:|:---:|---|
| Ví tiền / Nạp rút | ✅ | ❌ | Staff không có tài chính |
| Mua gói WMS | ✅ | ❌ | Chỉ Tenant quyết định |
| Quản lý nhân sự | ✅ | ❌ | Mời / xóa Staff |
| Xem sơ đồ Layout | ✅ | ✅ | Cả hai xem được |
| Chỉnh sửa Layout | ✅ | ❌ | Chỉ Tenant mới được sửa cấu trúc |
| SKU / Danh mục | ✅ | ✅ | Cả hai tạo/sửa được |
| Phiếu Nhập/Xuất | ✅ | ✅ | Staff thực hiện thực tế tại kho |
| Kiểm kê (Audit) | ✅ | ✅ | Staff đếm hàng và submit |

---

## 3. API Endpoints (Đã Tích Hợp FE)

### 3.1 Tenant — Staff Management (`/api/tenant/staffs`)
Auth yêu cầu: JWT Tenant (`ROLE_TENANT`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/tenant/staffs` | Danh sách nhân viên (paged, keyword) |
| POST | `/api/tenant/staffs/invite` | Gửi lời mời qua email |
| DELETE | `/api/tenant/staffs/{memberId}` | Sa thải nhân viên (soft delete) |

#### Request Body: POST `/api/tenant/staffs/invite`
```json
{ "email": "nhanvien@gmail.com", "fullName": "Nguyễn Văn A", "phone": "0987654321" }
```

#### Response: GET `/api/tenant/staffs`
Paginated list of `StaffMemberResponse`:
```json
{
  "memberId": "UUID",      // Dùng để xóa
  "userId": "UUID",        // Identity thực sự
  "email": "...",
  "fullName": "...",
  "phone": "...",
  "avatarUrl": "...",
  "isActive": true,        // false nếu bị khóa do gói downgrade
  "joinedAt": "2026-07-22T00:00:00"  // null nếu chưa kích hoạt
}
```

#### Lỗi thường gặp khi mời:
- `400 STAFF_LIMIT_EXCEEDED` — Vượt quota nhân viên của gói WMS
- `409 STAFF_INVITATION_DUPLICATE` — Email đã có lời mời PENDING
- `409 STAFF_ALREADY_MEMBER` — Email đã là nhân viên đang hoạt động

---

### 3.2 Staff Invitation (Public — không cần JWT)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/auth/staff/invite?token=XYZ` | Validate token, lấy thông tin lời mời |
| POST | `/api/auth/staff/accept` | Chấp nhận + đặt mật khẩu |

#### Response: GET `/api/auth/staff/invite?token=XYZ`
```json
{
  "success": true,
  "data": {
    "email": "nhanvien@gmail.com",
    "fullName": "Nguyễn Văn A",
    "tenantName": "Công ty Kho Vận XYZ",
    "tenantEmail": "tenant@gmail.com",
    "valid": true
  }
}
```

#### Request Body: POST `/api/auth/staff/accept`
```json
{ "token": "XYZ", "password": "Password123!", "confirmPassword": "Password123!" }
```
*Yêu cầu mật khẩu: 8-100 ký tự, ít nhất 1 chữ hoa, 1 chữ thường, 1 số.*

---

## 4. Files Đã Được Tạo / Sửa Trong FE

### Files Mới
| File | Mô tả |
|---|---|
| `src/services/staff/staffApi.js` | 5 hàm API: listStaffs, inviteStaff, removeStaff, validateInviteToken, acceptInvitation |
| `src/features/tenant/pages/TenantStaffManagementPage.jsx` | Trang Tenant quản lý nhân viên (bảng, modal mời, nút xóa) |
| `src/features/auth/pages/StaffAcceptInvitationPage.jsx` | Trang public kích hoạt tài khoản từ link email |

### Files Đã Sửa
| File | Thay đổi |
|---|---|
| `src/services/authApi.js` | Thêm `validateStaffInviteToken()` và `acceptStaffInvitation()` |
| `src/store/authSlice.js` | Thêm `tenantId` vào Redux state khi login và fetchCurrentUser |
| `src/App.jsx` | Thêm 2 routes: `/staff/accept` (public) và `/tenant/staff` (Tenant) |
| `src/components/SideBar.jsx` | Thêm menu "Nhân Viên" → `/tenant/staff` vào TENANT sidebar |

---

## 5. Luồng Người Dùng (User Flow)

### Luồng Tenant Mời Staff:
1. Tenant đăng nhập → Sidebar → "Nhân Viên" → Trang `/tenant/staff`
2. Bấm "Mời Nhân Viên" → Modal → Nhập email + họ tên + SĐT → Submit
3. BE gửi email với link `/staff/accept?token=UUID` (hết hạn sau 48h)
4. Trang hiển thị danh sách nhân viên cập nhật (cột `joinedAt` = null = "Chờ kích hoạt")

### Luồng Staff Kích Hoạt Tài Khoản:
1. Staff nhận email → Click link `/staff/accept?token=XYZ`
2. FE gọi `GET /api/auth/staff/invite?token=XYZ` → validate
3. Hiển thị form: tên + email (read-only) + tên Tenant + ô nhập mật khẩu
4. Submit → `POST /api/auth/staff/accept` → Redirect đến trang đăng nhập

### Sau Khi Staff Đăng Nhập:
- JWT chứa `tenantId` của Tenant chủ quản
- FE lưu `tenantId` vào Redux store + localStorage
- Mọi API WMS (inbound/outbound/inventory) tự động lọc theo tenantId trong JWT

---

## 6. Điểm Còn Lại / Cần Làm Thêm

- [ ] **Staff Pages** (`StaffDashboard`, `StaffTasksPage`, `StaffInventoryPage`): Hiện tại là placeholder. Cần nối API WMS tương tự InboundPage/OutboundPage nhưng dành cho ROLE_STAFF.
- [ ] **Quota display**: Nếu subscription API trả về `maxStaff`, hiển thị "X/Y nhân viên" trên trang quản lý.
- [ ] **Staff Inbound/Outbound**: Staff có quyền tạo và duyệt phiếu nhập/xuất — cần tạo trang tương ứng trong `/staff/` feature.
- [ ] **Staff Layout View**: Staff được xem sơ đồ Layout nhưng không được sửa. Route `/staff/layout` cần được thêm với quyền chỉ xem.

---

## 7. Ghi Chú Kỹ Thuật

- **Tenancy Isolation**: Hoàn toàn do BE xử lý qua JWT claim. FE chỉ cần gửi Bearer token đúng cách.
- **Soft Delete**: Khi xóa Staff, BE set `isDeleted = true`. Lịch sử phiếu của Staff vẫn hiển thị.
- **Quota enforcement**: Nếu Tenant downgrade gói, BE tự động khóa (`isActive = false`) các Staff gia nhập muộn nhất.
- **Tài khoản đã tồn tại**: Nếu Staff dùng email đã có tài khoản cũ (Tenant khác / Staff khác), mật khẩu cũ KHÔNG thay đổi. Việc đặt mật khẩu mới tại trang accept chỉ xác nhận liên kết membership.
