# Hướng Dẫn Tích Hợp FE: Luồng 3 - Quy Trình Nhập Kho (Inbound) & Xuất Kho (Outbound)

Tài liệu này đặc tả quy trình vận hành và tích hợp API cho hai nghiệp vụ cốt lõi trong kho: **Inbound (Nhập kho)** và **Outbound (Xuất kho)**, cùng luồng tự động điều chỉnh tồn kho phát sinh sau khi kiểm kê.

---

## 1. Trạng Thái Và Vòng Đời Của Phiếu Nhập/Xuất (InventoryReceipt)

Mỗi phiếu Nhập/Xuất kho (`InventoryReceipt`) đều có vòng đời qua hai trạng thái chính sau:

```
      ┌───────────────┐               Phê duyệt thực tế
      │    PENDING    ├─────────────────────────────────► APPROVED
      └───────────────┘                                  (Cập nhật StockBatch
   (Tạo phiếu dự kiến,                                   & ghi nhận giao dịch)
    chưa thay đổi kho)
```

* **PENDING:** Phiếu vừa được lập trên hệ thống. Hàng hóa thực tế chưa di chuyển vào/ra khỏi các ô chứa (Bin) trong kho. Tồn kho hệ thống **chưa thay đổi**.
* **APPROVED:** Nhân viên kho đã kiểm đếm thực tế và xác nhận hoàn tất. Tồn kho hệ thống được **cập nhật ngay lập tức**, ghi nhận lịch sử vào sổ giao dịch kho.

---

## 2. Chi Tiết Luồng Nhập Kho (Inbound Flow)

Quy trình nhập kho được thực hiện qua các bước sau:

### Bước 1: Lập phiếu nhập kho dự kiến (`PENDING`)
* Người thực hiện: Tenant hoặc Staff.
* Hành động: Gọi API `POST /api/tenant/inventory/receipts` với body có `type: "INBOUND"`.
* FE cần truyền danh sách các mặt hàng cần nhập, số lượng, và **quan trọng nhất: Vị trí Bin dự kiến cất hàng** (lấy `binId` từ layout sơ đồ 2D).

### Bước 2: Thực hiện kiểm đếm và Phê duyệt nhập kho
* Khi hàng hóa thực tế được vận chuyển đến kho, nhân viên kho (Staff) đếm số lượng thực tế.
* Gọi API: `PATCH /api/tenant/inventory/receipts/{id}/approve`.
* **Backend xử lý:**
  1. Kiểm tra từng dòng hàng nhập.
  2. Tìm kiếm lô hàng tồn kho (`StockBatch`) tương ứng với cặp khóa `(skuId, binId, warehouseId)`.
  3. Nếu chưa có lô hàng nào tại vị trí Bin đó $\rightarrow$ Backend tự động tạo mới `StockBatch` với số lượng bằng 0.
  4. Cộng dồn số lượng nhập vào `StockBatch.quantity`.
  5. Tạo bản ghi nhật ký sổ cái `InventoryTransaction` ghi nhận biến động tăng hàng (`quantityChanged = +qty`), liên kết bắt buộc với `receiptId`.
  6. Chuyển trạng thái phiếu nhập sang `APPROVED`.

---

## 3. Chi Tiết Luồng Xuất Kho (Outbound Flow)

Quy trình xuất kho diễn ra ngược lại với nhập kho và có bước kiểm tra điều kiện tồn kho nghiêm ngặt:

### Bước 1: Lập phiếu xuất kho dự kiến (`PENDING`)
* Người thực hiện: Tenant hoặc Staff.
* Hành động: Gọi API `POST /api/tenant/inventory/receipts` với body có `type: "OUTBOUND"`.
* FE cần truyền danh sách mặt hàng, số lượng, và **vị trí Bin dự kiến sẽ lấy hàng ra**.

### Bước 2: Thực hiện bốc hàng và Phê duyệt xuất kho
* Nhân viên kho bốc xếp hàng ra xe, đếm đủ số lượng và bấm xác nhận xuất kho.
* Gọi API: `PATCH /api/tenant/inventory/receipts/{id}/approve`.
* **Backend xử lý:**
  1. Đối soát số lượng yêu cầu xuất với số lượng hiện có trong lô hàng tồn kho thực tế (`StockBatch`) tại đúng ô `binId` đó.
  2. **Điều kiện chặn:** Nếu số lượng tồn kho hiện tại nhỏ hơn số lượng cần xuất $\rightarrow$ Ném lỗi `STOCK_INSUFFICIENT_QUANTITY` (400) kèm thông tin mặt hàng bị thiếu. Phiếu xuất giữ nguyên trạng thái `PENDING`.
  3. Nếu đủ hàng: Trừ đi số lượng xuất khỏi `StockBatch.quantity`. (Nếu số lượng về 0, lô hàng tồn kho tại vị trí đó có thể được dọn dẹp).
  4. Ghi nhận giao dịch giảm kho vào sổ nhật ký `InventoryTransaction` (`quantityChanged = -qty`), liên kết bắt buộc với `receiptId`.
  5. Chuyển trạng thái phiếu xuất sang `APPROVED`.

