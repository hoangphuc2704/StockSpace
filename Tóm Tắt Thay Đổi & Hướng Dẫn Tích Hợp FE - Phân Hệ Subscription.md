# TÓM TẮT THAY ĐỔI & HƯỚNG DẪN TÍCH HỢP FE — PHÂN HỆ SUBSCRIPTION & THUÊ BAO WMS

Tài liệu này tóm tắt chi tiết toàn bộ **các thay đổi mới nhất về Backend, Database, APIs, Quy tắc Chuyển đổi gói và Báo cáo Tác động Liên-luồng (Cross-Flow Impacts)** thuộc phân hệ **Gói Dịch Vụ & Thuê Bao WMS (Subscription)** dành cho đội ngũ Frontend.

---

## 📌 1. TỔNG QUAN CÁC THAY ĐỔI VỀ PHÂN HỆ SUBSCRIPTION

### 1.1. Phạm Vi Thuê Bao WMS (Tenant Only)
- **Gói Subscription WMS chỉ dành riêng cho Tenant**: Phục vụ kích hoạt các tính năng quản lý kho bãi sau khi thuê kho.
- **Phí đăng bài của Owner dời sang `SystemConfig`**: Khi Owner tạo bài đăng kho (`POST /api/owner/warehouses`), Backend tự động khấu trừ từ Ví tiền Owner theo cấu hình `warehouse_publish_fee` (50.000 VNĐ). FE không cần dựng màn hình chọn gói riêng cho Owner.

### 1.2. Cơ Chế Phân Quyền & Giới Hạn Gói Dịch Vụ
- **Tenant chưa mua gói**: Chỉ xem được danh sách kho bãi đang thuê (`GET /api/tenant/warehouses/my-warehouses`) và Hợp đồng (`GET /api/contracts`). Mọi thao tác WMS hậu thuê (Nhập/Xuất kho, SKU, Kiểm kê, Mời & Phân công Staff) đều bị chặn (`SUBSCRIPTION_REQUIRED`).
- **Tenant mua bất kỳ gói WMS nào**: **Mở FULL tất cả tính năng vận hành WMS**.
- **Sự khác biệt giữa các gói**: Không chia nhỏ lẻ tính năng, mà **chỉ khác nhau ở Giới Hạn Quota & Thời Gian**:
  - `durationDays`: Thời hạn sử dụng (30 ngày, 90 ngày, 365 ngày...).
  - `maxStaff`: Giới hạn số lượng nhân viên kho (3 staff, 10 staff, 0 = không giới hạn).
  - `price`: Giá tiền gói (VNĐ).
  - `features`: Chuỗi JSON Text (vd: `["Quản lý Nhập Xuất Tồn", "Báo cáo Kiểm kê", "AI Chatbot Trợ lý Kho"]`) để FE render hiển thị so sánh trên Card Bảng giá.

### 1.3. Ảnh Chụp Thông Số Gói (Snapshot Pattern)
- Đăng ký `Subscription` lưu snapshot thông số tại thời điểm mua: `snapshotMaxStaff`, `snapshotPrice`, `snapshotFeatures`, `snapshotPackageName`.
- **Lợi ích**: Khi Admin điều chỉnh giá hay quota của `ServicePackage` sau này, **người đã mua trước đó vẫn giữ nguyên 100% quyền lợi cũ** cho tới khi hết hạn.

### 1.4. Quy Tắc Chuyển Đổi Gói Dịch Vụ (Renewal, Upgrade & Downgrade)
1. **Gia hạn (Renewal - Mua cùng gói cũ ID)**: Cộng dồn nối tiếp thời hạn (`endDate = oldEndDate + durationDays`).
2. **Nâng cấp gói (Upgrade - Mua gói xịn hơn/bằng)**: Kích hoạt TỨC THÌ gói mới, ngắt gói cũ thành **`SUPERSEDED`** (`endDate = hôm nay`), chụp ảnh snapshot thông số gói mới.
3. **Chặn Hạ cấp giữa chu kỳ (Downgrade Prohibition)**: Chặn mua gói thấp hơn khi gói hiện tại vẫn đang `ACTIVE` (trả về lỗi HTTP 400 Bad Request).

---

## 🛠️ 2. DANH SÁCH CHI TIẾT APIS PHÂN HỆ SUBSCRIPTION

| STT | HTTP Method & Path | Phân quyền (Role) | Chức năng & Ghi chú tích hợp FE |
| :--- | :--- | :--- | :--- |
| 1 | `GET /api/packages` | Public | Lấy danh sách tất cả các gói dịch vụ WMS để hiển thị lên bảng giá. |
| 2 | `GET /api/tenant/subscriptions/preview-change` | `TENANT` | **FE GỌI TRƯỚC KHI MỞ MODAL XÁC NHẬN MUA GÓI** (`?packageId={UUID}`). Trả về loại giao dịch (`NEW_PURCHASE`, `RENEWAL`, `UPGRADE`, `DOWNGRADE_BLOCKED`), số tiền, Staff quota và thông điệp. |
| 3 | `POST /api/tenant/subscriptions` | `TENANT` | Mua / Gia hạn / Nâng cấp gói dịch vụ WMS (`{ packageId }`). |
| 4 | `GET /api/tenant/subscriptions/active` | `TENANT` | Lấy thông tin gói dịch vụ WMS đang có hiệu lực của Tenant. |

