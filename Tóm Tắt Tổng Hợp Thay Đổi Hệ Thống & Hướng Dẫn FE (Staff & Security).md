# TỔNG HỢP THAY ĐỔI HỆ THỐNG & HƯỚNG DẪN TÍCH HỢP FE (PHÂN HỆ STAFF & SECURITY WMS)

Tài liệu này tổng hợp toàn bộ các thay đổi lớn về **Kiến trúc Backend**, **Cơ sở Dữ liệu**, **Chuẩn hóa API**, **Phân quyền Bảo mật** và **Tác động liên-luồng (Cross-Flow Impacts)** trong phân hệ **Staff (Nhân viên kho)** và **Phân công Kho (Warehouse Assignment)**.

---

## 📌 1. TỔNG QUAN CÁC THAY ĐỔI ĐÃ THỰC HIỆN

### 1.1. Chuẩn hóa Phân trang (Pagination Standardization)
- Refactor tất cả các API phân trang trong hệ thống về chuẩn `PagedResponse<T>`.
- Hỗ trợ tương thích ngược 100%: Nhận cả 2 cặp query params `page`/`size` và `pageNo`/`pageSize`.
- Xóa bỏ 7 DTO thừa (`PagedStockBatchResponse`, `PagedAuditResponse`, `PagedReceiptResponse`, `PagedSkuResponse`, `PagedWarehouseTypeResponse`, `PagedTransactionResponse`, `PagedNotificationResponse`).

### 1.2. Bảo mật Hợp đồng Thuê kho (`GET /api/contracts`)
- **Khóa bảo mật tuyệt đối đối với `STAFF`**: API `GET /api/contracts` chỉ dành cho `OWNER`, `TENANT` và `ADMIN`. `STAFF` gọi API sẽ nhận lỗi `403 Forbidden` (do Hợp đồng chứa các thông tin tài chính nhạy cảm: giá thuê, số tiền cọc, file hợp đồng).
- **Cung cấp API kho riêng cho Vận hành (`GET /api/tenant/warehouses/my-warehouses`)**: Cho phép cả `TENANT` và `STAFF` gọi để lấy danh sách các kho đang thuê/được phân công phục vụ nạp Dropdown chọn kho ở các màn hình Nhập/Xuất kho, Kiểm kê, Tồn kho.

### 1.3. Mô hình Phân Công Nhân Viên Theo Kho & Vai Trò (Multi-Warehouse Staff Assignment)
- Bảng mới: `staff_warehouse_assignments` (`StaffWarehouseAssignment`).
- **Enum vai trò WMS (`WarehouseRole`)**:
  - `MANAGER` (Quản lý kho): Full quyền vận hành WMS & duyệt biên bản kiểm kê tại kho.
  - `OPERATOR` (Nhân viên vận hành): Tạo & xử lý phiếu nhập/xuất kho.
  - `INSPECTOR` (Nhân viên kiểm kê): Chuyên trách đếm hàng & lập biên bản kiểm kê tồn kho.
- **Chức danh tùy chỉnh (`customTitle`)**: String do Tenant tự nhập trên UI (vd: *"Thủ kho Ca 1"*, *"Quản lý kho lạnh"*).
- **Mốc thời gian & Trạng thái**: `startDate`, `endDate`, `status` (`ACTIVE`, `REVOKED`, `EXPIRED`), `assignedBy`, `notes`.

### 1.4. Quy trình Sa Thải / Nghỉ Việc (Staff Resignation Flow)
- Cập nhật `TenantMember`: Thêm trường `resignedAt` (TIMESTAMP).
- **Ràng buộc**: Một Staff chỉ thuộc về **1 Tenant tại 1 thời điểm** (`tenant_members`).
- Khi Tenant sa thải/xóa Staff (`DELETE /api/tenant/staffs/{memberId}`):
  - Soft-delete: `is_deleted = true`, `is_active = false`, gán `resignedAt = now()`.
  - **Tự động thu hồi (REVOKE) toàn bộ các phân công kho active** của Staff đó (`endDate = now()`, `status = REVOKED`).
  - **Bảo lưu dữ liệu 100%**: Tất cả phiếu nhập/xuất kho cũ và biên bản kiểm kê cũ do Staff này thực hiện **vẫn được giữ nguyên** cho công tác audit.

### 1.5. Tracking Lịch sử Sự nghiệp Staff (Career Work History Audit Trail)
- API mới **`GET /api/staff/my-work-history`**: Staff tự tra cứu toàn bộ lịch sử công tác sự nghiệp (các Tenant đã/đang làm việc + các Kho đã/đang phụ trách qua các thời kỳ).

---

## 🛠️ 2. CHI TIẾT CÁC API MỚI & THAY ĐỔI

| STT | HTTP Method & Path | Phân quyền (Role) | Chức năng nghiệp vụ & Ghi chú |
| :--- | :--- | :--- | :--- |
| 1 | `GET /api/contracts` | `OWNER`, `TENANT`, `ADMIN` | Danh sách hợp đồng thuê kho. **STAFF gọi sẽ nhận 403 Forbidden**. |
| 2 | `GET /api/tenant/warehouses/my-warehouses` | `TENANT`, `STAFF` | Lấy danh sách kho đang thuê. **Với STAFF: Tự động lọc các kho được phân công ACTIVE**. |
| 3 | `POST /api/tenant/staffs/{staffUserId}/warehouses` | `TENANT` | Phân công Staff làm việc tại Kho (kèm `role` WMS & `customTitle`). |
| 4 | `GET /api/tenant/staffs/{staffUserId}/warehouses` | `TENANT` | Xem danh sách/lịch sử phân công kho của Staff trong tổ chức. |
| 5 | `DELETE /api/tenant/staffs/assignments/{assignmentId}` | `TENANT` | Thu hồi phân công kho của Staff (`status = REVOKED`, `endDate = now()`). |
| 6 | `DELETE /api/tenant/staffs/{memberId}` | `TENANT` | Sa thải Staff (Soft delete, set `resignedAt`, tự động revoke các phân công kho active). |
| 7 | `GET /api/staff/my-work-history` | `STAFF` | Staff tự tra cứu toàn bộ lịch sử sự nghiệp qua các Tenant & Kho bãi. |

