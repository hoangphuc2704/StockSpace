# Hướng Dẫn Tích Hợp FE: Luồng 1 - Mua Gói Dịch Vụ & Phân Quyền WMS

Tài liệu này hướng dẫn cách tích hợp các API liên quan đến mua gói dịch vụ WMS, xem trước chuyển đổi gói (Gia hạn/Nâng cấp/Hạ cấp) và cơ chế phân quyền quản lý kho bãi của **Tenant (Người thuê kho)**.

---

## 1. Phân Biệt Phí Đăng Bài (Owner) & Gói Dịch Vụ WMS (Tenant)

Hệ thống StockSpace hỗ trợ hai loại phí/gói dịch vụ chính:

### 1.1. Phí Đăng Bài Kho Bãi (Warehouse Posting Fee) — Dành Cho Owner
* **Mục đích:** Khấu trừ số dư ví của Owner cho mỗi lần tạo bài đăng kho mới (phí commission/đăng bài).
* **Cơ chế:** Quản lý tập trung trong Cấu hình hệ thống (`SystemConfig` key `warehouse_publish_package_id` hoặc `warehouse_publish_fee`). Owner không phải bấm chọn mua gói riêng trên FE.

### 1.2. Gói Thuê Bao Quản Trị Kho (WMS Subscription Package) — Dành Cho Tenant
* **Mục đích:** Kích hoạt các tính năng quản lý kho WMS dành riêng cho Tenant sau khi thuê kho.
* **Quyền lợi mở khóa:**
  - Khi **chưa mua gói**: Tenant chỉ xem thông tin kho bãi/bài đăng công khai. Mọi thao tác WMS đều bị chặn (`SUBSCRIPTION_REQUIRED`).
  - Khi **mua bất kỳ gói WMS nào**: Mở **FULL tất cả các tính năng vận hành WMS** (Quản lý SKU, danh mục, đơn vị tính UOM, layout kho, phiếu Nhập/Xuất kho Inbound/Outbound, Kiểm kê tồn kho, Mời & phân công Staff, AI Chatbot).
* **Khác biệt giữa các Gói:** Không phân lẻ tính năng nhỏ, mà **chỉ khác nhau ở Giới Hạn Quota & Thời Gian**:
  - `durationDays`: Thời hạn sử dụng (30 ngày, 90 ngày, 365 ngày...).
  - `maxStaff`: Giới hạn số lượng nhân viên kho (3 staff, 10 staff, 0 = không giới hạn).
  - `price`: Giá tiền gói (VNĐ).
  - `features`: Chuỗi JSON mô tả marketing tính năng cho FE render hiển thị so sánh.

---

## 2. Quy Tắc Chuyển Đổi Gói Dịch Vụ (Renewal, Upgrade & Downgrade Policy)

1. **Gia hạn (Renewal - Mua cùng gói cũ ID)**:
   - Hệ thống tự động **cộng dồn nối tiếp thời gian**: `endDate = oldEndDate + durationDays`. Quota giữ nguyên.
2. **Nâng cấp gói (Upgrade - Mua gói mới có giá/quota bằng hoặc cao hơn)**:
   - Có hiệu lực **TỨC THÌ (Immediate Upgrade)**.
   - Gói cũ chuyển sang trạng thái **`SUPERSEDED`** (`endDate = hôm nay`).
   - Gói mới kích hoạt với `startDate = hôm nay`, `endDate = hôm nay + durationDays`.
   - Lưu ảnh chụp (Snapshot) thông số gói mới tại thời điểm mua (`snapshotMaxStaff`, `snapshotPrice`, `snapshotFeatures`, `snapshotPackageName`).
3. **Hạ cấp gói (Downgrade Prohibition - Mua gói thấp hơn khi gói cũ còn hạn)**:
   - **Chặn hạ gói giữa chu kỳ**: Hệ thống trả về lỗi `400 Bad Request`: *"Không thể hạ xuống gói dịch vụ thấp hơn khi gói hiện tại vẫn đang còn hạn. Vui lòng hạ gói sau khi gói hiện tại kết thúc."*

---

## 3. Danh Sách Các Endpoints Liên Quan

