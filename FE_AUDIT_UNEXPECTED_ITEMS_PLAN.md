# Kế hoạch FE: hàng phát sinh trong phiếu kiểm kê

## Mục tiêu

FE cần xử lý ba thay đổi của nghiệp vụ kiểm kê:

1. Phân biệt rõ dòng theo sổ và dòng hàng phát sinh.
2. Không tạo dòng thứ hai khi cùng SKU đã tồn tại tại cùng Rack/Bin.
3. Bắt buộc xác định chính xác Bin chứa hàng phát sinh đối với mọi phạm vi kiểm kê.

BE đã cung cấp dữ liệu và validation tương ứng. Không suy luận nguồn gốc dòng bằng `expectedQuantity`, `batchId` hoặc nội dung ghi chú.

## File FE chính cần sửa

- `src/features/inventory/pages/InventoryAuditDetailPage.jsx`
- `src/services/wms/auditApi.js`: endpoint không đổi, chủ yếu cập nhật comment/type nếu dự án có khai báo type.
- `src/features/admin/pages/AdminAuditsPage.jsx`: nên hiển thị badge nguồn gốc nếu màn hình Admin vẫn dùng để xem chi tiết audit.

## Contract response mới

API chi tiết phiếu và các API trả lại phiếu kiểm kê có thêm thông tin phạm vi:

```json
{
  "id": "audit-uuid",
  "scopeType": "RACK",
  "scopeRackId": "rack-uuid",
  "scopeRackName": "Rack tiêu chuẩn 1",
  "scopeBinId": null,
  "scopeBinName": null,
  "items": []
}
```

Mỗi item có thêm ID vị trí và nguồn gốc:

```json
{
  "id": "audit-item-uuid",
  "batchId": null,
  "skuId": "sku-uuid",
  "skuCode": "MOUSE-0910-02",
  "skuName": "Chuột Không Dây",
  "rackId": "rack-uuid",
  "rackName": "Rack tiêu chuẩn 1",
  "binId": "bin-uuid",
  "binName": "Rack tiêu chuẩn 1 - Bin 1",
  "itemOrigin": "UNEXPECTED",
  "expectedQuantity": 0,
  "actualQuantity": 1,
  "discrepancy": 1
}
```

`itemOrigin` có hai giá trị:

- `SNAPSHOT`: dòng tồn tại trong sổ tại thời điểm bắt đầu vòng kiểm đếm.
- `UNEXPECTED`: dòng do người kiểm kê bấm **Thêm hàng phát sinh**.

Trong blind count, `expectedQuantity` và `discrepancy` của Staff có thể là `null`. Badge phải dựa duy nhất vào `itemOrigin`.

## 1. Hiển thị hàng phát sinh

Trong bảng `items` của `InventoryAuditDetailPage.jsx`:

- Dòng `SNAPSHOT`: hiển thị bình thường, có thể thêm badge nhỏ `Theo sổ` nếu muốn.
- Dòng `UNEXPECTED`: hiển thị badge `Hàng phát sinh` cạnh mã SKU và dùng màu nền nhẹ để dễ nhận biết.
- Sắp xếp dòng `UNEXPECTED` xuống cuối bảng chỉ ở tầng hiển thị. Không đổi ID và không làm sai payload lưu số lượng.
- Tenant vẫn phải thấy badge khi phiếu ở `SUBMITTED`, `RECOUNT_REQUIRED`, `APPROVED` hoặc khi xem lịch sử.

Ví dụ:

```text
KETTLE-0904-01  [THEO SỔ]
Hệ thống: 4     Thực tế: 5     Chênh lệch: +1

MOUSE-0910-02   [HÀNG PHÁT SINH]
Hệ thống: 0     Thực tế: 1     Chênh lệch: +1
```

Không dùng các điều kiện sau để đoán hàng phát sinh:

```js
item.expectedQuantity === 0
item.batchId == null
```

Các điều kiện đó không ổn định trong blind count và sau khi Tenant duyệt adjustment.

## 2. Xử lý SKU trùng tại cùng vị trí

Một dòng audit được định danh nghiệp vụ bởi:

```text
SKU + Rack + Bin + vòng kiểm đếm hiện tại
```

Nếu gọi thêm hàng phát sinh với cùng `skuId`, `rackId`, `binId`, BE trả HTTP `409`:

```json
{
  "success": false,
  "code": "AUDIT_ITEM_DUPLICATE",
  "message": "SKU này đã có tại vị trí kiểm kê. Vui lòng cập nhật tổng số lượng thực tế trên dòng hiện có"
}
```

FE xử lý riêng mã lỗi này:

1. Không gọi lại API và không tự cộng số lượng.
2. Đóng modal hoặc giữ modal nhưng phải đưa người dùng về dòng đã có.
3. Tìm dòng bằng bộ khóa `skuId + rackId + binId`.
4. Scroll đến dòng, highlight ngắn và focus ô **Thực tế**.
5. Hiện thông báo: `SKU này đã có tại vị trí. Hãy nhập tổng số thực tế cuối cùng trên dòng hiện có.`

Ví dụ: dòng Chuột/Bin 1 đang có thực tế `1`, sau đó tìm thêm `2`. Người dùng sửa ô thực tế từ `1` thành tổng cuối cùng `3`. FE không tự động cộng vì giá trị nhập trong modal có thể là “tìm thêm 2” hoặc “tổng là 2”.

Cùng SKU ở hai Bin khác nhau vẫn là hai dòng hợp lệ.