---

## 4. Luồng Phụ: Tự Động Sinh Phiếu Điều Chỉnh Từ Kiểm Kê (Inventory Audit)

> [!NOTE]
> Đây là thay đổi cốt lõi dựa trên góp ý của Mentor. Bảng điều chỉnh độc lập (`AdjustmentNote`) đã được dẹp bỏ. Tất cả các hoạt động điều chỉnh sai lệch đều được quy về phiếu Nhập/Xuất chuẩn để thống nhất sổ cái Transaction.

### Trình tự xử lý của Backend khi Duyệt Kiểm Kê (`approveAudit`):
1. Khi Tenant bấm duyệt phiếu kiểm kê (`APPROVED`), hệ thống tính toán chênh lệch `discrepancy` (Số lượng thực tế - Số lượng hệ thống) của từng lô hàng.
2. Nếu xảy ra chênh lệch:
   - **Thừa hàng (`discrepancy > 0`):** Backend tự động sinh một phiếu `InventoryReceipt` loại `INBOUND` ở trạng thái **APPROVED**, điền `referenceId` bằng ID của phiếu kiểm kê đó.
   - **Thiếu hàng (`discrepancy < 0`):** Backend tự động sinh một phiếu `InventoryReceipt` loại `OUTBOUND` ở trạng thái **APPROVED** tương tự.
3. Các phiếu tự động này đi qua luồng cập nhật tồn kho và ghi Transaction như một phiếu Nhập/Xuất thông thường.

### Lưu ý cho giao diện FE:
* Khi render danh sách Phiếu nhập/xuất kho (`GET /api/tenant/inventory/receipts`), FE nên kiểm tra trường `referenceId`.
* Nếu `referenceId != null`, hãy hiển thị một Tag/Nhãn đặc biệt: **"Phiếu điều chỉnh kiểm kê"** và có thể đính kèm link chuyển hướng nhanh đến chi tiết phiếu kiểm kê tương ứng để người dùng đối soát lý do.

---

## 5. Danh Sách Các Endpoints Tích Hợp

### 5.1. Tạo phiếu Nhập/Xuất kho dự kiến
* **API:** `POST /api/tenant/inventory/receipts`
* **Request Body (JSON):**
```json
{
  "warehouseId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "type": "INBOUND", 
  "items": [
    {
      "skuId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "quantity": 50,
      "zoneId": "c51387e3-d5cd-424d-9360-e36a8394c416",
      "rackId": "d449d532-d94e-480b-b529-2d8f87bafddb",
      "binId": "e0c5a3bb-0432-4eeb-be3a-61dc7c921004",
      "note": "Nhập kho đợt 1 hàng điện tử"
    }
  ]
}
```

### 5.2. Lấy danh sách phiếu có phân trang và lọc
* **API:** `GET /api/tenant/inventory/receipts`
* **Query Params:**
  - `warehouseId` (UUID, Required)
  - `type` (String, Optional: `INBOUND` hoặc `OUTBOUND`)
  - `page` (int, default 0), `size` (int, default 10)
* **Response Body (JSON):**
```json
{
  "success": true,
  "message": "Lấy danh sách phiếu thành công",
  "data": {
    "content": [
      {
        "id": "f90123cd-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "warehouseId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "type": "INBOUND",
        "status": "PENDING",
        "referenceId": null,
        "createdAt": "2026-07-13T10:00:00"
      }
    ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 1
  }
}
```

### 5.3. Xem chi tiết phiếu (kèm danh sách dòng hàng chi tiết)
* **API:** `GET /api/tenant/inventory/receipts/{id}`

### 5.4. Phê duyệt phiếu (Cập nhật trực tiếp số lượng tồn kho)
* **API:** `PATCH /api/tenant/inventory/receipts/{id}/approve`
* **Response Body (Lỗi khi xuất thiếu hàng):**
```json
{
  "success": false,
  "message": "Số lượng hàng tồn kho không đủ để thực hiện xuất kho",
  "errorCode": "STOCK_INSUFFICIENT_QUANTITY"
}
```
* **Response Body (Duyệt thành công):**
```json
{
  "success": true,
  "message": "Duyệt phiếu nhập/xuất kho thành công",
  "data": {
    "id": "f90123cd-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "status": "APPROVED",
    "updatedAt": "2026-07-13T10:15:30"
  }
}
```
