# FE Integration Guide — Outbound FIFO Picking

## 1. Phạm vi thay đổi

Backend đã hoàn thiện luồng xuất kho theo FIFO và sinh thứ tự lấy hàng theo heuristic `SERPENTINE_XY_V1`.

- FE không tự chọn `rackId`, `binId` hoặc `stockBatchId` khi tạo OUTBOUND.
- Backend chọn batch theo FIFO, tách quantity qua nhiều batch nếu cần, rồi gom các line theo bin thành pick stop.
- `sequence` là thứ tự stop FE cần hiển thị cho Staff.
- Đây là **Suggested picking order**, không phải shortest path tuyệt đối.
- PENDING receipt chưa reserve stock. Hai receipt có thể cùng nhìn thấy một batch; approval sẽ lock và revalidate lại.

Base URL dùng theo môi trường hiện tại của FE. Tất cả endpoint dưới đây cần:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Response thành công dùng envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Response lỗi dùng envelope:

```json
{
  "success": false,
  "code": "OUTBOUND_PICK_LIST_STALE",
  "message": "..."
}
```

## 2. Permission và actor

| Hành động | Endpoint | Permission | Quy tắc thêm |
|---|---|---|---|
| Preview pick list | `POST /api/tenant/inventory/picking/suggestions` | `INVENTORY_READ` | Staff phải được assign vào warehouse |
| Tạo receipt | `POST /api/tenant/inventory/receipts` | `INBOUND_CREATE` hoặc `OUTBOUND_CREATE` | Contract và subscription phải còn active; Staff phải được assign |
| Replan receipt | `POST /api/tenant/inventory/receipts/{id}/picking/replan` | `OUTBOUND_CREATE` | Chỉ OUTBOUND PENDING; Tenant hoặc Staff đã assign |
| Xem receipt | `GET /api/tenant/inventory/receipts` và `/{id}` | `INVENTORY_READ` | Contract active; Staff phải được assign |
| Approve/reject | `PATCH /api/tenant/inventory/receipts/{id}/approve` hoặc `/reject` | `INVENTORY_UPDATE` | Chỉ Tenant được xử lý; cần subscription active |

`ACTIVE Contract` cho quyền quan sát warehouse. Các thao tác WMS mutation còn cần subscription active.

## 3. Preview pick list

### Request

```http
POST /api/tenant/inventory/picking/suggestions
```

```json
{
  "warehouseId": "warehouse-uuid",
  "items": [
    {
      "skuId": "sku-uuid",
      "quantity": 100
    }
  ]
}
```

Mỗi SKU chỉ được xuất hiện một lần trong `items`. `quantity` phải lớn hơn 0.

### Response

```json
{
  "success": true,
  "message": "Outbound pick-list suggestions calculated successfully",
  "data": {
    "warehouseId": "warehouse-uuid",
    "layoutId": "layout-uuid",
    "strategy": "FIFO_SERPENTINE_XY_V1",
    "complete": true,
    "items": [
      {
        "skuId": "sku-uuid",
        "requestedQuantity": 100,
        "allocatedQuantity": 100,
        "shortageQuantity": 0
      }
    ],
    "stops": [
      {
        "sequence": 1,
        "rackId": "rack-uuid",
        "rackCode": "RACK-A",
        "binId": "bin-uuid",
        "binCode": "BIN-C3",
        "shelfLevel": 1,
        "lines": [
          {
            "stockBatchId": "batch-uuid",
            "skuId": "sku-uuid",
            "skuCode": "SKU-001",
            "skuName": "Product 1",
            "arrivalDate": "2026-08-01T08:00:00",
            "quantity": 100
          }
        ]
      }
    ],
    "warnings": []
  }
}
```

FE render `stops` theo `sequence` tăng dần và render `lines` theo đúng thứ tự Backend trả về. Không sort lại theo SKU, tên, quantity hoặc arrival date.

Nếu `complete = false`, FE đọc `shortageQuantity` theo từng SKU, hiển thị thiếu bao nhiêu và disable nút tạo OUTBOUND.

