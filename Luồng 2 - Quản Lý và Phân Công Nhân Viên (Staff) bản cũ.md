# Hướng Dẫn Tích Hợp FE: Luồng 2 - Quản Lý & Vận Hành Nhân Viên Kho (Staff)

Tài liệu này giải thích cơ chế phân quyền, liên kết tài khoản giữa **Tenant (Người thuê kho)** và **Staff (Nhân viên kho)**, cùng giải pháp cách ly dữ liệu kho (Tenancy Isolation) trong hệ thống StockSpace.

---

## 1. Bản Chất Quan Hệ Giữa Tenant Và Staff Trong Hệ Thống

Nhằm giúp các doanh nghiệp thuê kho (Tenant) tự quản trị nhân sự vận hành thực tế tại kho bãi, hệ thống thiết kế cơ chế liên kết tài khoản Cha-Con trong bảng `users`:

* **Tài khoản Tenant (Cha):** Có role `ROLE_TENANT`. Là người sở hữu hợp đồng thuê kho và gói dịch vụ WMS. Trường `tenant_id` của tài khoản này là `null`.
* **Tài khoản Staff (Con):** Có role `ROLE_STAFF`. Là nhân viên kho được thuê/phân công bởi Tenant để thực hiện các thao tác vận hành hàng ngày. Trường `tenant_id` trong DB của Staff sẽ **trỏ về ID của Tenant cha**.

```
    ┌─────────────────────────────────┐
    │     User (Role: ROLE_TENANT)    │  <--- Tenant Cha (Ví dụ: id = 123)
    └────────────────┬────────────────┘
                     │
            Liên kết tenant_id
                     │
    ┌────────────────▼────────────────┐
    │     User (Role: ROLE_STAFF)     │  <--- Staff Con (Ví dụ: tenant_id = 123)
    └─────────────────────────────────┘
```

---

## 2. Cơ Chế Cách Ly Dữ Liệu Tự Động (Tenancy Isolation)

Để đảm bảo an toàn bảo mật, nhân viên kho (Staff) tuyệt đối không được phép nhìn thấy hàng hóa, danh mục hay phiếu nhập xuất của một Tenant khác. Backend xử lý việc này hoàn toàn tự động ở tầng Service:

### Giải thuật nhận diện Tenant chủ quản của Backend:
Khi nhận được bất kỳ Request nào gọi tới phân hệ WMS, Backend sẽ xác định ID của Tenant dựa trên thông tin User đang đăng nhập:
```java
UUID tenantId = currentUser.getTenant() != null 
    ? currentUser.getTenant().getId() 
    : currentUser.getId();
```
* **Nếu Tenant đăng nhập:** `currentUser.getTenant()` là `null` $\rightarrow$ Lấy trực tiếp `currentUser.getId()`.
* **Nếu Staff đăng nhập:** `currentUser.getTenant()` trỏ về Tenant cha $\rightarrow$ Lấy ID của Tenant cha làm `tenantId`.

**$\Rightarrow$ Ý nghĩa với FE:** 
Frontend chỉ cần gọi API một cách bình thường với JWT Token của người dùng hiện tại (bất kể là Tenant hay Staff). Backend sẽ tự động trả về đúng tệp dữ liệu đã được lọc theo Tenant chủ quản của họ. Không cần truyền tham số `tenantId` lên các URL API WMS.

---

## 3. Bản Đồ Phân Quyền & Chức Năng Giữa Tenant và Staff

FE cần căn cứ vào bảng phân quyền dưới đây để hiển thị/ẩn các chức năng tương ứng trên thanh điều hướng (Sidebar) và các nút bấm hành động (Action Buttons):

| Phân hệ / Chức năng | Tenant (Role: `ROLE_TENANT`) | Staff (Role: `ROLE_STAFF`) | Ghi chú nghiệp vụ |
| :--- | :---: | :---: | :--- |
| **Giao dịch tài chính & Ví tiền** | **Có (Full)** | Không | Nạp tiền, rút tiền, xem lịch sử ví chỉ dành cho Tenant. |
| **Đăng ký thuê bao WMS** | **Có (Full)** | Không | Staff không thể mua gói dịch vụ WMS. |
| **Quản trị nhân sự (Staff CRUD)** | **Có (Full)** | Không | Tenant tạo/xóa tài khoản nhân viên kho cho doanh nghiệp mình. |
| **Xem Sơ đồ Layout Kho** | Có (Xem) | Có (Xem) | Cả hai cùng xem được Zone/Rack/Bin của kho đang thuê. |
| **Chỉnh sửa cấu trúc Layout** | **Có (Sửa)** | Không | Chỉ Tenant mới được quyền thay đổi sơ đồ vị trí lưu trữ (Bulk Layout Save). |
| **Quản lý Danh mục & SKU** | Có (Full) | Có (Full) | Staff và Tenant đều có thể tạo SKU mới, khai báo thông số hàng hóa. |
| **Quản lý Phiếu Nhập/Xuất** | Có (Full) | Có (Full) | Staff thực hiện tạo và duyệt phiếu thực tế khi xếp/dỡ hàng. |
| **Yêu cầu & Duyệt Kiểm kê** | Có (Full) | Có (Full) | Staff tiến hành đếm hàng thực tế tại chỗ và submit kết quả. |

---

## 4. Hướng Dẫn Thiết Kế Giao Diện & Điều Hướng (FE UI/UX)

Để tối ưu hóa trải nghiệm người dùng, FE nên xây dựng cấu trúc giao diện phân tách rõ rệt:

### 4.1. Màn hình quản trị (Dành riêng cho Tenant)
* **Sidebar Menu:** Thêm các tab: *Quản lý ví tiền*, *Hợp đồng thuê kho*, *Gia hạn gói dịch vụ WMS*, *Quản lý nhân viên*.
* **Màn hình quản lý nhân viên:**
  - Danh sách nhân viên hiện tại của doanh nghiệp.
  - Form tạo tài khoản nhân viên mới (Email, Họ tên, SĐT, Mật khẩu mặc định).
  - *Lưu ý:* Giới hạn số lượng tài khoản nhân viên tạo được phụ thuộc vào thuộc tính `max_staff` trong trường JSON `features` của gói dịch vụ WMS đang kích hoạt.

### 4.2. Màn hình vận hành (Dành cho Staff)
* **Sidebar Menu:** Chỉ tập trung vào vận hành: *Phiếu nhập/xuất kho*, *Kiểm tra tồn kho*, *Phiếu kiểm kê hàng ngày*, *Xem sơ đồ vị trí*.
* **Tối ưu thiết bị di động:** Giao diện Staff nên được thiết kế responsive tốt (hoặc ứng dụng di động) vì nhân viên kho thường cầm điện thoại/máy tính bảng chạy quanh kho để:
  - Nhìn sơ đồ layout để biết mặt hàng cần xuất đang nằm ở Zone nào, Rack nào, Bin nào.
  - Quét mã SKU hoặc kiểm đếm thực tế số lượng hàng nhập rồi bấm "Phê duyệt" trực tiếp tại chỗ.