# Kế hoạch thay đổi FE – Ẩn số lượng khi Staff kiểm kê mù

## 1. Mục tiêu

Trong lúc Staff đang kiểm kê, Staff vẫn được xem mã SKU, tên sản phẩm và rack/bin để đi đếm thực tế nhưng không được xem số lượng hệ thống trong phạm vi audit.

Tenant vẫn xem đầy đủ số lượng. Khi audit chuyển sang `SUBMITTED` hoặc `APPROVED`, FE tải lại dữ liệu và hiển thị số lượng bình thường.

## 2. API contract từ BE

Các endpoint stock có thể trả thêm trường `quantityMasked`:

- `GET /api/tenant/inventory/stock?warehouseId={warehouseId}`
- `GET /api/tenant/inventory/stock/overview?warehouseId={warehouseId}`
- `GET /api/tenant/inventory/stock/sku/{skuId}`
- `GET /api/tenant/inventory/stock/summary?skuId={skuId}`

### Dữ liệu bình thường

```json
{
  "quantity": 20,
  "reservedQuantity": 2,
  "availableQuantity": 18,
  "quantityMasked": false
}
```

### Dữ liệu bị che

```json
{
  "quantity": 0,
  "reservedQuantity": 0,
  "availableQuantity": 0,
  "quantityMasked": true
}
```

Khi `quantityMasked=true`, các giá trị `0` chỉ là placeholder. FE tuyệt đối không hiển thị chúng thành số 0 và không dùng chúng để tính tổng.

Các trường vẫn được hiển thị:

- SKU code/name
- UOM
- warehouse name
- rack/bin name và ID
- batch ID
- arrival date

## 3. Quy tắc phạm vi audit

| Scope audit | Dữ liệu bị che |
|---|---|
| `WAREHOUSE` | Tất cả batch trong kho |
| `RACK` | Batch thuộc rack được chọn |
| `BIN` | Batch thuộc bin được chọn |

Nếu một SKU có nhiều vị trí và chỉ một vị trí bị che, phải che tổng SKU để không suy ra số lượng từ vị trí còn lại.

## 4. Thay đổi trang Inventory

### 4.1. Gọi đúng API layout

- Staff: dùng `staffApi.getStaffLayout(warehouseId)` → `GET /api/staff/warehouses/{warehouseId}/layout`.
- Tenant: giữ API layout tenant hiện tại.

Không gọi `layoutApi.getTenantWarehouseLayout()` cho Staff vì endpoint này có thể trả `403 FORBIDDEN`.

### 4.2. Hiển thị quantity

- Tạo helper, ví dụ `formatStockQuantity(value, quantityMasked)`.
- Nếu `quantityMasked=true`, trả về `Đang kiểm kê` hoặc `Ẩn khi kiểm kê`.
- Không render placeholder `0`.
- Không cộng tổng từ các batch bị che.
- Tổng SKU phải hiển thị `Đang kiểm kê` nếu có ít nhất một batch bị che.
- Chi tiết batch bị che cũng hiển thị trạng thái, không hiển thị số lượng.

### 4.3. Banner

Hiển thị khi danh sách stock có ít nhất một item `quantityMasked=true`:

```text
Kho đang được kiểm kê. Số lượng hệ thống trong phạm vi kiểm kê được ẩn cho đến khi Staff gửi kết quả.
```

### 4.4. Nút chức năng

- Disable `Export snapshot` khi đang có item bị che.
- Tooltip: `Không thể xuất snapshot khi đang kiểm kê mù`.
- Nếu API trả HTTP `409` với code `AUDIT_MOVEMENT_LOCKED`, hiển thị toast thân thiện.
- Không dùng dữ liệu quantity cũ trong cache để hiển thị lại.
- Sau khi submit/approve audit, gọi lại stock API.

## 5. Xử lý grouping

Khi group stock theo SKU:

```js
const quantityMasked = batches.some((batch) => batch.quantityMasked)

return {
  ...group,
  quantityMasked,
  totalQuantity: quantityMasked
    ? null
    : batches.reduce((sum, batch) => sum + batch.quantity, 0),
}
```

Ở UI, `totalQuantity === null` chỉ là trạng thái nội bộ; nội dung hiển thị phải dựa trên `quantityMasked`.

## 6. Test case FE

### TC01 – Không có audit

- Đăng nhập Staff.
- Chọn kho được phân công.
- Kỳ vọng: quantity/reserved/available hiển thị bình thường.

### TC02 – Audit toàn kho

- Tenant tạo audit scope `WAREHOUSE`.
- Staff bắt đầu kiểm kê.
- Kỳ vọng: toàn bộ số lượng trong kho hiển thị `Đang kiểm kê`.
- SKU và rack/bin vẫn hiển thị.

### TC03 – Audit một rack

- Audit scope `RACK`.
- Kỳ vọng: batch thuộc rack đó bị che; rack khác vẫn thấy số lượng.
- SKU nằm ở cả rack bị che và rack khác thì tổng SKU vẫn bị che.

### TC04 – Audit một bin

- Audit scope `BIN`.
- Kỳ vọng: chỉ batch thuộc bin đó bị che.

### TC05 – Export snapshot khi audit chạy

- Staff bấm `Export snapshot`.
- Kỳ vọng: nút bị disable hoặc nhận lỗi `AUDIT_MOVEMENT_LOCKED`.

### TC06 – Sau khi Staff submit

- Staff submit audit, trạng thái chuyển `SUBMITTED`.
- Reload Inventory.
- Kỳ vọng: số lượng hệ thống hiển thị lại.

### TC07 – Tenant không bị ảnh hưởng

- Tenant mở cùng kho trong lúc Staff kiểm kê.
- Kỳ vọng: Tenant vẫn xem được số lượng đầy đủ.

### TC08 – Staff không có quyền kho

- Staff truy cập kho chưa được assign.
- Kỳ vọng: API trả `403`, FE hiển thị lỗi quyền và không dùng dữ liệu cũ.

## 7. Tiêu chí nghiệm thu

- Không hiển thị `0` thay cho quantity bị che.
- Không tính tổng SKU từ quantity placeholder.
- Không có cách lấy số lượng bằng Export snapshot.
- Staff dùng đúng layout endpoint.
- Tenant giữ nguyên chức năng xem tồn kho.

## 8. Phạm vi bàn giao

File này chỉ là kế hoạch cho FE. Không commit và không push thay đổi FE trong task BE hiện tại.