Preview không tạo receipt, không reserve stock và không thay đổi quantity.

## 4. Tạo receipt

### 4.1 OUTBOUND

```http
POST /api/tenant/inventory/receipts
```

```json
{
  "warehouseId": "warehouse-uuid",
  "type": "OUTBOUND",
  "signatureData": "optional-signature-data",
  "items": [
    {
      "skuId": "sku-uuid",
      "quantity": 100,
      "note": "optional note"
    }
  ]
}
```

Không gửi `rackId` hoặc `binId` trong OUTBOUND. Nếu gửi, Backend trả validation error. FE cũng không gửi `stockBatchId` vì field này do Backend quyết định.

Backend sẽ chạy lại FIFO trên dữ liệu hiện tại. Nếu không đủ hàng, receipt và receipt items không được tạo.

Response `data` là `InventoryReceiptResponse` với:

- `status = PENDING`;
- `items`: một row cho mỗi allocation batch, có `stockBatchId`, `rackId`, `binId`, `pickSequence`;
- `pickList`: pick list đã được persist, dùng trực tiếp để render.

Ví dụ phần dữ liệu chính:

```json
{
  "id": "receipt-uuid",
  "warehouseId": "warehouse-uuid",
  "type": "OUTBOUND",
  "status": "PENDING",
  "items": [
    {
      "id": "receipt-item-uuid",
      "skuId": "sku-uuid",
      "skuCode": "SKU-001",
      "skuName": "Product 1",
      "quantity": 60,
      "rackId": "rack-uuid",
      "rackName": "Rack A",
      "binId": "bin-uuid",
      "binName": "Bin C3",
      "stockBatchId": "batch-uuid",
      "pickSequence": 1,
      "note": "optional note"
    }
  ],
  "pickList": {
    "warehouseId": "warehouse-uuid",
    "layoutId": "layout-uuid",
    "strategy": "FIFO_SERPENTINE_XY_V1",
    "complete": true,
    "items": [],
    "stops": [],
    "warnings": []
  }
}
```

Nếu một SKU cần lấy từ nhiều batch, `items` và `pickList.stops[].lines` có nhiều dòng tương ứng. FE không cộng quantity bằng số dòng; dùng `quantity`/`allocatedQuantity` do Backend trả.

Khi tải lại bằng `GET /api/tenant/inventory/receipts` hoặc `GET /api/tenant/inventory/receipts/{id}`, Backend hiện trả `pickList: null`; các `items` đã lưu vẫn có `rackId`, `binId`, `stockBatchId` và `pickSequence`. Nếu màn hình cần dựng lại thứ tự đã lưu sau refresh, nhóm các item theo bin và sắp xếp theo `pickSequence`; không chạy lại FIFO ở FE.

### 4.2 INBOUND không đổi contract input

```json
{
  "warehouseId": "warehouse-uuid",
  "type": "INBOUND",
  "items": [
    {
      "skuId": "sku-uuid",
      "quantity": 100,
      "rackId": "rack-uuid",
      "binId": "bin-uuid",
      "note": "optional note"
    }
  ]
}
```

`rackId` và `binId` vẫn bắt buộc cho INBOUND. FIFO picking chỉ áp dụng cho OUTBOUND.

## 5. Replan pick list bị stale

Khi approval trả HTTP `409` với code `OUTBOUND_PICK_LIST_STALE`, không tự approve lại và không tự sửa batch ở FE.

### Request

```http
POST /api/tenant/inventory/receipts/{receiptId}/picking/replan
```

Không cần request body. Backend sẽ:

1. lock receipt;
2. kiểm tra receipt là `OUTBOUND` và `PENDING`;
3. group tổng quantity các item cũ theo SKU;
4. chạy lại FIFO và route;
5. nếu đủ hàng, thay toàn bộ allocation items trong một transaction;
6. trả receipt PENDING cùng pick list mới.

Nếu shortage hoặc lỗi xảy ra, Backend không xóa pick list cũ và trả conflict. FE cần thông báo cho người dùng, reload receipt và cho người dùng xác nhận lại pick list mới khi replan thành công.