## 3. Modal vị trí theo từng scope

Hiện tại modal chỉ tải layout khi `scopeType === 'WAREHOUSE'`, Rack audit không chọn được Bin, và Bin của Warehouse audit chưa bắt buộc. Cần sửa như sau.

### Scope `BIN`

- Hiển thị vị trí cố định bằng `scopeRackName / scopeBinName` ở dạng read-only.
- Không cho đổi Rack/Bin.
- Payload có thể không gửi `rackId`, `binId`; BE tự dùng Bin của scope.
- Nếu FE muốn gửi ID để rõ contract, chỉ gửi đúng `scopeRackId` và `scopeBinId`.

Payload tối thiểu:

```json
{
  "skuId": "sku-uuid",
  "actualQuantity": 1,
  "note": "Tìm thấy khi kiểm Bin 1"
}
```

### Scope `RACK`

- Hiển thị Rack cố định bằng `scopeRackName`; không cho chọn Rack khác.
- Tải layout cho cả `RACK`, không chỉ `WAREHOUSE`.
- Lấy Rack trong layout bằng `scopeRackId` và hiển thị danh sách Bin thuộc Rack đó.
- Bin là bắt buộc.
- Nếu Rack không có Bin, disable nút thêm và báo cấu hình vị trí chưa hợp lệ.

Payload:

```json
{
  "skuId": "sku-uuid",
  "rackId": "scope-rack-uuid",
  "binId": "selected-bin-uuid",
  "actualQuantity": 1,
  "note": ""
}
```

### Scope `WAREHOUSE`

- Tải toàn bộ layout.
- Rack là bắt buộc.
- Sau khi chọn Rack, Bin thuộc Rack đó là bắt buộc.
- Đổi Rack phải reset `unexpectedBinId`.
- Không có lựa chọn `Không chọn bin`.

Payload:

```json
{
  "skuId": "sku-uuid",
  "rackId": "selected-rack-uuid",
  "binId": "selected-bin-uuid",
  "actualQuantity": 1,
  "note": ""
}
```

BE sẽ từ chối bằng `AUDIT_SCOPE_INVALID` nếu:

- RACK audit không có `binId`.
- WAREHOUSE audit thiếu `rackId` hoặc `binId`.
- Bin không thuộc Rack đã chọn.
- Rack/Bin không thuộc kho của phiếu.
- BIN audit gửi một vị trí khác với scope.

Không dùng trường `note` để lưu vị trí. Ghi chú chỉ là mô tả bổ sung và không thể dùng để tạo adjustment chính xác.

## Thay đổi cụ thể trong `InventoryAuditDetailPage.jsx`

### Khi mở modal

- Reset SKU, Rack, Bin, số lượng và ghi chú như hiện tại.
- Gọi API layout khi scope là `RACK` hoặc `WAREHOUSE`.
- Với `RACK`, gán `unexpectedRackId = audit.scopeRackId` sau khi mở modal.
- Với `BIN`, không cần tải layout; dùng dữ liệu scope từ response chi tiết.

### Validation trước khi gửi

- Mọi scope: bắt buộc SKU và số lượng hợp lệ.
- `RACK`: bắt buộc `unexpectedBinId`.
- `WAREHOUSE`: bắt buộc cả `unexpectedRackId` và `unexpectedBinId`.
- `BIN`: kiểm tra response có `scopeBinId`; nếu thiếu thì báo lỗi dữ liệu phiếu và không gửi.

### Render bảng

- Thêm badge dựa trên `item.itemOrigin`.
- Nên thêm `data-audit-item-id={item.id}` hoặc ref theo `item.id` để scroll/focus khi gặp duplicate.
- Khi tìm dòng duplicate, so sánh ID bằng `String(...)` để tránh sai khác kiểu dữ liệu.

## Thứ tự deploy

Deploy BE trước, sau đó deploy FE. FE cũ vẫn đọc được response mới vì các field chỉ được bổ sung, nhưng sau khi BE mới lên:

- WAREHOUSE audit bắt buộc Bin nên FE cũ sẽ nhận `AUDIT_SCOPE_INVALID` nếu chỉ chọn Rack.
- RACK audit bắt buộc Bin nên FE cũ chưa thể thêm hàng phát sinh cho đến khi cập nhật modal.

## Checklist test FE

- [ ] BIN audit hiển thị đúng vị trí cố định và thêm hàng thành công không cần picker.
- [ ] BIN audit không thể gửi Rack/Bin khác.
- [ ] RACK audit chỉ hiển thị Bin thuộc `scopeRackId`.
- [ ] RACK audit không thể submit khi chưa chọn Bin.
- [ ] WAREHOUSE audit bắt buộc chọn Rack rồi Bin.
- [ ] Đổi Rack trong WAREHOUSE audit làm trống Bin cũ.
- [ ] Bin thuộc Rack khác bị BE từ chối.
- [ ] Dòng mới trả về có badge `Hàng phát sinh`.
- [ ] Dòng `SNAPSHOT` không bị gắn nhầm badge.
- [ ] Thêm lại cùng SKU tại cùng Bin nhận `AUDIT_ITEM_DUPLICATE` và focus dòng cũ.
- [ ] FE không tự cộng số lượng khi gặp duplicate.
- [ ] Cùng SKU ở Bin khác vẫn thêm được.
- [ ] Tenant thấy badge nguồn gốc khi duyệt phiếu.
- [ ] Staff blind count không dùng `expectedQuantity` để xác định nguồn gốc.