---

## ⚠️ 3. BÁO CÁO CÁC ẢNH HƯỞNG LIÊN-LUỒNG DÀNH CHO FE (CROSS-FLOW IMPACT REPORT)

FE lưu ý các tác động liên-luồng của phân hệ Subscription:

### 🔴 Ảnh hưởng 1: Luồng Xem Trước Đổi Gói (Subscription Preview Modal)
- Khi Tenant chọn gói trên trang Bảng giá, FE cần gọi `GET /api/tenant/subscriptions/preview-change?packageId={UUID}` trước.
- **Xử lý FE**:
  - Nếu `canProceed = false` (do bị `DOWNGRADE_BLOCKED`), FE disable nút Mua và hiển thị câu thông báo `message` từ API trả về: *"Không thể hạ xuống gói thấp hơn khi gói hiện tại vẫn đang còn hạn."*
  - Nếu `canProceed = true`, FE mở Modal xác nhận mua kèm thông tin chi tiết loại giao dịch (`UPGRADE` / `RENEWAL` / `NEW_PURCHASE`).

### 🔴 Ảnh hưởng 2: Luồng Tự Động Khóa Bớt Staff (Excess Staff Truncation)
- Khi Tenant chuyển sang gói dịch vụ mới có `maxStaff` nhỏ hơn số Staff active hiện tại, Backend tự động chuyển các Staff mới gia nhập gần đây nhất thành `isActive = false`.
- **FE Handling**: FE hiển thị cảnh báo cho Tenant trong Modal preview để Tenant nắm được số Staff sẽ bị tạm khóa khi chuyển gói.

### 🔴 Ảnh hưởng 3: Phí Đăng Bài Kho Bãi Của Owner (`warehouse_publish_fee`)
- Owner khi gửi request tạo kho `POST /api/owner/warehouses`, Backend tự động đọc phí `warehouse_publish_fee` (50.000 VNĐ) từ `SystemConfig` và khấu trừ từ ví Owner (`TransactionType.COMMISSION`).
- **FE Handling**: FE không cần xây dựng giao diện chọn gói cho Owner. Nếu ví Owner không đủ 50k, API trả về `WALLET_INSUFFICIENT_BALANCE` (HTTP 400). FE chỉ cần nảy Popup thông báo: *"Số dư ví không đủ 50.000 VNĐ để thanh toán phí đăng bài. Vui lòng nạp thêm tiền vào ví!"*.

### 🔴 Ảnh hưởng 4: Render Chuỗi JSON Tính Năng Gói (`features`)
- Trường `features` của gói lưu dạng chuỗi JSON Text (ví dụ: `["Quản lý Nhập Xuất Tồn", "Báo cáo Kiểm kê", "AI Chatbot Trợ lý Kho"]`).
- **FE Handling**: FE dùng `JSON.parse(package.features)` để map ra danh sách `<ul><li>` có icon tích xanh ✔️ trên Card Bảng Giá. Nếu `features` null/rỗng, FE render danh sách mặc định dựa theo `maxStaff` và `durationDays`.

---

## 📝 4. CẤU TRÚC JSON MODEL THAM KHẢO DÀNH CHO FE

### 4.1. Response Preview Xem Trước Chuyển Đổi Gói (`GET /api/tenant/subscriptions/preview-change?packageId=XYZ`)
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
    "transactionType": "UPGRADE", // NEW_PURCHASE | RENEWAL | UPGRADE | DOWNGRADE_BLOCKED
    "canProceed": true,
    "message": "Nâng cấp từ gói Gói Basic lên gói Gói Pro. Gói mới có hiệu lực ngay lập tức."
  }
}
```

### 4.2. Response Lấy Gói Đang Hoạt Động (`GET /api/tenant/subscriptions/active`)
```json
{
  "success": true,
  "message": "Lấy thông tin gói đang hoạt động thành công",
  "data": {
    "id": "e98c91a0-ff92-411a-ab5d-c6a85817a022",
    "tenantId": "b0d75383-88eb-46c4-ab77-8101a01c249c",
    "servicePackage": {
      "id": "9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c",
      "name": "Gói Pro",
      "price": 1000000.00,
      "durationDays": 30,
      "maxStaff": 10,
      "features": "[\"Full tính năng WMS\", \"AI Chatbot Trợ lý Kho\"]"
    },
    "startDate": "2026-08-10",
    "endDate": "2026-09-09",
    "status": "ACTIVE"
  }
}
```