Replan không reserve stock. Approval vẫn là bước lock/revalidate cuối cùng.

## 6. Approve và retry

```http
PATCH /api/tenant/inventory/receipts/{receiptId}/approve
```

Chỉ Tenant approve được receipt. Backend lock receipt và tất cả batch theo thứ tự ổn định, sau đó kiểm tra:

- batch còn active và chưa deleted;
- batch vẫn đúng SKU, warehouse, rack, bin;
- quantity mỗi batch còn đủ;
- Contract và subscription còn active.

Nếu hợp lệ, Backend trừ đúng các batch đã lưu trong receipt và ghi negative `InventoryTransaction`. FE không được tự trừ stock.

Nếu cùng receipt bị approve hai lần, lần sau trả `RECEIPT_ALREADY_PROCESSED`; chỉ lần đầu được trừ stock.

## 7. Các lỗi FE cần xử lý

| HTTP | Code/thông tin | Cách xử lý |
|---:|---|---|
| 400 | `STOCK_INSUFFICIENT_QUANTITY` hoặc validation message | Hiển thị thiếu hàng; không tạo/approve receipt |
| 400 | `RECEIPT_ALREADY_PROCESSED` | Reload receipt; không retry mutation |
| 409 | `OUTBOUND_PICK_LIST_STALE` | Reload receipt → gọi replan → hiển thị pick list mới → chờ user xác nhận |
| 403 | `FORBIDDEN` | Kiểm tra Contract, Staff assignment, role hoặc warehouse scope |
| 403 | `SUBSCRIPTION_REQUIRED` | Yêu cầu subscription active |
| 404 | `RECEIPT_NOT_FOUND`, `STOCK_BATCH_NOT_FOUND`, `SKU_NOT_FOUND` hoặc `LAYOUT_NOT_FOUND` | Reload dữ liệu và hiển thị resource không tồn tại |

Thông báo validation có thể không có `code`; FE không nên chỉ dựa vào code cho lỗi input.

## 8. Cache/query invalidation

Sau create, replan hoặc approve, FE cần invalidate/refetch:

- receipt list theo warehouse;
- receipt detail;
- stock overview của warehouse;
- stock detail theo SKU;
- capacity/layout stock summary nếu màn hình đang hiển thị.

Các endpoint tồn kho liên quan:

```http
GET /api/tenant/inventory/stock?warehouseId={warehouseId}
GET /api/tenant/inventory/stock/overview?warehouseId={warehouseId}
GET /api/tenant/inventory/stock/sku/{skuId}
GET /api/tenant/inventory/stock/{batchId}/transactions
```

Stock detail có thể trả nhiều row cho cùng SKU và cùng location vì mỗi row là một batch/lot lịch sử riêng. Màn hình tổng quan dùng `overview.totalQuantity`.

## 9. UI checklist

- [ ] Preview bằng warehouse + SKU quantities.
- [ ] Hiển thị mỗi `stop` thành một bước/card lấy hàng.
- [ ] Trong mỗi stop hiển thị tất cả lines và batch arrival date.
- [ ] Hiển thị shortage theo SKU và disable create khi `complete = false`.
- [ ] Create OUTBOUND chỉ gửi SKU + quantity + note.
- [ ] Render đúng `sequence`; không tự sort lại.
- [ ] Không tự tính FIFO, route hoặc trừ stock ở FE.
- [ ] Khi `OUTBOUND_PICK_LIST_STALE`, dùng replan và yêu cầu user xác nhận lại.
- [ ] Sau mutation invalidate các query tồn kho/receipt liên quan.
- [ ] Không gắn nhãn “shortest route”; dùng “Suggested picking order”.

## 10. Ngoài phạm vi hiện tại

- FEFO/expiry date.
- Stock reservation cho receipt PENDING.
- Wave/zone picking, multi-worker assignment.
- Barcode/QR scanning.
- Shortest path theo graph, aisle hoặc obstacle.
- Bắt buộc FIFO cho source allocation của stock transfer.
