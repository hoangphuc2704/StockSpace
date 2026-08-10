# Hướng Dẫn Tích Hợp FE: Luồng 2 - Quản Lý & Vận Hành Nhân Viên Kho (Staff)

Tài liệu này giải thích cơ chế phân quyền, liên kết tài khoản giữa **Tenant (Người thuê kho)** và **Staff (Nhân viên kho)** sử dụng **Membership Pattern**, cùng giải pháp quản lý phân công kho theo mốc thời gian, vai trò WMS (`WarehouseRole`) và cách ly dữ liệu kho (Tenancy & Warehouse Assignment Isolation) trong hệ thống StockSpace.

---

## 1. Bản Chất Quan Hệ Giữa Tenant Và Staff Trong Hệ Thống

Đảm bảo hỗ trợ doanh nghiệp thuê kho (Tenant) tự quản lý nhân viên mà không gây xung đột tài khoản (1 email có thể vừa làm Staff ở các Tenant khác nhau theo từng thời kỳ), hệ thống sử dụng thiết kế **Membership Pattern**:

* **Bảng `User` (Identity):** Chứa thông tin đăng nhập duy nhất (`email` là UNIQUE). Không chứa cột `tenant_id`.
* **Bảng `TenantMember` (Membership):** Lưu liên kết giữa Staff và Tenant. Một tài khoản Staff (`ROLE_STAFF`) tại một thời điểm chỉ có tối đa một membership hoạt động (`isActive = true`, `isDeleted = false`).
* **Bảng `StaffWarehouseAssignment` (Assignment):** Quản lý chi tiết việc phân công Staff vào **1 hoặc nhiều Kho cụ thể** đang thuê, ghi nhận vai trò WMS (`MANAGER`, `OPERATOR`, `INSPECTOR`), chức danh hiển thị tùy chỉnh (`customTitle`), ngày bắt đầu/kết thúc và trạng thái (`ACTIVE`, `REVOKED`, `EXPIRED`).

```
                    ┌─────────────────────────┐
                    │      Bảng: User         │ (Identity duy nhất)
                    │   - email (UNIQUE)      │
                    └───────────┬─────────────┘
                                │
                      user_id   │
                                ▼
                    ┌─────────────────────────┐
                    │   Bảng: TenantMember    │ (Quan hệ thành viên công ty)
                    │   - tenant_id (FK User) │
                    │   - joined_at / resigned_at
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │StaffWarehouseAssignment │ (Phân công chi tiết từng kho)
                    │ - warehouse_id (FK)     │
                    │ - role / custom_title   │
                    │ - start_date / end_date │
                    └─────────────────────────┘
```

---

## 2. Cơ Chế Phân Công Kho & Cách Ly Dữ Liệu Tự Động (Tenancy & Warehouse Isolation)

Để đảm bảo an toàn bảo mật và phân vùng trách nhiệm:
1. Staff **chỉ được nhìn thấy và thao tác trên đúng các kho mà Tenant đã phân công (`ACTIVE`)**.
2. **Giải thuật của Backend:**
   - Khi `STAFF` đăng nhập, JWT mang thông tin `tenantId` chủ quản.
   - Khi gọi API lấy danh sách kho đang thuê (`GET /api/tenant/warehouses/my-warehouses`), Backend tự động đối soát bảng `staff_warehouse_assignments`.
   - Nếu Staff được phân công kho cụ thể $\rightarrow$ Backend chỉ trả về danh sách các kho được gán.
   - Nếu Staff chưa được gán kho riêng $\rightarrow$ Backend trả về danh sách các kho đang thuê của Tenant làm fallback.

---

## 3. Bản Đồ Phân Quyền & Chức Năng Giữa Tenant và Staff

FE cần căn cứ vào bảng phân quyền dưới đây để hiển thị/ẩn các chức năng tương ứng trên thanh điều hướng (Sidebar) và các nút bấm hành động (Action Buttons):

