# Hướng Dẫn Tích Hợp FE: Luồng 2 - Quản Lý & Vận Hành Nhân Viên Kho (Staff)

Tài liệu này giải thích cơ chế phân quyền, liên kết tài khoản giữa **Tenant (Người thuê kho)** và **Staff (Nhân viên kho)** sử dụng **Membership Pattern**, cùng giải pháp cách ly dữ liệu kho (Tenancy Isolation) trong hệ thống StockSpace.

---

## 1. Bản Chất Quan Hệ Giữa Tenant Và Staff Trong Hệ Thống

Để hỗ trợ doanh nghiệp thuê kho (Tenant) tự quản lý nhân viên mà không gây xung đột tài khoản (1 email có thể vừa là Tenant, vừa làm Staff ở các kho khác nhau), hệ thống sử dụng thiết kế **Membership Pattern** tách biệt thông tin đăng nhập với liên kết tổ chức:

* **Bảng `User` (Identity):** Chứa thông tin đăng nhập duy nhất (`email` là UNIQUE). Không chứa cột `tenant_id`.
* **Bảng `TenantMember` (Membership):** Lưu liên kết giữa Staff và Tenant. Một tài khoản Staff (`ROLE_STAFF`) tại một thời điểm chỉ có tối đa một membership hoạt động (`isActive = true`, `isDeleted = false`).

```
                    ┌─────────────────────────┐
                    │      Bảng: User         │ (Identity duy nhất)
                    │   - email (UNIQUE)      │
                    └───────────┬─────────────┘
                                │
                      user_id   │
                                ▼
                    ┌─────────────────────────┐
                    │   Bảng: TenantMember    │ (Quan hệ thành viên)
                    │   - tenant_id (FK User) │
                    │   - isActive / isDeleted│
                    └─────────────────────────┘
```

---

## 2. Cơ Chế Cách Ly Dữ Liệu Tự Động (Tenancy Isolation)

Để đảm bảo an toàn bảo mật, nhân viên kho (Staff) tuyệt đối không được phép nhìn thấy hàng hóa, danh mục hay phiếu nhập xuất của một Tenant khác.

### Giải thuật nhận diện Tenant chủ quản của Backend:
1. Khi đăng nhập thành công, Backend tự động truy vấn bảng `tenant_members` để tìm Tenant chủ quản của User (nếu họ là Staff).
2. Backend nhúng trực tiếp `tenantId` vào JWT Token dưới dạng claim `tenantId` (Đối với Tenant, `tenantId` chính là `userId` của họ).
3. Trong suốt phiên làm việc, Backend đọc `tenantId` trực tiếp từ JWT claim này của mỗi Request mà không cần thực hiện thêm câu truy vấn DB nào.

**$\Rightarrow$ Ý nghĩa với FE:** 
Frontend chỉ cần lưu JWT Token và gửi kèm trong header `Authorization: Bearer <token>` của mọi Request. Backend sẽ tự động trả về đúng tệp dữ liệu đã được lọc theo Tenant mà người dùng đang làm việc. Không cần truyền tham số `tenantId` lên các URL API WMS.

---

## 3. Bản Đồ Phân Quyền & Chức Năng Giữa Tenant và Staff

FE cần căn cứ vào bảng phân quyền dưới đây để hiển thị/ẩn các chức năng tương ứng trên thanh điều hướng (Sidebar) và các nút bấm hành động (Action Buttons):

| Phân hệ / Chức năng | Tenant (Role: `ROLE_TENANT`) | Staff (Role: `ROLE_STAFF`) | Ghi chú nghiệp vụ |
| :--- | :---: | :---: | :--- |
| **Giao dịch tài chính & Ví tiền** | **Có (Full)** | Không | Nạp tiền, rút tiền, xem lịch sử ví chỉ dành cho Tenant. |
| **Đăng ký thuê bao WMS** | **Có (Full)** | Không | Staff không thể mua gói dịch vụ WMS. |
| **Quản trị nhân sự (Staff CRUD)** | **Có (Full)** | Không | Tenant mời/xóa nhân viên kho thông qua email (Xem Luồng 5). |
| **Xem Sơ đồ Layout Kho** | Có (Xem) | Có (Xem) | Cả hai cùng xem được Zone/Rack/Bin của kho đang thuê. |
| **Chỉnh sửa cấu trúc Layout** | **Có (Sửa)** | Không | Chỉ Tenant mới được quyền thay đổi sơ đồ vị trí lưu trữ (Bulk Layout Save). |
| **Quản lý Danh mục & SKU** | Có (Full) | Có (Full) | Staff và Tenant đều có thể tạo SKU mới, khai báo thông số hàng hóa. |
| **Quản lý Phiếu Nhập/Xuất** | Có (Full) | Có (Full) | Staff thực hiện tạo và duyệt phiếu thực tế khi xếp/dỡ hàng. |
| **Yêu cầu & Duyệt Kiểm kê** | Có (Full) | Có (Full) | Staff tiến hành đếm hàng thực tế tại chỗ và submit kết quả. |

---

## 4. Hướng Dẫn Thiết Kế Giao Diện & Điều Hướng (FE UI/UX)

### 4.1. Màn hình quản trị (Dành riêng cho Tenant)
* **Sidebar Menu:** Thêm các tab: *Quản lý ví tiền*, *Hợp đồng thuê kho*, *Gia hạn gói dịch vụ WMS*, *Quản lý nhân viên*.
* **Màn hình quản lý nhân viên:**
  - Danh sách nhân viên kho hiện tại hiển thị đầy đủ thông tin: Email, Họ tên, SĐT, Ngày gia nhập, Trạng thái (Hoạt động/Bị khóa).
  - Nút **"Mời nhân viên"** mở modal nhập Email, Họ tên, SĐT (Hệ thống sẽ gửi email xác nhận chứa token, thay vì Tenant tự đặt mật khẩu).
  - Nút **"Xóa"** kế bên từng Staff để đuổi việc (Backend thực hiện Soft-delete để bảo toàn lịch sử phiếu).
  - *Lưu ý về Quota:* Số lượng nhân viên tối đa bị giới hạn bởi thuộc tính `maxStaff` của Gói dịch vụ WMS hiện tại. Khi hạ gói dịch vụ, Backend sẽ tự động khóa các nhân viên tham gia muộn nhất để tránh vượt quota.

### 4.2. Màn hình vận hành (Dành cho Staff)
* **Sidebar Menu:** Chỉ tập trung vào vận hành: *Phiếu nhập/xuất kho*, *Kiểm tra tồn kho*, *Phiếu kiểm kê hàng ngày*, *Xem sơ đồ vị trữ*.
* Giao diện vận hành cho Staff cần được tối ưu tốt trên thiết bị di động (Responsive) giúp nhân viên dễ mang theo khi làm việc trực tiếp tại các kệ kho.