### 3.1. Lấy tất cả các gói dịch vụ WMS có sẵn (Public Endpoint)
* **API:** `GET /api/packages`
* **Mô tả:** Trả về danh sách các gói dịch vụ đang hoạt động trong hệ thống để người dùng chọn mua.

### 3.2. Xem trước chuyển đổi gói (Yêu cầu Role `TENANT`)
* **API:** `GET /api/tenant/subscriptions/preview-change?packageId={UUID}`
* **Mô tả:** Gọi trước khi mở Modal xác nhận mua để FE hiển thị trước thông tin loại giao dịch (`NEW_PURCHASE`, `RENEWAL`, `UPGRADE`, `DOWNGRADE_BLOCKED`), giá tiền, thay đổi Staff quota và thông điệp giải thích.
* **Response Body Mẫu (JSON):**
```json
{
  "success": true,
  "message": "Xem trước chuyển đổi gói dịch vụ thành công",
  "data": {
    "currentPackageId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "currentPackageName": "Gói Basic",
    "currentMaxStaff": 3,
    "currentPrice": 300000.00,
    "newPackageId": "9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c",
    "newPackageName": "Gói Pro",
    "newMaxStaff": 10,
    "newPrice": 1000000.00,
    "transactionType": "UPGRADE",
    "canProceed": true,
    "message": "Nâng cấp từ gói Gói Basic lên gói Gói Pro. Gói mới có hiệu lực ngay lập tức."
  }
}
```

### 3.3. Mua gói dịch vụ WMS (Yêu cầu Role `TENANT`)
* **API:** `POST /api/tenant/subscriptions/purchase`
* **Mô tả:** Trừ tiền từ ví Tenant để kích hoạt gói dịch vụ (Mua mới / Gia hạn / Nâng cấp).
* **Request Body:**
```json
{
  "packageId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
}
```
* **Lỗi có thể trả về:**
  - `WALLET_INSUFFICIENT_BALANCE` (400): Ví Tenant không đủ tiền.
  - `400 Bad Request`: *"Không thể hạ xuống gói dịch vụ thấp hơn khi gói hiện tại vẫn đang còn hạn."*

### 3.4. Xem thông tin gói đang hoạt động của tôi (Yêu cầu Role `TENANT`)
* **API:** `GET /api/tenant/subscriptions/active`
* **Response Body (JSON):**
```json
{
  "success": true,
  "message": "Lấy gói dịch vụ đang hoạt động thành công",
  "data": {
    "id": "e98c91a0-ff92-411a-ab5d-c6a85817a022",
    "tenantId": "b0d75383-88eb-46c4-ab77-8101a01c249c",
    "servicePackage": {
      "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Gói Pro",
      "price": 1000000.00,
      "durationDays": 30,
      "maxStaff": 10
    },
    "startDate": "2026-08-10",
    "endDate": "2026-09-09",
    "status": "ACTIVE"
  }
}
```

---

## 4. Lưu Ý Quan Trọng Cho Frontend Khi Thiết Kế Giao Diện

1. **Kiểm tra quyền truy cập WMS (Guard Route):**
   - Trước khi cho phép Tenant truy cập vào các màn hình nâng cao của WMS (như sơ đồ layout, danh sách SKU, phiếu nhập xuất), FE gọi API `GET /api/tenant/subscriptions/active`.
   - Nếu nhận về lỗi `SUBSCRIPTION_NOT_FOUND`, hiển thị Banner/Modal chuyển hướng chọn gói dịch vụ.

2. **Xử lý mã lỗi `SUBSCRIPTION_REQUIRED`:**
   - Tất cả các API WMS của Tenant (`/api/tenant/products/**`, `/api/tenant/inventory/**`) đều kiểm tra thuê bao active.
   - Nếu gói của Tenant hết hạn trong lúc đang thao tác, Backend sẽ trả về lỗi HTTP 403 với JSON:
     ```json
     {
       "success": false,
       "message": "Yêu cầu phải đăng ký gói dịch vụ WMS để thực hiện thao tác này",
       "errorCode": "SUBSCRIPTION_REQUIRED"
     }
     ```
   - FE cần Interceptor toàn cục cho `SUBSCRIPTION_REQUIRED` để gợi ý gia hạn.