---

## 🔗 3. TÁC ĐỘNG LIÊN-BẢNG & LIÊN-LUỒNG DÀNH CHO FE (CROSS-FLOW IMPACTS)

```
                       ┌────────────────────────┐
                       │       Bảng User        │
                       └───────────┬────────────┘
                                   │
                         user_id   │
                                   ▼
                       ┌────────────────────────┐
                       │   Bảng TenantMember    │ (joined_at, resigned_at)
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │StaffWarehouseAssignment│ (start_date, end_date, status)
                       └───────────┬────────────┘
                                   │
            ┌──────────────────────┴──────────────────────┐
            ▼                                             ▼
┌──────────────────────┐                       ┌──────────────────────┐
│  inventory_receipts  │                       │   inventory_audits   │
│ created_by/approved_by                       │ created_by/audited_by│
└──────────────────────┘                       └──────────────────────┘
 (Dữ liệu phiếu cũ được BẢO LƯU 100% khi Staff nghỉ việc / bị thu hồi kho)
```

### 3.1. Luồng Nhập/Xuất Kho (`inventory_receipts`)
- Cột `created_by` và `approved_by` lưu ID của người dùng.
- **Tác động khi Sa thải Staff**: Khi Staff bị sa thải (`resignedAt` được ghi nhận), các phiếu Nhập/Xuất kho cũ do Staff đó tạo hoặc duyệt **vẫn giữ nguyên thông tin**. 
- **FE Handling**: Giao diện báo cáo phiếu cũ hiển thị tên Staff bình thường, không bị lỗi `null` hay rác UI.

### 3.2. Luồng Kiểm Kê Tồn Kho (`inventory_audits`)
- Biên bản kiểm kê lưu `created_by` và `audited_by`.
- Tương tự Nhập/Xuất, thông tin người thực hiện kiểm kê cũ được bảo toàn 100% phục vụ đối soát độc lập.

### 3.3. Luồng Hạ Gói Dịch Vụ WMS (Subscription Downgrade)
- Khi Tenant hạ gói dịch vụ WMS (`maxStaff` giảm) $\rightarrow$ Backend tự động tạm khóa các Staff tham gia muộn nhất (`isActive = false`).
- **FE Handling**: Khi Staff bị tạm khóa do hạ gói, API `GET /api/tenant/warehouses/my-warehouses` của Staff đó sẽ không trả về kho nào (hoặc thao tác WMS báo tài khoản bị tạm khóa).

### 3.4. Luồng Chuyển Đổi Doanh Nghiệp (Multi-Tenancy Membership)
- Một Staff chỉ có 1 membership `ACTIVE` tại một thời điểm. Khi Staff thôi việc ở Tenant A (`resignedAt`), tài khoản Staff đó hoàn toàn có thể nhận lời mời gia nhập Tenant B trong tương lai mà không gây xung đột dữ liệu.

---

## 📝 4. CẤU TRÚC JSON MODEL GỬI/NHẬN THAM KHẢO CHO FE

### Request Phân Công Kho (`POST /api/tenant/staffs/{staffUserId}/warehouses`)
```json
{
  "warehouseId": "e7069084-5220-4608-8c6c-f5161736ce15",
  "role": "MANAGER",
  "customTitle": "Thủ kho Ca 1",
  "notes": "Phân công phụ trách quản lý ca sáng"
}
```

### Response Tra Cứu Lịch Sử Sự Nghiệp (`GET /api/staff/my-work-history`)
```json
{
  "success": true,
  "message": "Lấy lịch sử làm việc sự nghiệp thành công",
  "data": {
    "staffId": "5af2ccb1-e641-4d5e-83cd-e41e48ad73d3",
    "fullName": "Nguyen Van A",
    "email": "staff.a@gmail.com",
    "phone": "0912345678",
    "tenantTenures": [
      {
        "membershipId": "9dfb9805-11c4-4c50-acf5-607191abfcaf",
        "tenantId": "b0d75383-88eb-46c4-ab77-8101a01c249c",
        "tenantName": "Công ty Logistics ABC",
        "tenantEmail": "tenant.abc@gmail.com",
        "joinedAt": "2026-05-01T08:00:00",
        "resignedAt": null,
        "isActive": true
      }
    ],
    "warehouseAssignments": [
      {
        "id": "2201641d-9c96-4441-97ba-659adb4fb0e5",
        "staffId": "5af2ccb1-e641-4d5e-83cd-e41e48ad73d3",
        "staffName": "Nguyen Van A",
        "warehouseId": "e7069084-5220-4608-8c6c-f5161736ce15",
        "warehouseName": "Kho Hà Nội 1",
        "warehouseAddress": "Số 10 Phạm Hùng, Cầu Giấy, Hà Nội",
        "role": "MANAGER",
        "customTitle": "Thủ kho Ca 1",
        "startDate": "2026-05-02T09:00:00",
        "endDate": null,
        "status": "ACTIVE",
        "notes": "Phân công phụ trách quản lý ca sáng"
      }
    ]
  }
}
```