| Phân hệ / Chức năng | Tenant (Role: `ROLE_TENANT`) | Staff (Role: `ROLE_STAFF`) | Ghi chú nghiệp vụ |
| :--- | :---: | :---: | :--- |
| **Giao dịch tài chính & Ví tiền** | **Có (Full)** | **Không (403 Forbidden)** | Nạp tiền, rút tiền, xem hợp đồng tài chính chỉ dành cho Tenant & Owner. |
| **Đăng ký thuê bao WMS** | **Có (Full)** | Không | Staff không thể mua gói dịch vụ WMS. |
| **Quản trị nhân sự & Mời Staff** | **Có (Full)** | Không | Tenant mời/xóa/sa thải nhân viên kho (Xem Luồng 5). |
| **Phân công kho cho Staff** | **Có (Full)** | Không | Tenant gán Staff vào Kho X với role `MANAGER` / `OPERATOR` / `INSPECTOR` & `customTitle`. |
| **Xem Sơ đồ Layout Kho** | Có (Xem) | Có (Xem kho được phân công) | Cả hai cùng xem được Zone/Rack/Bin của kho được gán. |
| **Chỉnh sửa cấu trúc Layout** | **Có (Sửa)** | Không | Chỉ Tenant mới được quyền thay đổi sơ đồ vị trí lưu trữ (Bulk Layout Save). |
| **Quản lý Danh mục & SKU** | Có (Full) | Có (Full) | Staff và Tenant đều có thể tạo SKU mới, khai báo thông số hàng hóa. |
| **Quản lý Phiếu Nhập/Xuất** | Có (Full) | Có (Kho được phân công) | Staff thực hiện tạo và duyệt phiếu thực tế tại kho được gán. |
| **Yêu cầu & Duyệt Kiểm kê** | Có (Full) | Có (Kho được phân công) | Staff tiến hành đếm hàng thực tế tại chỗ và submit kết quả. |
| **Tra cứu Lịch sử Sự nghiệp** | Xem của Staff mình | **Tự xem lịch sử bản thân** | Staff xem lại quá trình công tác qua các thời kỳ tại `/api/staff/my-work-history`. |

---

## 4. Hướng Dẫn Thiết Kế Giao Diện & Điều Hướng (FE UI/UX)

### 4.1. Màn hình quản trị (Dành riêng cho Tenant)
* **Sidebar Menu:** *Quản lý ví tiền*, *Hợp đồng thuê kho*, *Gói dịch vụ WMS*, *Quản lý nhân viên*.
* **Màn hình quản lý nhân viên:**
  - Danh sách nhân viên kho hiển thị: Email, Họ tên, SĐT, Ngày gia nhập, Trạng thái (Hoạt động/Đã nghỉ việc).
  - Nút **"Mời nhân viên"**: Mở modal gửi email lời mời kích hoạt qua Token.
  - Nút **"Phân công kho"**: Mở modal chọn Kho, chọn vai trò WMS (`MANAGER` / `OPERATOR` / `INSPECTOR`), gõ chức danh hiển thị tùy chỉnh (vd: *"Thủ kho Ca 1"*), ghi chú.
  - Nút **"Thu hồi phân công"**: Hủy quyền làm việc của Staff tại kho cụ thể (chuyển trạng thái `REVOKED`, cập nhật `endDate = now()`).
  - Nút **"Xóa / Sa thải"**: Đánh dấu Staff nghỉ việc (`isDeleted = true`, `isActive = false`, `resignedAt = now()`), **tự động thu hồi toàn bộ phân công kho active**. Dữ liệu phiếu nhập/xuất kho cũ của Staff được **giữ nguyên 100%** cho công tác audit.

### 4.2. Màn hình vận hành & Cá nhân (Dành cho Staff)
* **Dropdown chọn Kho (Header/Sidebar):**
  - FE gọi `GET /api/tenant/warehouses/my-warehouses` đính kèm JWT Token. Backend tự động trả về danh sách các kho mà Staff đang được phân công hoạt động.
* **Màn hình "Lịch sử công tác sự nghiệp" (`/staff/career-history`):**
  - Staff xem lại lịch sử các công ty (Tenant) từng làm việc (Joined Date $\rightarrow$ Resigned Date) và danh sách các kho đã từng phụ trách kèm vai trò/chức danh qua các thời kỳ.

---

## 5. Danh Sách APIs Chi Tiết Phân Hệ Staff & Warehouse Assignment

### 5.1. APIs Dành cho Tenant Quản Lý Staff & Phân Công Kho
* **`GET /api/tenant/staffs`**: Lấy danh sách nhân viên kho của tổ chức (hỗ trợ phân trang, tìm kiếm keyword).
* **`POST /api/tenant/staffs/invite`**: Gửi email mời nhân viên mới (`{ email, fullName, phone }`).
* **`DELETE /api/tenant/staffs/{memberId}`**: Xóa/Sa thải nhân viên khỏi tổ chức (gán `resignedAt`, tự động thu hồi phân công kho).
* **`POST /api/tenant/staffs/{staffUserId}/warehouses`**: Phân công Staff làm việc tại Kho:
  ```json
  {
    "warehouseId": "UUID_KHO",
    "role": "MANAGER", // MANAGER | OPERATOR | INSPECTOR
    "customTitle": "Thủ kho Ca 1",
    "notes": "Phân công phụ trách ca ngày"
  }
  ```
* **`GET /api/tenant/staffs/{staffUserId}/warehouses`**: Lấy lịch sử phân công kho của Staff trong tổ chức.
* **`DELETE /api/tenant/staffs/assignments/{assignmentId}`**: Thu hồi phân công kho của Staff.

### 5.2. APIs Dành cho Staff Vận Hành & Cá Nhân
* **`GET /api/tenant/warehouses/my-warehouses`**: Lấy danh sách các kho đang thuê/được phân công active của Staff.
* **`GET /api/staff/my-work-history`**: Staff tự tra cứu toàn bộ lịch sử công tác sự nghiệp của bản thân.
